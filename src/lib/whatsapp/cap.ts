import { db } from "@/lib/db";
import { appHost } from "../app-url";
import { capNoticeReserve, monthStartUtc, monthlyReplyCap } from "./config";

/**
 * The monthly reply cap (spec 0015, AC-4 to AC-7).
 *
 * Meta bills every service message past its free monthly allowance, per phone
 * number. We do not model money, because no Cameroon rate is published that we
 * could trust, so the cap is a count of replies and the stop happens here,
 * before the send.
 */

/**
 * What we send when the cap is reached and the window is still open. Brand
 * voice: calm, plain, no urgency, no emoji, no dashes. Both languages ship
 * together and one is picked per sender, never both in one message.
 *
 * A function rather than a constant so the host can come from configuration: a
 * preview or staging deploy must not tell a real person to visit production.
 * See `src/lib/app-url.ts`.
 */
export function capNotice(language: "fr" | "en"): string {
  const host = appHost();
  return language === "fr"
    ? `Nous avons atteint la limite de réponses gratuites de ce mois sur CheckAm. Votre message n'est pas en cause. Écrivez de nouveau le mois prochain, ou vérifiez sur ${host}.`
    : `We have reached this month's free reply limit on CheckAm. Your message is not the problem. Write again next month, or check on ${host}.`;
}

export interface CapStatus {
  month: string;
  cap: number;
  replyCeiling: number;
  noticeCeiling: number;
  countThisMonth: number;
}

export function capStatus(month: string, countThisMonth = 0): CapStatus {
  const cap = monthlyReplyCap();
  return {
    month,
    cap,
    // A slice of the cap is held back so a person who writes after the cap is
    // reached gets the notice below instead of silence. Both ceilings sit
    // inside the cap, so the total can never exceed it and the default
    // configuration stays free.
    replyCeiling: Math.max(0, cap - capNoticeReserve()),
    noticeCeiling: cap,
    countThisMonth,
  };
}

/**
 * Create the month row on first use. A create that skips duplicates, then a
 * read: upsert is find then write and would still collide when two senders are
 * the first of the month.
 */
export async function ensureMonth(phoneNumberId: string, month: string): Promise<void> {
  await db.whatsAppUsageMonth.createMany({
    data: [{ phoneNumberId, month, capAtMonthStart: monthlyReplyCap() }],
    skipDuplicates: true,
  });
}

export async function monthCount(phoneNumberId: string, month: string): Promise<number> {
  const row = await db.whatsAppUsageMonth.findUnique({
    where: { phoneNumberId_month: { phoneNumberId, month } },
    select: { repliesAttempted: true },
  });
  return row?.repliesAttempted ?? 0;
}

/**
 * The check and the increment are one conditional write, so two concurrent
 * replies cannot both pass a ceiling. Zero rows updated means the ceiling is
 * already reached, which is the refusal.
 *
 * This is our own ledger and it counts attempts, so a step retry whose write
 * committed before the process died can count one attempt twice. That drift is
 * deliberate and always in the safe direction: we stop slightly early.
 */
async function incrementUnderCeiling(
  phoneNumberId: string,
  month: string,
  ceiling: number,
): Promise<{ counted: boolean; countThisMonth: number }> {
  const result = await db.whatsAppUsageMonth.updateMany({
    where: { phoneNumberId, month, repliesAttempted: { lt: ceiling } },
    data: { repliesAttempted: { increment: 1 } },
  });
  return { counted: result.count > 0, countThisMonth: await monthCount(phoneNumberId, month) };
}

/** Count a normal reply against the cap, with the notice reserve held back. */
export function countReplyAttempt(
  phoneNumberId: string,
  month: string,
): Promise<{ counted: boolean; countThisMonth: number }> {
  return incrementUnderCeiling(phoneNumberId, month, capStatus(month).replyCeiling);
}

/** Count the cap notice itself, so a wave after the cap cannot send freely. */
export function countCapNoticeAttempt(
  phoneNumberId: string,
  month: string,
): Promise<{ counted: boolean; countThisMonth: number }> {
  return incrementUnderCeiling(phoneNumberId, month, capStatus(month).noticeCeiling);
}

/**
 * Claim the right to send this thread's one notice for the month. The claim is
 * the guard: it is a conditional write on the thread, so two messages from the
 * same sender in the same minute cannot both win it.
 */
export async function claimCapNotice(threadKey: string, month: string): Promise<boolean> {
  const boundary = monthStartUtc(month);
  const result = await db.whatsAppThread.updateMany({
    where: {
      threadKey,
      OR: [{ capNoteSentAt: null }, { capNoteSentAt: { lt: boundary } }],
    },
    data: { capNoteSentAt: new Date() },
  });
  return result.count > 0;
}
