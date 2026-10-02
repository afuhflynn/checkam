import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_PHONE = "237XXXXXXXXX";
import { hasSendCredentials, phoneNumberId } from "../lib/whatsapp/config";
import { downloadMedia } from "../lib/whatsapp/media";
import { isMockDispatchAllowed, sendText } from "../lib/whatsapp/send";

/**
 * Spec 0015 AC-1, AC-10 and AC-12: the Meta send and the media download.
 *
 * The dangerous failure here is silence. Meta answers a refused send with a 200
 * and a per message error in the body, so anything that trusts the status code
 * alone reports a message as delivered when nobody received it. These tests pin
 * the body parsing, not the status code, and they pin that development can
 * pretend to send while production never can.
 */

const REAL_TOKEN = "EAAG-real-looking-token";
const REAL_PHONE_ID = "1388976474303999";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.stubEnv("WHATSAPP_API_TOKEN", REAL_TOKEN);
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", REAL_PHONE_ID);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("spec 0015 AC-1: every send goes through the pinned version", () => {
  it("posts to the pinned version, never a duplicated literal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ messages: [{ id: "wamid.ok" }] }));
    vi.stubGlobal("fetch", fetchMock);

    await sendText(TEST_PHONE, "bonjour");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v26.0/");
    expect(url).toContain(REAL_PHONE_ID);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${REAL_TOKEN}`);
  });

  it("sends the body as a WhatsApp free form text message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ messages: [{ id: "wamid.ok" }] }));
    vi.stubGlobal("fetch", fetchMock);

    await sendText(TEST_PHONE, "Alerte arnaque");

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({
      messaging_product: "whatsapp",
      to: TEST_PHONE,
      type: "text",
      text: { body: "Alerte arnaque" },
    });
  });
});

describe("spec 0015 AC-7: a refused send is never reported as sent", () => {
  it("treats a 200 carrying a per message error as a refusal", async () => {
    // This is Meta's actual behaviour for a refused message: HTTP 200 with an
    // error object. Trusting the status code would tell the operator a warning
    // reached someone when it never left.
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ error: { code: 131047, message: "Re-engagement message" } }, 200),
        ),
    );

    const result = await sendText(TEST_PHONE, "trop tard");

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe(131047);
    expect(result.errorMessage).toBe("Re-engagement message");
  });

  it("reports the message id when Meta accepts the send", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ messages: [{ id: "wamid.accepted" }] })),
    );

    const result = await sendText(TEST_PHONE, "bonjour");

    expect(result.ok).toBe(true);
    expect(result.messageId).toBe("wamid.accepted");
    expect(result.errorCode).toBeNull();
  });

  it("treats an unreadable body as not sent rather than as success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>oops</html>", { status: 200 })),
    );

    const result = await sendText(TEST_PHONE, "bonjour");

    expect(result.ok).toBe(false);
    expect(result.status).toBe(200);
    expect(result.messageId).toBeNull();
  });

  it("never reports success without the message id that proves delivery", async () => {
    // The worker's trust boundary. `ok` is what makes the worker record SENT,
    // stamp the thread and mark the event COMPLETED, and a completed event is
    // never retried. So an unprovable send has to read as a refusal, or a
    // warning silently disappears and nothing ever notices.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ contacts: [] })));

    const result = await sendText(TEST_PHONE, "Alerte arnaque");

    expect(result.ok).toBe(false);
    expect(result.messageId).toBeNull();
  });

  it("reports an empty body as not sent as well", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 200 })));

    const result = await sendText(TEST_PHONE, "bonjour");

    expect(result.ok).toBe(false);
  });

  it("surfaces a non 2xx with its error code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: { code: 190, message: "bad token" } }, 401)),
    );

    const result = await sendText(TEST_PHONE, "bonjour");

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(result.errorCode).toBe(190);
  });

  it("refuses to send at all when the phone number is not configured", async () => {
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendText(TEST_PHONE, "bonjour");

    // No Meta call may happen without an id to send from, so nothing is billed.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
  });
});

describe("spec 0015 AC-10: credentials, and the development pretend send", () => {
  it("treats a placeholder token or number as no credential at all", () => {
    // The placeholder values are how local work runs without spending. Reading
    // one as real would send from a number that does not exist, and would bill
    // a real attempt against a fake id.
    vi.stubEnv("WHATSAPP_API_TOKEN", "placeholder_token");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "placeholder_phone");

    expect(phoneNumberId()).toBeNull();
    expect(hasSendCredentials()).toBe(false);
  });

  it("needs both a token and a number before it will send", () => {
    vi.stubEnv("WHATSAPP_API_TOKEN", "");
    expect(hasSendCredentials()).toBe(false);

    vi.stubEnv("WHATSAPP_API_TOKEN", REAL_TOKEN);
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "");
    expect(hasSendCredentials()).toBe(false);

    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", REAL_PHONE_ID);
    expect(hasSendCredentials()).toBe(true);
  });

  it("allows the log only dispatch in development without credentials", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WHATSAPP_API_TOKEN", "placeholder_token");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "placeholder_phone");

    expect(isMockDispatchAllowed()).toBe(true);
  });

  it("never allows the pretend send in production", () => {
    // The one line that keeps a local convenience from shipping: in production
    // a missing credential must stay a visible failure, not a logged message
    // that looks delivered.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WHATSAPP_API_TOKEN", "placeholder_token");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "placeholder_phone");

    expect(isMockDispatchAllowed()).toBe(false);
  });

  it("never allows the pretend send when real credentials exist", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(isMockDispatchAllowed()).toBe(false);
  });
});

describe("spec 0015 AC-1: the media download", () => {
  it("resolves the media id, then fetches the binary, with a token on both hops", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ url: "https://cdn.example/media/1", mime_type: "image/png" }),
      )
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]).buffer, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await downloadMedia("media-1");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected a successful download");
    expect(result.media.mimeType).toBe("image/png");
    expect([...result.media.buffer]).toEqual([1, 2, 3]);

    const [firstUrl, firstInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(firstUrl).toContain("/v26.0/media-1");
    expect((firstInit.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${REAL_TOKEN}`,
    );
    const [, secondInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((secondInit.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${REAL_TOKEN}`,
    );
  });

  it("reports Meta error 131052 when no media URL comes back", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({})));

    const result = await downloadMedia("media-1");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a failed download");
    expect(result.errorCode).toBe(131052);
  });

  it("reports 131052 when the binary hop fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ url: "https://cdn.example/media/1" }))
      .mockResolvedValueOnce(new Response("nope", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await downloadMedia("media-1");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a failed download");
    expect(result.errorCode).toBe(131052);
    expect(result.message).toContain("404");
  });

  it("defaults the mime type when Meta omits it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ url: "https://cdn.example/media/1" }))
      .mockResolvedValueOnce(new Response(new Uint8Array([9]).buffer, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await downloadMedia("media-1");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected a successful download");
    expect(result.media.mimeType).toBe("image/jpeg");
  });
});
