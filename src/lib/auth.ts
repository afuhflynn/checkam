import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { headers } from "next/headers";
import { db } from "./db";
import { type MailPayload, queueMail } from "./mail/queue";

function requestLocale(): Promise<"en" | "fr"> {
  return readLangCookie().then((lang) => (lang === "en" ? "en" : "fr"));
}

async function readLangCookie(): Promise<string | null> {
  try {
    const h = await headers();
    const cookie = h.get("cookie") ?? "";
    const match = cookie.match(/(?:^|;\s*)checkam_lang=(en|fr)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function enqueue(
  purpose: MailPayload["purpose"],
  userId: string,
  email: string,
  secret?: string,
) {
  await queueMail(
    purpose === "verify"
      ? "mail/verify.requested"
      : purpose === "reset"
        ? "mail/password-reset.requested"
        : "mail/welcome.requested",
    { userId, email, locale: await requestLocale(), purpose, secret },
  );
}

const googleKeys =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {};

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await enqueue("reset", user.id, user.email, url);
    },
    resetPasswordTokenExpiresIn: 3600,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 86400,
    sendVerificationEmail: async ({ user, url }) => {
      await enqueue("verify", user.id, user.email, url);
    },
  },
  socialProviders: {
    ...googleKeys,
  },
  plugins: [
    emailOTP({
      expiresIn: 600,
      allowedAttempts: 5,
      sendVerificationOTP: async ({ email, otp, type }) => {
        const user = await db.user.findUnique({ where: { email } });
        if (!user) return;
        await queueMail("mail/password-reset.requested", {
          userId: user.id,
          email,
          locale: await requestLocale(),
          purpose: type === "email-verification" ? "verify" : "reset",
          secret: otp,
        });
      },
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "USER",
      },
    },
  },
  databaseHooks: {
    user: {
      update: {
        // Welcome trigger (spec 0003 AC-3): when a password user completes
        // verify, queue the one time welcome. The job re-checks and marks,
        // so repeated updates stay no ops.
        after: async (user) => {
          if (!user.emailVerified) return;
          const google = await db.account.findFirst({
            where: { userId: user.id, providerId: "google" },
          });
          if (google) return;
          const marker = await db.verification.findFirst({
            where: { identifier: `welcome:${user.id}` },
          });
          if (marker) return;
          await enqueue("welcome", user.id, user.email);
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  secret:
    process.env.BETTER_AUTH_SECRET ||
    (process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error("BETTER_AUTH_SECRET is required in production");
        })()
      : "dev-secret-key-checkam-cameroon-2025-min-32-chars"),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});

// Revoke every session for a user (password change, per spec 0002 AC-6).
export async function revokeAllSessions(userId: string): Promise<number> {
  const result = await db.session.deleteMany({ where: { userId } });
  return result.count;
}

// Prisma-backed equivalent of Supabase has_role(): moderation restricted to admins.
// Public read stays limited to APPROVED registry rows (enforced in queries).
export async function requireModerator(): Promise<{ userId: string; role: string }> {
  // Open dev bypass only when explicitly enabled — never in production.
  if (process.env.NODE_ENV !== "production" && process.env.CHECKAM_ADMIN_BYPASS === "true") {
    return { userId: "dev-bypass", role: "ADMIN" };
  }
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role ?? "USER";
  if (!session?.user || (role !== "ADMIN" && role !== "MODERATOR")) {
    throw new Error("FORBIDDEN_NOT_MODERATOR");
  }
  return { userId: session.user.id, role };
}
