import { beforeEach, describe, expect, it, vi } from "vitest";

const TEST_PHONE = "237XXXXXXXXX";

/**
 * Spec 0015 AC-3 to AC-6: the database backed writes.
 *
 * These are the parts whose correctness is a property of the SQL rather than of
 * the TypeScript, so the fake below is not a stub that records calls. It is a
 * small in memory table that implements the two behaviours the design leans on:
 *
 * 1. `updateMany` only touches rows matching the filter, so a conditional write
 *    with `repliesAttempted: { lt: ceiling }` increments nothing once the row is
 *    at the ceiling. That is what makes the check and the increment one
 *    statement, and what stops two concurrent replies both passing.
 * 2. `create` with `skipDuplicates` is idempotent, and a plain `create` throws a
 *    P2002 on a duplicate, which is how a webhook redelivery is detected.
 *
 * A mock that always succeeded would let every one of these tests pass while the
 * real database did the opposite.
 */

type Row = {
  phoneNumberId: string;
  month: string;
  repliesAttempted: number;
  capAtMonthStart: number;
};

const usageRows: Row[] = [];
const threadRows = new Map<string, Record<string, unknown>>();
const eventUpdates: Record<string, unknown>[] = [];
const eventRows = new Map<string, { processedStatus: string; replyText: string | null }>();

function matches(row: Row, where: Partial<Row> & { repliesAttempted?: { lt: number } }): boolean {
  if (where.phoneNumberId !== undefined && row.phoneNumberId !== where.phoneNumberId) return false;
  if (where.month !== undefined && row.month !== where.month) return false;
  if (
    where.repliesAttempted?.lt !== undefined &&
    !(row.repliesAttempted < where.repliesAttempted.lt)
  ) {
    return false;
  }
  return true;
}

vi.mock("../lib/db", () => ({
  db: {
    whatsAppUsageMonth: {
      createMany: vi.fn(
        async ({ data }: { data: (Partial<Row> & { phoneNumberId: string; month: string })[] }) => {
          // skipDuplicates: a concurrent first send of the month is not an error.
          for (const row of data) {
            const exists = usageRows.some(
              (r) => r.phoneNumberId === row.phoneNumberId && r.month === row.month,
            );
            if (exists) continue;
            // repliesAttempted is never passed in, it relies on the column default
            // of 0 in the schema. The fake has to apply that default too, or every
            // conditional write reads undefined and matches nothing.
            usageRows.push({ repliesAttempted: 0, ...row } as Row);
          }
          return { count: data.length };
        },
      ),
      findUnique: vi.fn(
        async ({
          where,
        }: { where: { phoneNumberId_month: { phoneNumberId: string; month: string } } }) => {
          const { phoneNumberId, month } = where.phoneNumberId_month;
          return (
            usageRows.find((r) => r.phoneNumberId === phoneNumberId && r.month === month) ?? null
          );
        },
      ),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: Partial<Row> & { repliesAttempted?: { lt: number } };
          data: { repliesAttempted?: { increment: number } };
        }) => {
          // The conditional write. Only rows under the ceiling change, so the
          // returned count is the whole answer to "did this reply fit".
          const hits = usageRows.filter((row) => matches(row, where));
          for (const row of hits) row.repliesAttempted += data.repliesAttempted?.increment ?? 0;
          return { count: hits.length };
        },
      ),
    },
    whatsAppThread: {
      // Mirrors claimCapNotice's real filter: a thread may claim when it has no
      // notice this month, that is capNoteSentAt is null or older than the month
      // boundary. Honouring that filter is what makes the conditional write a
      // guard rather than a formality.
      updateMany: vi.fn(
        async ({
          where,
        }: {
          where: {
            threadKey: string;
            OR: { capNoteSentAt: null }[] | { capNoteSentAt: { lt: Date } }[];
          };
        }) => {
          const row = threadRows.get(where.threadKey) as { capNoteSentAt: Date | null } | undefined;
          if (!row) return { count: 0 };
          const allowed =
            row.capNoteSentAt === null ||
            where.OR.some(
              (clause) =>
                clause.capNoteSentAt !== null &&
                "lt" in clause.capNoteSentAt &&
                row.capNoteSentAt !== null &&
                row.capNoteSentAt < clause.capNoteSentAt.lt,
            );
          if (!allowed) return { count: 0 };
          row.capNoteSentAt = new Date();
          return { count: 1 };
        },
      ),
      update: vi.fn(
        async ({
          where,
          data,
        }: { where: { threadKey: string }; data: Record<string, unknown> }) => {
          const row = threadRows.get(where.threadKey);
          if (!row) throw new Error("thread missing");
          Object.assign(row, data);
          return data;
        },
      ),
    },
    whatsAppWebhookEvent: {
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          eventUpdates.push({ id: where.id, ...data });
          const existing = eventRows.get(where.id);
          if (existing) Object.assign(existing, data);
          return data;
        },
      ),
    },
  },
}));

