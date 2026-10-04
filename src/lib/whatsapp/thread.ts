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
  // Warm chat tone (spec 0017): the marker of a full reply already sent in
  // the current window. Null when no full went out yet or a fresh window just
  // opened. Old rows predate these columns, so they read as first check.
  windowFirstReplyAt: Date | null;
  lastVerdict: string | null;
  threadLanguage: string | null;
  isFreshWindow: boolean;
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

    // Warm chat tone (spec 0017) plus language respect (spec 0018): a fresh
    // window clears the tone marker, so the next reply is full again. The
    // heuristic thread language is window scoped and clears with it. The
    // fixed preferred triple plus the ask stamp survive, so your saved pick
    // and your answered ask carry across windows. Fresh means no thread yet,
    // or the stored window had already expired when this message arrived. An
    // inbound that merely extends a live window keeps the marker.
    const existing = await tx.whatsAppThread.findUnique({
      where: { threadKey: fromNumber },
      select: {
        windowExpiresAt: true,
        windowFirstReplyAt: true,
        lastVerdict: true,
        threadLanguage: true,
      },
    });
    const isFreshWindow =
      !existing || existing.windowExpiresAt.getTime() <= lastInboundAt.getTime();
    const clearedTone = isFreshWindow
      ? { windowFirstReplyAt: null, lastVerdict: null, threadLanguage: null }
      : {};

    try {
      await tx.whatsAppThread.upsert({
        where: { threadKey: fromNumber },
        create: { threadKey: fromNumber, lastInboundAt, windowExpiresAt: expiresAt },
        update: { lastInboundAt, windowExpiresAt: expiresAt, ...clearedTone },
      });
    } catch (error) {
      // Two deliveries of the same sender can race here. Upsert is find then
      // write, so the loser of the race gets a unique violation; the update is
      // then unconditional and the window is still correct.
      if (!isUniqueViolation(error)) throw error;
      await tx.whatsAppThread.update({
        where: { threadKey: fromNumber },
        data: { lastInboundAt, windowExpiresAt: expiresAt, ...clearedTone },
      });
    }

    await tx.whatsAppWebhookEvent.update({
      where: { id: eventId },
      data: { threadKey: fromNumber },
    });

    return {
      threadKey: fromNumber,
      lastInboundAt,
      windowExpiresAt: expiresAt,
      windowFirstReplyAt: isFreshWindow ? null : (existing?.windowFirstReplyAt ?? null),
      lastVerdict: isFreshWindow ? null : (existing?.lastVerdict ?? null),
      threadLanguage: isFreshWindow ? null : (existing?.threadLanguage ?? null),
      isFreshWindow,
    };
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
  // Inngest serializes Dates as ISO strings, so a stored marker date arrives
  // as a string too. Null stays null for threads with no full reply yet.
  const rawMarker: unknown = window.windowFirstReplyAt;
  const windowFirstReplyAt =
    typeof rawMarker === "string" ? new Date(rawMarker) : ((rawMarker as Date | null) ?? null);
  return { ...window, lastInboundAt, windowExpiresAt, windowFirstReplyAt };
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    String((error as { code?: unknown }).code) === "P2002"
  );
}
