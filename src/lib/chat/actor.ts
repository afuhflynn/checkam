import { createHmac, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { auth } from "../auth";

// Actor resolution for chat routes (spec 0004): signed in owner, or guest
// by signed browser id cookie. Password writes need emailVerified.
export type ChatActor =
  | { kind: "user"; userId: string; verified: boolean }
  | { kind: "guest"; guestKey: string };

const GUEST_COOKIE = "checkam_guest";

function secret(): string {
  return process.env.BETTER_AUTH_SECRET || "dev-secret-key-checkam-cameroon-2025-min-32-chars";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex").slice(0, 32);
}

export function hashIp(ip: string): string {
  return createHmac("sha256", secret()).update(`ip:${ip}`).digest("hex");
}

export function clientIp(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return headerList.get("x-real-ip")?.trim() ?? "unknown";
}

export async function resolveActor(): Promise<ChatActor> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    const user = session.user as { id: string; emailVerified: boolean };
    return { kind: "user", userId: user.id, verified: user.emailVerified };
  }
  const store = await cookies();
  const raw = store.get(GUEST_COOKIE)?.value ?? null;
  if (raw) {
    const [id, sig] = raw.split(".");
    if (id && sig && sign(id) === sig) return { kind: "guest", guestKey: id };
  }
  return { kind: "guest", guestKey: randomUUID() };
}

// Value to set when the actor has no valid cookie yet. Callers attach it
// with response.cookies.set using these attributes.
export function guestCookieValue(guestKey: string): string {
  return `${guestKey}.${sign(guestKey)}`;
}

export function guestCookieAttrs(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  maxAge: number;
  path: string;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
  };
}