const {
  capStatus,
  claimCapNotice,
  countCapNoticeAttempt,
  countReplyAttempt,
  ensureMonth,
  monthCount,
} = await import("../lib/whatsapp/cap");
const { isAlreadySent, markEventCompleted, markThreadOutbound, recordDecision } = await import(
  "../lib/whatsapp/event"
);const { isUniqueViolation } = await import("../lib/whatsapp/thread");

const PID = "phone-1";
const MONTH = "2026-10";

beforeEach(() => {
  usageRows.length = 0;
  threadRows.clear();
  eventUpdates.length = 0;
  eventRows.clear();
  vi.stubEnv("WHATSAPP_MONTHLY_REPLY_CAP", "1000");
  vi.stubEnv("WHATSAPP_ACCOUNT_TIMEZONE", "Africa/Douala");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", PID);
});

describe("spec 0015 AC-5: the count and the ceiling are one statement", () => {
  it("counts a reply while the month is under the ceiling", async () => {
    await ensureMonth(PID, MONTH);

    const result = await countReplyAttempt(PID, MONTH);

    expect(result.counted).toBe(true);
    expect(result.countThisMonth).toBe(1);
  });

  it("refuses once the month reaches the ceiling and moves nothing", async () => {
    vi.stubEnv("WHATSAPP_MONTHLY_REPLY_CAP", "2");
    await ensureMonth(PID, MONTH);

    await countReplyAttempt(PID, MONTH);
    await countReplyAttempt(PID, MONTH);
    const refused = await countReplyAttempt(PID, MONTH);

    expect(refused.counted).toBe(false);
    // The refusal must not have incremented, or the count would drift upward
    // every time somebody is silenced.
    expect(await monthCount(PID, MONTH)).toBe(2);
  });

  it("lets exactly the ceiling number of concurrent replies through", async () => {
    vi.stubEnv("WHATSAPP_MONTHLY_REPLY_CAP", "2");
    await ensureMonth(PID, MONTH);

    // Twenty at once. Two updates may touch the row; eighteen must not.
    const results = await Promise.all(
      Array.from({ length: 20 }, () => countReplyAttempt(PID, MONTH)),
    );

    expect(results.filter((r) => r.counted)).toHaveLength(2);
    expect(await monthCount(PID, MONTH)).toBe(2);
  });

  it("counts each sender separately against the same ceiling", async () => {
    // The allowance is per phone number, not per person, so two threads on the
    // same number share one budget rather than each getting a full one.
    vi.stubEnv("WHATSAPP_MONTHLY_REPLY_CAP", "2");
    await ensureMonth(PID, MONTH);
    await ensureMonth("phone-2", MONTH);

    await countReplyAttempt(PID, MONTH);
    await countReplyAttempt(PID, MONTH);

    expect(await monthCount(PID, MONTH)).toBe(2);
    expect(await monthCount("phone-2", MONTH)).toBe(0);
    expect((await countReplyAttempt("phone-2", MONTH)).counted).toBe(true);
  });

  it("creates the month row once and treats a repeat as success", async () => {
    // The first sender of the month and a racing second sender must both end up
    // with the same row rather than one of them losing the month.
    await ensureMonth(PID, MONTH);
    await ensureMonth(PID, MONTH);

    expect(usageRows).toHaveLength(1);
    expect((await countReplyAttempt(PID, MONTH)).counted).toBe(true);
  });

  it("holds the notice allowance inside the cap", async () => {
    vi.stubEnv("WHATSAPP_MONTHLY_REPLY_CAP", "10");
    await ensureMonth(PID, MONTH);

    const status = capStatus(MONTH);
    expect(status.replyCeiling).toBe(8);
    expect(status.noticeCeiling).toBe(10);

    // Fill the reply allowance, then spend the reserve on notices.
    for (let i = 0; i < 8; i++) await countReplyAttempt(PID, MONTH);
    const notices = await Promise.all(
      Array.from({ length: 10 }, () => countCapNoticeAttempt(PID, MONTH)),
    );

    expect(notices.filter((n) => n.counted)).toHaveLength(2);
    // The total never passes the configured cap, which is what keeps the default
    // configuration free.
    expect(await monthCount(PID, MONTH)).toBe(10);
  });

  it("sends nothing at all when the cap is zero", async () => {
    vi.stubEnv("WHATSAPP_MONTHLY_REPLY_CAP", "0");
    await ensureMonth(PID, MONTH);

    expect((await countReplyAttempt(PID, MONTH)).counted).toBe(false);
    expect((await countCapNoticeAttempt(PID, MONTH)).counted).toBe(false);
    expect(await monthCount(PID, MONTH)).toBe(0);
  });
});

