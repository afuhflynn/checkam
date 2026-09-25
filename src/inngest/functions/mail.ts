import { translations, type Language } from "../../lib/i18n/dictionary";
import { inngest } from "../client";
import { db } from "../../lib/db";
import { sendMail } from "../../lib/mail/transport";
import { renderResetMail, renderVerifyMail, renderWelcomeMail } from "../../lib/mail/templates/mails";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

async function latestVerification(email: string, prefix: string) {
  return db.verification.findFirst({
    where: {
      identifier: { contains: email, startsWith: prefix },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function alertFailure(job: string, detail: string) {
  const target = process.env.ALERT_WEBHOOK_URL;
  const body = `[mail] ${job} failed past retries: ${detail}`;
  if (!target) {
    console.error(body);
    return;
  }
  try {
    await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: body }),
    });
  } catch (err) {
    console.error(body, err);
  }
}

// Bounded retries live inside the run (spec 0003 AC-5: 3 tries at 1, 5,
// 15 min) so the final failure and the ops alert share one code path.
async function sendWithRetries(
  step: { run: <T>(name: string, fn: () => Promise<T>) => Promise<T>; sleep: (name: string, duration: string) => Promise<void> },
  job: string,
  email: string,
  send: () => Promise<void>,
): Promise<void> {
  const waits = ["1m", "5m", "15m"];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await step.run(`send-attempt-${attempt + 1}`, send);
      return;
    } catch (err) {
      if (attempt === 2) {
        await step.run("alert", () => alertFailure(job, email));
        throw err;
      }
      await step.sleep(`wait-before-retry-${attempt + 1}`, waits[attempt] ?? "15m");
    }
  }
}

type MailStep = {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  sleep: (name: string, duration: string) => Promise<void>;
};

type MailEventData = {
  userId: string;
  email: string;
  locale: Language;
  verificationId?: string;
};

type MailHandler = {
  event: { data: MailEventData };
  step: MailStep;
};

export const sendVerifyMail = inngest.createFunction(
  {
    id: "send-verify-mail",
    name: "Send verify mail",
    retries: 0,
    triggers: [{ event: "mail/verify.requested" }],
  },
  async ({ event, step }: MailHandler) => {
    const { userId, email, locale, secret } = event.data as {
      userId: string;
      email: string;
      locale: Language;
      secret?: string;
    };
    const t = translations[locale] ?? translations.fr;
    const user = await step.run("load-user", () => db.user.findUnique({ where: { id: userId } }));
    if (!user) return { skipped: "no-user" };
    if (user.emailVerified) return { skipped: "already-verified" };
    // Single-mail secret rides the event; a purpose-filtered fresh row is
    // the only fallback, markers never qualify.
    const link =
      secret ??
      (await step.run("load-token", async () => {
        const row = await latestVerification(email, "email-verification:");
        if (!row || row.identifier.includes("-otp-") || row.identifier.startsWith("resend:")) {
          return null;
        }
        return `${appUrl()}/verify?token=${encodeURIComponent(row.value)}`;
      }));
    if (!link) return { skipped: "no-token" };
    const { html, text } = await step.run("render", () =>
      renderVerifyMail(
        {
          subject: t.mailVerifySubject,
          headline: t.mailVerifyHeadline,
          body: t.mailVerifyBody,
          cta: t.mailVerifyCta,
          closing: t.mailClosing,
          codeLabel: t.mailCodeLabel,
        },
        link,
      ),
    );
    await sendWithRetries(step, "send-verify-mail", email, () =>
      sendMail({ to: email, subject: t.mailVerifySubject, html, text }),
    );
    return { sent: true };
  },
);

export const sendResetMail = inngest.createFunction(
  {
    id: "send-reset-mail",
    name: "Send reset mail",
    retries: 0,
    triggers: [{ event: "mail/password-reset.requested" }],
  },
  async ({ event, step }: MailHandler) => {
    const { userId, email, locale, secret } = event.data as {
      userId: string;
      email: string;
      locale: Language;
      secret?: string;
    };
    const t = translations[locale] ?? translations.fr;
    const user = await step.run("load-user", () => db.user.findUnique({ where: { id: userId } }));
    if (!user) return { skipped: "no-user" };
    // The secret decides the mail shape: an http link, a digit code, or
    // nothing when the sender only queued intent. Link and code flows are
    // separate triggers, each mail carries what its flow provided.
    if (!secret) return { skipped: "no-secret" };
    const link = secret.startsWith("http") ? secret : `${appUrl()}/signin`;
    const code = /^\d{4,8}$/.test(secret) ? secret : null;
    const { html, text } = await step.run("render", () =>
      renderResetMail(
        {
          subject: t.mailResetSubject,
          headline: t.mailResetHeadline,
          body: t.mailResetBody,
          cta: t.mailResetCta,
          closing: t.mailClosing,
          codeLabel: t.mailCodeLabel,
        },
        link,
        code,
      ),
    );
    await sendWithRetries(step, "send-reset-mail", email, () =>
      sendMail({ to: email, subject: t.mailResetSubject, html, text }),
    );
    return { sent: true, withCode: code !== null };
  },
);

export const sendWelcomeMail = inngest.createFunction(
  {
    id: "send-welcome-mail",
    name: "Send welcome mail",
    retries: 0,
    triggers: [{ event: "mail/welcome.requested" }],
  },
  async ({ event, step }: MailHandler) => {
    const { userId, email, locale } = event.data as {
      userId: string;
      email: string;
      locale: Language;
    };
    const t = translations[locale] ?? translations.fr;
    const qualifies = await step.run("check-once", async () => {
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user?.emailVerified) return false;
      const google = await db.account.findFirst({ where: { userId, providerId: "google" } });
      if (google) return false;
      try {
        await db.verification.create({
          data: { identifier: `welcome:${userId}`, value: "sent", expiresAt: new Date("2100-01-01") },
        });
      } catch (err: unknown) {
        // Pair unique: a concurrent run already marked it.
        if ((err as { code?: string })?.code === "P2002") return false;
        throw err;
      }
      return true;
    });
    if (!qualifies) return { skipped: "not-qualified" };
    const link = `${appUrl()}/`;
    const { html, text } = await step.run("render", () =>
      renderWelcomeMail(
        {
          subject: t.mailWelcomeSubject,
          headline: t.mailWelcomeHeadline,
          body: t.mailWelcomeBody,
          cta: t.mailWelcomeCta,
          closing: t.mailClosing,
          codeLabel: t.mailCodeLabel,
        },
        link,
      ),
    );
    await sendWithRetries(step, "send-welcome-mail", email, () =>
      sendMail({ to: email, subject: t.mailWelcomeSubject, html, text }),
    );
    return { sent: true };
  },
);
