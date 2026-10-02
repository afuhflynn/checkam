import { db } from "@/lib/db";
import type { WhatsAppReplyDecision } from "@prisma/client";

/**
 * Writing the outcome of our own decision (spec 0015, AC-3, AC-6, AC-10).
 *
 * `replyDecision` says what we decided. `processedStatus` belongs to row 27,
 * so this module never invents a failure state and never marks a refusal or a
 * refused send as complete.
 */

export const REPLY_REASON = {
  windowExpired: "WINDOW_EXPIRED",
  capReached: "MONTHLY_CAP_REACHED",
  missingCredentials: "MISSING_CREDENTIALS",
} as const;

/** Meta 131047: sent outside the customer service window. */
export const META_WINDOW_REFUSED = 131047;

export async function recordDecision(params: {
  eventId: string;
  decision: WhatsAppReplyDecision;
  reason?: string | null;
  windowExpiresAt?: Date | null;
}): Promise<void> {
  await db.whatsAppWebhookEvent.update({
    where: { id: params.eventId },
    data: {
      replyDecision: params.decision,
      replyDecisionReason: params.reason ?? null,
      windowExpiresAtAtDecision: params.windowExpiresAt ?? null,
    },
  });
}

export async function markThreadOutbound(threadKey: string): Promise<void> {
  await db.whatsAppThread.update({
    where: { threadKey },
    data: { lastOutboundAt: new Date() },
  });
}

/**
 * Only a send Meta accepted counts as done. A refusal, a missing credential or
 * a failed call leaves the event unfinished, which is what row 27 turns into a
 * visible failure.
 */
export async function markEventCompleted(params: {
  eventId: string;
  replyText: string | null;
}): Promise<void> {
  await db.whatsAppWebhookEvent.update({
    where: { id: params.eventId },
    data: { processedStatus: "COMPLETED", replyText: params.replyText },
  });
}