describe("spec 0015 AC-4: one cap notice per thread per month", () => {
  beforeEach(() => {
    threadRows.set(TEST_PHONE, {
      threadKey: TEST_PHONE,
      capNoteSentAt: null,
    });
  });

  it("lets exactly one of several concurrent claims win", async () => {
    // The claim is the guard. Without it a wave of messages from one thread
    // would each believe they were first.
    const claims = await Promise.all([
      claimCapNotice(TEST_PHONE, MONTH),
      claimCapNotice(TEST_PHONE, MONTH),
      claimCapNotice(TEST_PHONE, MONTH),
    ]);

    expect(claims.filter(Boolean)).toHaveLength(1);
  });

  it("refuses a second claim once the thread has one this month", async () => {
    expect(await claimCapNotice(TEST_PHONE, MONTH)).toBe(true);
    expect(await claimCapNotice(TEST_PHONE, MONTH)).toBe(false);
  });

  it("allows the notice again in the following month", async () => {
    await claimCapNotice(TEST_PHONE, MONTH);

    // A new month clears the condition without clearing the column, so a thread
    // that already had a notice is not silenced forever.
    expect(await claimCapNotice(TEST_PHONE, "2026-11")).toBe(true);
  });
});

describe("spec 0015 AC-3 and AC-10: the decision is written down", () => {
  it("records a window refusal with its reason and the expiry it judged against", async () => {
    const expiry = new Date("2026-10-02T20:17:04.000Z");

    await recordDecision({
      eventId: "e1",
      decision: "REFUSED_WINDOW",
      reason: "WINDOW_EXPIRED",
      windowExpiresAt: expiry,
    });

    expect(eventUpdates[0]).toMatchObject({
      id: "e1",
      replyDecision: "REFUSED_WINDOW",
      replyDecisionReason: "WINDOW_EXPIRED",
      windowExpiresAtAtDecision: expiry,
    });
  });

  it("records a cap refusal under its own decision, not the window's", async () => {
    // Keeping the two apart is what lets an operator tell a window silence from
    // a budget silence.
    await recordDecision({
      eventId: "e2",
      decision: "REFUSED_CAP",
      reason: "MONTHLY_CAP_REACHED",
      windowExpiresAt: null,
    });

    expect(eventUpdates[0]).toMatchObject({
      replyDecision: "REFUSED_CAP",
      replyDecisionReason: "MONTHLY_CAP_REACHED",
      windowExpiresAtAtDecision: null,
    });
  });

  it("writes a null reason rather than leaving a stale one when a send succeeds", async () => {
    await recordDecision({ eventId: "e3", decision: "SENT", reason: null, windowExpiresAt: null });

    expect(eventUpdates[0]).toMatchObject({
      replyDecision: "SENT",
      replyDecisionReason: null,
    });
  });

  it("leaves the event unfinished on a refusal, so row 27 can make it loud", async () => {
    // processedStatus is deliberately untouched here: an unfinished event is the
    // signal that something needs attention.
    await recordDecision({
      eventId: "e4",
      decision: "REFUSED_WINDOW",
      reason: "WINDOW_EXPIRED",
      windowExpiresAt: new Date(),
    });

    expect(eventUpdates[0]).not.toHaveProperty("processedStatus");
  });

  it("marks an event complete only when a send was accepted", async () => {
    eventRows.set("e5", { processedStatus: "PENDING", replyText: null });

    await markEventCompleted({ eventId: "e5", replyText: "Alerte arnaque" });

    expect(eventRows.get("e5")).toEqual({
      processedStatus: "COMPLETED",
      replyText: "Alerte arnaque",
    });
  });

  it("stores no reply text when a notice rather than a verdict was sent", async () => {
    eventRows.set("e6", { processedStatus: "PENDING", replyText: null });

    await markEventCompleted({ eventId: "e6", replyText: null });

    expect(eventRows.get("e6")?.replyText).toBeNull();
  });

  it("stamps the thread when a reply goes out", async () => {
    threadRows.set(TEST_PHONE, { threadKey: TEST_PHONE });

    await markThreadOutbound(TEST_PHONE);

    expect(threadRows.get(TEST_PHONE)?.lastOutboundAt).toBeInstanceOf(Date);
  });
});

