import { inngest } from "../../inngest/client";

// Mail event contracts owned by spec 0003-mail. Auth (spec 0002) only
// enqueues; the 0003 handlers send. Single-mail secrets (a verify link, a
// reset link, an OTP code) ride the event because the job cannot mint them;
// they are transient, never passwords, and never printed in logs. Unhandled
// events are tolerated by Inngest, and a queue failure must never break
// signup or signin.
export const MAIL_EVENTS = {
  verify: "mail/verify.requested",
  passwordReset: "mail/password-reset.requested",
  welcome: "mail/welcome.requested",
} as const;

export type MailEventName = (typeof MAIL_EVENTS)[keyof typeof MAIL_EVENTS];

export interface MailPayload {
  userId: string;
  email: string;
  locale: "en" | "fr";
  // Single-mail secret for this send only: a full link or an OTP code.
  secret?: string;
  purpose: "verify" | "reset" | "welcome";
}

export async function queueMail(name: MailEventName, payload: MailPayload): Promise<string> {
  const kind = name === MAIL_EVENTS.verify ? "verify" : name === MAIL_EVENTS.passwordReset ? "password-reset" : "welcome";
  const stamp = Date.now().toString(36);
  const fallbackId = `mail:${kind}:${payload.userId}:${stamp}`;
  try {
    const res = await inngest.send({ name, data: { ...payload }, id: fallbackId });
    return res.ids?.[0] ?? fallbackId;
  } catch (err) {
    console.warn(`[mail] queue failed for ${name}:`, err);
    return fallbackId;
  }
}
