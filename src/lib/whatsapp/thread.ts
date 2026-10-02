import { db } from "@/lib/db";
import { CUSTOMER_SERVICE_WINDOW_MS } from "./config";

/**
 * The 24 hour customer service window (spec 0015, AC-2, AC-3).
 *
 * Meta opens the window on any inbound message and refuses free form text
 * after it closes with error 131047, but exposes no endpoint that reports it.
 * So we keep it ourselves, and we open it in the webhook rather than the
 * worker: a backed up queue must never make us think a window is open when
 * Meta thinks it is closed.
 */

export interface OpenedWindow {
  threadKey: string;
  lastInboundAt: Date;
  windowExpiresAt: Date;
}

/**
 * The window starts at the earlier of Meta's message timestamp and our own
 * receive time. Taking the earlier of the two means our expiry is never later
 * than Meta's under either direction of clock skew, so we never attempt a send
 * Meta would reject.
 */
export function windowStart(metaTimestamp: Date | null, receivedAt: Date): Date {
  if (!metaTimestamp) return receivedAt;
  const ms = metaTimestamp.getTime();
  if (Number.isNaN(ms)) return receivedAt;
  return ms < receivedAt.getTime() ? metaTimestamp : receivedAt;
}

export function windowExpiry(start: Date): Date {
  return new Date(start.getTime() + CUSTOMER_SERVICE_WINDOW_MS);
}

/**
 * Open or extend the window for a sender and stamp the event, in one
 * transaction so an event can never exist without the window it belongs to.
 *
 * Both clocks are read from the stored event rather than passed in, which is
 * what makes this idempotent: the webhook calls it, and the worker calls it
 * again before deciding, and both compute the same window from the same row.
 */
export async function openThread(params: {
  eventId: string;
  fromNumber: string;
}): Promise<OpenedWindow> {
  const { eventId, fromNumber } = params;

  return db.$transaction(async (tx) => {
    const event = await tx.whatsAppWebhookEvent.findUnique({
      where: { id: eventId },
      select: { createdAt: true, inboundAt: true },
    });
    if (!event) throw new Error(`Webhook event ${eventId} not found`);

    const lastInboundAt = windowStart(event.inboundAt, event.createdAt);
    const expiresAt = windowExpiry(lastInboundAt);

    try {
      await tx.whatsAppThread.upsert({
        where: { threadKey: fromNumber },
        create: { threadKey: fromNumber, lastInboundAt, windowExpiresAt: expiresAt },
        update: { lastInboundAt, windowExpiresAt: expiresAt },
      });
    } catch (error) {
      // Two deliveries of the same sender can race here. Upsert is find then
      // write, so the loser of the race gets a unique violation; the update is
      // then unconditional and the window is still correct.
      if (!isUniqueViolation(error)) throw error;
      await tx.whatsAppThread.update({
        where: { threadKey: fromNumber },
        data: { lastInboundAt, windowExpiresAt: expiresAt },
      });
    }

    await tx.whatsAppWebhookEvent.update({
      where: { id: eventId },
      data: { threadKey: fromNumber },
    });

    return { threadKey: fromNumber, lastInboundAt, windowExpiresAt: expiresAt };
  });
}

/**
 * Rehydrate a window that has crossed an Inngest step boundary.
 *
 * Inngest serializes a step's return value as JSON, so the Dates in an
 * `OpenedWindow` arrive in the next step as ISO strings. Calling a Date method
 * on one of those strings throws, which killed every inbound message at the
 * decision. Every caller must run the result through here before treating it as
 * a date.
 */
export function rehydrateWindow(window: OpenedWindow): OpenedWindow {
  const windowExpiresAt = new Date(window.windowExpiresAt);
  const lastInboundAt = new Date(window.lastInboundAt);
  if (Number.isNaN(windowExpiresAt.getTime()) || Number.isNaN(lastInboundAt.getTime())) {
    throw new Error(`Thread ${window.threadKey} has an unreadable window`);
  }
  return { ...window, lastInboundAt, windowExpiresAt };
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    String((error as { code?: unknown }).code) === "P2002"
  );
}
