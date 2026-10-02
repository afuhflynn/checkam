import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Spec 0015 AC-2, AC-3 and AC-10: the inbound webhook.
 *
 * This is the only public surface in the WhatsApp path and it is unauthenticated
 * by design, so signature verification is the whole of its security. The tests
 * below pin three things a caller relies on: a payload that is not signed by
 * Meta never reaches the database, a redelivery never produces a second event,
 * and anything we do not understand is answered rather than processed.
 *
 * The database and the event bus are mocked at the boundary. What is under test
 * is the route's own decisions, not Prisma's behaviour.
 */

const APP_SECRET = "test-app-secret-value";
const EVENT_ID = "event-1";

const created: unknown[] = [];
const threadUpserts: unknown[] = [];
let sendEvents: unknown[] = [];
let createResult: { id: string } = { id: EVENT_ID };
let createThrows: unknown = null;

const dbMock = {
  whatsAppWebhookEvent: {
    create: vi.fn(async ({ data }: { data: unknown }) => {
      if (createThrows) throw createThrows;
      created.push(data);
      return createResult;
    }),
    findUnique: vi.fn(async ({ where }: { where: { messageId: string } }) => {
      const existing = created.find(
        (row) => (row as { messageId: string }).messageId === where.messageId,
      );
      return existing ? { id: EVENT_ID, messageId: where.messageId } : null;
    }),
    update: vi.fn(async () => ({ count: 1 })),
  },
};

vi.mock("../lib/db", () => ({ db: dbMock }));
vi.mock("../inngest/client", () => ({
  inngest: {
    send: vi.fn(async (event: unknown) => {
      sendEvents.push(event);
    }),
  },
}));

// openThread runs its own transaction against the same database, so it is
// exercised rather than mocked: the window arithmetic is part of what this route
// promises.
vi.mock("../lib/whatsapp/thread", async () => {
  const actual =
    await vi.importActual<typeof import("../lib/whatsapp/thread")>("../lib/whatsapp/thread");
  return {
    ...actual,
    openThread: vi.fn(async ({ fromNumber }: { fromNumber: string }) => {
      threadUpserts.push(fromNumber);
      return {
        threadKey: fromNumber,
        lastInboundAt: new Date(),
        windowExpiresAt: new Date(Date.now() + 86_400_000),
      };
    }),
  };
});

const { POST, GET } = await import("../app/api/public/whatsapp/webhook/route");
/**
 * The handler takes a NextRequest, but the route only ever reads `text()` and
 * the headers, both of which a standard Request provides. The builders below
 * hand back the type the signature asks for so each test reads as a plain
 * request against the route's public behaviour.
 */

function bodyFor(overrides: Record<string, unknown> = {}): string {
  const message = {
    id: "wamid.test.1",
    from: "237622571469",
    type: "text",
    timestamp: "1790881088",
    text: { body: "on me demande 25 000 FCFA" },
    ...overrides,
  };
  return JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      { id: "0", changes: [{ value: { messaging_product: "whatsapp", messages: [message] } }] },
    ],
  });
}

/**
 * The handlers are typed for NextRequest, which is a Request plus Next's own
 * wrapper. The route only reads the body text and the headers, so the tests hand
 * it a standard Request and cast once here instead of at every call site.
 */
const post = POST as unknown as (request: Request) => Promise<Response>;
const get = GET as unknown as (request: Request) => Promise<Response>;

function signedRequest(raw: string, secret = APP_SECRET): NextRequest {
  const signature = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return new Request("http://localhost/api/public/whatsapp/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-hub-signature-256": `sha256=${signature}` },
    body: raw,
  }) as unknown as NextRequest;
}

beforeEach(() => {
  created.length = 0;
  threadUpserts.length = 0;
  sendEvents = [];
  createThrows = null;
  createResult = { id: EVENT_ID };
  dbMock.whatsAppWebhookEvent.create.mockClear();
  dbMock.whatsAppWebhookEvent.findUnique.mockClear();
  vi.stubEnv("WHATSAPP_APP_SECRET", APP_SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("spec 0015 AC-1: signature verification is the whole of the security", () => {
  it("refuses an unsigned payload", async () => {
    const res = await post(
      new Request("http://localhost/api/public/whatsapp/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyFor(),
      }),
    );

    expect(res.status).toBe(401);
    expect(created).toHaveLength(0);
    expect(sendEvents).toHaveLength(0);
  });

  it("refuses a payload signed with the wrong secret", async () => {
    const res = await post(signedRequest(bodyFor(), "not-the-real-secret"));

    expect(res.status).toBe(401);
    expect(created).toHaveLength(0);
    expect(sendEvents).toHaveLength(0);
  });

  it("refuses a signature over different bytes than the body it carries", async () => {
    // The signature covers the exact bytes, so a valid signature replayed with
    // an edited body must not pass.
    const signature = crypto
      .createHmac("sha256", APP_SECRET)
      .update(bodyFor({ text: { body: "original" } }))
      .digest("hex");
    const res = await post(
      new Request("http://localhost/api/public/whatsapp/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hub-signature-256": `sha256=${signature}`,
        },
        body: bodyFor({ text: { body: "edited to say something else entirely" } }),
      }),
    );

    expect(res.status).toBe(401);
    expect(created).toHaveLength(0);
  });

  it("accepts a correctly signed payload and stores the event", async () => {
    const res = await post(signedRequest(bodyFor()));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "RECEIVED", messageId: "wamid.test.1" });
    expect(created).toHaveLength(1);
    expect(sendEvents).toHaveLength(1);
  });

  it("skips verification when the app secret is a placeholder", async () => {
    // A known gap, scope rows 20 and 23 own it. Pinned here so the day someone
    // closes it, this test is the thing that has to change.
    vi.stubEnv("WHATSAPP_APP_SECRET", "placeholder_app_secret");

    const res = await post(
      new Request("http://localhost/api/public/whatsapp/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyFor(),
      }),
    );

    expect(res.status).toBe(200);
    expect(created).toHaveLength(1);
  });
});

