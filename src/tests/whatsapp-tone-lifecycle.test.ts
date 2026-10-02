import { beforeEach, describe, expect, it, vi } from "vitest";

const SENDER = "+10000000001";

/**
 * Spec 0017 AC-6 + AC-7: the tone marker lifecycle on WhatsAppThread.
 *
 * openThread clears the marker exactly when a fresh window opens (no thread
 * yet, or the stored window had already expired at inbound time) and keeps it
 * when an inbound merely extends a live window. markThreadFullReply is the
 * only writer that sets the marker; short notes ride markThreadOutbound and
 * leave it untouched.
 *
 * The db below is an in memory stand in that honours the filters the design
 * leans on: findUnique returns the stored row, upsert creates or replaces the
 * window fields, and update merges. A fake that always succeeded would let a
 * clearing bug pass unnoticed.
 */

type ThreadRow = {
  threadKey: string;
  lastInboundAt: Date;
  windowExpiresAt: Date;
  lastOutboundAt: Date | null;
  capNoteSentAt: Date | null;
  windowFirstReplyAt: Date | null;
  lastVerdict: string | null;
  threadLanguage: string | null;
};

type EventRow = { id: string; createdAt: Date; inboundAt: Date | null; threadKey: string | null };

const threadRows = new Map<string, ThreadRow>();
const eventRows = new Map<string, EventRow>();

function makeTx() {
  return {
    whatsAppWebhookEvent: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const row = eventRows.get(where.id) ?? null;
        return row ? { createdAt: row.createdAt, inboundAt: row.inboundAt } : null;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<EventRow> }) => {
        const row = eventRows.get(where.id);
        if (!row) throw new Error("event missing");
        Object.assign(row, data);
        return row;
      }),
    },
    whatsAppThread: {
      findUnique: vi.fn(async ({ where }: { where: { threadKey: string } }) => {
        return threadRows.get(where.threadKey) ?? null;
      }),
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { threadKey: string };
          create: Partial<ThreadRow> & { threadKey: string };
          update: Partial<ThreadRow>;
        }) => {
          const existing = threadRows.get(where.threadKey);
          if (existing) {
            Object.assign(existing, update);
            return existing;
          }
          const row: ThreadRow = {
            lastOutboundAt: null,
            capNoteSentAt: null,
            windowFirstReplyAt: null,
            lastVerdict: null,
            threadLanguage: null,
            ...create,
          } as ThreadRow;
          threadRows.set(where.threadKey, row);
          return row;
        },
      ),
      update: vi.fn(
        async ({ where, data }: { where: { threadKey: string }; data: Partial<ThreadRow> }) => {
          const row = threadRows.get(where.threadKey);
          if (!row) throw new Error("thread missing");
          Object.assign(row, data);
          return row;
        },
      ),
    },
  };
}

vi.mock("../lib/db", () => ({
  db: {
    $transaction: async <T>(fn: (tx: ReturnType<typeof makeTx>) => Promise<T>) => fn(makeTx()),
    whatsAppThread: {
      update: vi.fn(
        async ({ where, data }: { where: { threadKey: string }; data: Partial<ThreadRow> }) => {
          const row = threadRows.get(where.threadKey);
          if (!row) throw new Error("thread missing");
          Object.assign(row, data);
          return row;
        },
      ),
    },
  },
}));

const { openThread, rehydrateWindow } = await import("../lib/whatsapp/thread");
const { markThreadFullReply, markThreadOutbound } = await import("../lib/whatsapp/event");

function seedEvent(id: string, at: Date) {
  eventRows.set(id, { id, createdAt: at, inboundAt: at, threadKey: null });
}

beforeEach(() => {
  threadRows.clear();
  eventRows.clear();
});