describe("spec 0015 AC-2: a duplicate write is recognised, any other failure is not", () => {
  it("recognises a unique constraint violation", () => {
    // The webhook recovery path depends on telling "somebody already sent this"
    // apart from "the database is down". Swallowing both would lose messages
    // silently.
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
    expect(isUniqueViolation(Object.assign(new Error("dup"), { code: "P2002" }))).toBe(true);
  });

  it("does not treat an unrelated database failure as a duplicate", () => {
    expect(isUniqueViolation(new Error("connection terminated unexpectedly"))).toBe(false);
    expect(isUniqueViolation({ code: "P1001" })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation("P2002")).toBe(false);
  });
});

describe("spec 0017 review: a retry after a successful send skips the resend", () => {
  it("treats a SENT with no reason as already sent", () => {
    expect(isAlreadySent({ decision: "SENT", reason: null })).toBe(true);
  });

  it("treats a sent cap notice as already sent", () => {
    expect(isAlreadySent({ decision: "SENT", reason: "CAP_NOTICE_SENT" })).toBe(true);
  });

  it("retries refusals, pending rows and rows with no decision", () => {
    expect(isAlreadySent({ decision: "SENT", reason: "META_REFUSED_500" })).toBe(false);
    expect(isAlreadySent({ decision: "SENT", reason: "WINDOW_EXPIRED" })).toBe(false);
    expect(isAlreadySent({ decision: "PENDING", reason: null })).toBe(false);
    expect(isAlreadySent({ decision: "REFUSED_CAP", reason: "MONTHLY_CAP_REACHED" })).toBe(false);
    expect(isAlreadySent({ decision: null, reason: null })).toBe(false);
    expect(isAlreadySent({ decision: undefined, reason: undefined })).toBe(false);
  });
});
