import { translations, type Language } from "../../lib/i18n/dictionary";
import { inngest } from "../client";
import { db } from "../../lib/db";
import { sendMail } from "../../lib/mail/transport";
import { renderResetMail, renderVerifyMail, renderWelcomeMail } from "../../lib/mail/templates/mails";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

async function latestVerification(email: string) {
  return db.verification.findFirst({
    where: { identifier: { contains: email } },
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
    const { userId, email, locale } = event.data as {
      userId: string;
      email: string;
      locale: Language;
    };
    const t = translations[locale] ?? translations.fr;
    const user = await step.run("load-user", () => db.user.findUnique({ where: { id: userId } }));
    if (!user) return { skipped: "no-user" };
    if (user.emailVerified) return { skipped: "already-verified" };
    const row = await step.run("load-token", () => latestVerification(email));
    if (!row) return { skipped: "no-token" };
    const link = `${appUrl()}/verify?token=${encodeURIComponent(row.value)}`;
    const { html, text } = await step.run("render", () =>
      renderVerifyMail(
        {
          subject: t.mailVerifySubject,
          headline: t.mailVerifyHeadline,
          body: t.mailVerifyBody,
          cta: t.mailVerifyCta,
          closing: t.mailClosing,
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
    const { userId, email, locale, verificationId } = event.data as {
      userId: string;
      email: string;
      locale: Language;
      verificationId?: string;
    };
    const t = translations[locale] ?? translations.fr;
    const user = await step.run("load-user", () => db.user.findUnique({ where: { id: userId } }));
    if (!user) return { skipped: "no-user" };
    const row = await step.run("load-token", () => latestVerification(email));
    if (!row) return { skipped: "no-token" };
    const link = `${appUrl()}/reset?token=${encodeURIComponent(row.value)}`;
    const code = verificationId && /^\d{4,8}$/.test(verificationId) ? verificationId : null;
    const { html, text } = await step.run("render", () =>
      renderResetMail(
        {
          subject: t.mailResetSubject,
          headline: t.mailResetHeadline,
          body: t.mailResetBody,
          cta: t.mailResetCta,
          closing: t.mailClosing,
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
      const marker = await db.verification.findFirst({ where: { identifier: `welcome:${userId}` } });
      if (marker) return false;
      await db.verification.create({
        data: { identifier: `welcome:${userId}`, value: "sent", expiresAt: new Date("2100-01-01") },
      });
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
