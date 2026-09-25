import { createHmac } from "node:crypto";

// Undo tokens (spec 0004): HMAC signed, 30 day expiry, single use enforced
// with a Verification marker row, no new table.
export type UndoTarget = "session" | "folder";

export interface UndoPayload {
  type: UndoTarget;
  id: string;
  ts: number;
  exp: number;
}

function secret(): string {
  const value = process.env.BETTER_AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }
  return value || "dev-secret-key-checkam-cameroon-2025-min-32-chars";
}

export function issueUndoToken(type: UndoTarget, id: string, ts: number = Date.now()): string {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const body = `${type}.${id}.${ts}.${exp}`;
  const sig = createHmac("sha256", secret()).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function readUndoToken(token: string): UndoPayload | null {
  const parts = token.split(".");
  if (parts.length !== 5) return null;
  const [type, id, tsRaw, expRaw, sig] = parts as [string, string, string, string, string];
  if (type !== "session" && type !== "folder") return null;
  const body = `${type}.${id}.${tsRaw}.${expRaw}`;
  const expected = createHmac("sha256", secret()).update(body).digest("hex");
  if (sig.length !== expected.length) return null;
  let match = true;
  for (let i = 0; i < sig.length; i += 1) {
    if (sig[i] !== expected[i]) match = false;
  }
  if (!match) return null;
  const ts = Number(tsRaw);
  const exp = Number(expRaw);
  if (!Number.isFinite(ts) || !Number.isFinite(exp) || Date.now() > exp) return null;
  return { type, id, ts, exp };
}

export function encodeCursor(cursor: { pinned: boolean; updatedAt: string; id: string }): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeCursor(raw: string | null): {
  pinned: boolean;
  updatedAt: string;
  id: string;
} | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString()) as {
      pinned?: boolean;
      updatedAt?: string;
      id?: string;
    };
    if (typeof parsed.updatedAt !== "string" || typeof parsed.id !== "string") return null;
    return { pinned: parsed.pinned === true, updatedAt: parsed.updatedAt, id: parsed.id };
  } catch {
    return null;
  }
}