describe("spec 0017 AC-7: a fresh window clears the tone marker", () => {
  it("opens the first window with an empty marker", async () => {
    seedEvent("e1", new Date("2026-10-02T10:00:00.000Z"));

    const opened = await openThread({ eventId: "e1", fromNumber: SENDER });

    expect(opened.isFreshWindow).toBe(true);
    expect(opened.windowFirstReplyAt).toBeNull();
    expect(opened.lastVerdict).toBeNull();
    expect(opened.threadLanguage).toBeNull();
  });

  it("keeps the marker when an inbound extends a live window", async () => {
    seedEvent("e1", new Date("2026-10-02T10:00:00.000Z"));
    await openThread({ eventId: "e1", fromNumber: SENDER });
    await markThreadFullReply({ threadKey: SENDER, verdict: "HIGH_RISK", language: "fr" });
    seedEvent("e2", new Date("2026-10-02T12:00:00.000Z"));

    const opened = await openThread({ eventId: "e2", fromNumber: SENDER });

    expect(opened.isFreshWindow).toBe(false);
    expect(opened.windowFirstReplyAt).toBeInstanceOf(Date);
    expect(opened.lastVerdict).toBe("HIGH_RISK");
    expect(opened.threadLanguage).toBe("fr");
  });

  it("clears the marker when the stored window had already expired", async () => {
    seedEvent("e1", new Date("2026-10-02T10:00:00.000Z"));
    await openThread({ eventId: "e1", fromNumber: SENDER });
    await markThreadFullReply({ threadKey: SENDER, verdict: "CAUTION", language: "en" });
    seedEvent("e2", new Date("2026-10-04T10:00:01.000Z"));

    const opened = await openThread({ eventId: "e2", fromNumber: SENDER });

    expect(opened.isFreshWindow).toBe(true);
    expect(opened.windowFirstReplyAt).toBeNull();
    expect(opened.lastVerdict).toBeNull();
    expect(opened.threadLanguage).toBeNull();
  });
});

describe("spec 0017 AC-6: only a sent full sets the marker", () => {
  it("writes verdict, language and both timestamps on a full reply", async () => {
    seedEvent("e1", new Date("2026-10-02T10:00:00.000Z"));
    await openThread({ eventId: "e1", fromNumber: SENDER });

    await markThreadFullReply({ threadKey: SENDER, verdict: "VERIFIED_OFFICIAL", language: "en" });

    const row = threadRows.get(SENDER);
    expect(row?.lastVerdict).toBe("VERIFIED_OFFICIAL");
    expect(row?.threadLanguage).toBe("en");
    expect(row?.windowFirstReplyAt).toBeInstanceOf(Date);
    expect(row?.lastOutboundAt).toBeInstanceOf(Date);
  });

  it("leaves the marker untouched on a short note outbound stamp", async () => {
    seedEvent("e1", new Date("2026-10-02T10:00:00.000Z"));
    await openThread({ eventId: "e1", fromNumber: SENDER });
    await markThreadFullReply({ threadKey: SENDER, verdict: "HIGH_RISK", language: "fr" });
    const marker = threadRows.get(SENDER)?.windowFirstReplyAt;

    await markThreadOutbound(SENDER);

    const row = threadRows.get(SENDER);
    expect(row?.windowFirstReplyAt).toBe(marker);
    expect(row?.lastVerdict).toBe("HIGH_RISK");
    expect(row?.threadLanguage).toBe("fr");
  });
});

describe("spec 0017: marker survives the Inngest step boundary", () => {
  it("rehydrates a stored marker date from its JSON string form", async () => {
    seedEvent("e1", new Date("2026-10-02T10:00:00.000Z"));
    await openThread({ eventId: "e1", fromNumber: SENDER });
    await markThreadFullReply({ threadKey: SENDER, verdict: "CAUTION", language: "en" });
    seedEvent("e2", new Date("2026-10-02T11:00:00.000Z"));
    const opened = await openThread({ eventId: "e2", fromNumber: SENDER });

    const acrossStepBoundary = JSON.parse(JSON.stringify(opened));
    expect(typeof acrossStepBoundary.windowFirstReplyAt).toBe("string");

    const reopened = rehydrateWindow(acrossStepBoundary);

    expect(reopened.windowFirstReplyAt).toBeInstanceOf(Date);
    expect(reopened.lastVerdict).toBe("CAUTION");
    expect(reopened.threadLanguage).toBe("en");
  });
});