describe("spec 0015 AC-2: the window opens on every accepted inbound message", () => {
  it("stores Meta's own timestamp so the window can start from it", async () => {
    await post(signedRequest(bodyFor({ timestamp: "1790881088" })));

    const row = created[0] as { inboundAt: Date; processedStatus: string };
    // Meta sends unix seconds; storing anything else would move the window.
    expect(row.inboundAt).toEqual(new Date(1_790_881_088_000));
    expect(row.processedStatus).toBe("PENDING");
  });

  it("stores a null timestamp rather than inventing one when Meta omits it", async () => {
    const raw = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "0",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                messages: [
                  {
                    id: "wamid.no.ts",
                    from: "237622571469",
                    type: "text",
                    text: { body: "salut" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    await post(signedRequest(raw));

    const row = created[0] as { inboundAt: Date | null };
    expect(row.inboundAt).toBeNull();
  });

  it("opens the thread before dispatching, so a backed up queue cannot widen the window", async () => {
    await post(signedRequest(bodyFor()));

    expect(threadUpserts).toEqual(["237622571469"]);
    // The thread must exist before the worker is told to run, otherwise the
    // worker could decide against a window nobody wrote.
    expect(created).toHaveLength(1);
    expect(sendEvents).toHaveLength(1);
  });

  it("sends no secret in the event payload", async () => {
    await post(signedRequest(bodyFor()));

    const event = sendEvents[0] as { name: string; data: Record<string, unknown> };
    expect(event.name).toBe("whatsapp/message.received");
    // The payload is identifiers and text only. A token here would land in the
    // Inngest event store and its run history.
    for (const value of Object.values(event.data)) {
      if (typeof value === "string") {
        expect(value).not.toContain(APP_SECRET);
        expect(value).not.toMatch(/^EAAG/);
      }
    }
  });
});

describe("spec 0015 AC-2: a redelivery is not a second event", () => {
  it("acknowledges a duplicate without dispatching a second run", async () => {
    const raw = bodyFor();

    // First delivery creates the row.
    const first = await post(signedRequest(raw));
    expect(first.status).toBe(200);
    expect(sendEvents).toHaveLength(1);

    // Second delivery hits the unique constraint, which is how Meta recovers
    // from our own failed write.
    createThrows = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    const second = await post(signedRequest(raw));

    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ status: "RECEIVED" });
    // One dispatch only: a redelivery must not produce a second reply to the
    // same person.
    expect(sendEvents).toHaveLength(1);
  });

  it("still opens the window on a redelivery, because that is the recovery path", async () => {
    const raw = bodyFor();
    await post(signedRequest(raw));
    threadUpserts.length = 0;

    createThrows = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    await post(signedRequest(raw));

    expect(threadUpserts).toEqual(["237622571469"]);
  });

  it("returns 500 so Meta retries when the write fails for a real reason", async () => {
    createThrows = new Error("connection terminated unexpectedly");

    const res = await post(signedRequest(bodyFor()));

    expect(res.status).toBe(500);
  });
});

describe("spec 0015 AC-2: what we do not understand, we answer and ignore", () => {
  it("ignores a status webhook, which carries no message", async () => {
    const raw = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{ id: "0", changes: [{ value: { statuses: [{ id: "wamid.x" }] } }] }],
    });

    const res = await post(signedRequest(raw));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "IGNORED_STATUS_UPDATE" });
    expect(created).toHaveLength(0);
    expect(sendEvents).toHaveLength(0);
  });

  it("ignores an unsupported message type instead of guessing", async () => {
    const res = await post(signedRequest(bodyFor({ type: "sticker", sticker: { id: "s1" } })));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "IGNORED_UNSUPPORTED_TYPE" });
    expect(created).toHaveLength(0);
  });

  it("carries an image message through with its media id and caption", async () => {
    await post(
      signedRequest(
        bodyFor({
          type: "image",
          text: undefined,
          image: { id: "media-123", mime_type: "image/jpeg", caption: "flyer" },
        }),
      ),
    );

    const event = sendEvents[0] as { data: Record<string, unknown> };
    expect(event.data.mediaId).toBe("media-123");
    expect(event.data.mimeType).toBe("image/jpeg");
    expect(event.data.textBody).toBe("flyer");
  });

  it("refuses a malformed body rather than throwing at the caller", async () => {
    const signature = crypto.createHmac("sha256", APP_SECRET).update("not json").digest("hex");
    const res = await post(
      new Request("http://localhost/api/public/whatsapp/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hub-signature-256": `sha256=${signature}`,
        },
        body: "not json",
      }),
    );

    expect(res.status).toBe(500);
    expect(sendEvents).toHaveLength(0);
  });
});

describe("spec 0007 AC-5: the subscription handshake", () => {
  it("echoes the challenge for the configured verify token", async () => {
    vi.stubEnv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "our-verify-token");

    const res = await get(
      new Request(
        "http://localhost/api/public/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=our-verify-token&hub.challenge=12345",
      ),
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("12345");
  });

  it("refuses a wrong verify token", async () => {
    vi.stubEnv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "our-verify-token");

    const res = await get(
      new Request(
        "http://localhost/api/public/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345",
      ),
    );

    expect(res.status).toBe(403);
  });
});
