import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { db } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "USER",
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key-checkam-cameroon-2025-min-32-chars",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});

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
