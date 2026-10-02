/**
 * @vitest-environment happy-dom
 *
 * Component tests for the chat shell thread (spec 0005).
 *
 * Scope note, read before trusting a green run: happy-dom has no layout engine
 * and no stylesheet, so anything measured in pixels or read off a Tailwind class
 * is out of reach here. The desktop rail plus thread plus dossier arrangement,
 * the phone drawers, the calm skeleton, the reduced motion behaviour of the
 * verdict seal and the 10MB flyer cap are all verified by hand in a real
 * browser. What is locked in below is every fact that is a property of the DOM
 * and of the requests the thread makes.
 *
 * Four boundaries are stubbed so the thread is the only thing under test: the
 * AI SDK hook (driven by hand so a stream can be held mid flight), Streamdown
 * (its markdown parsing is not what this file is about), the composer (so a
 * submit can be fired without a keyboard), and the scroll container.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi, Mock } from "vitest";
import { Toaster, toast } from "sonner";
import { LanguageProvider } from "../lib/i18n/context";
import { ThreadView } from "../components/chat/thread-view";

interface Row {
  id: string;
  seq: number;
  role: string;
  text: string;
  attachments: unknown;
  verificationId: string | null;
}

const chat = vi.hoisted(() => ({
  messages: [] as { id: string; role: string; parts: { type: string; text?: string }[] }[],
  status: "ready",
  error: undefined as unknown,
  sendMessage: vi.fn(async () => {}),
  stop: vi.fn(),
  options: {
    onData: undefined as ((part: unknown) => void) | undefined,
    onFinish: undefined as (() => void) | undefined,
    onError: undefined as ((error: unknown) => void) | undefined,
  },
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: (options: Record<string, unknown>) => {
    chat.options = options as typeof chat.options;
    return {
      messages: chat.messages,
      sendMessage: chat.sendMessage,
      stop: chat.stop,
      status: chat.status,
      error: chat.error,
    };
  },
}));

vi.mock("streamdown", () => ({
  Streamdown: ({ children }: { children?: unknown }) => (
    <div data-testid="streamdown">{children as never}</div>
  ),
}));

vi.mock("use-stick-to-bottom", async () => {
  const { createElement } = await import("react");
  const StickToBottom = ({ children, ...props }: Record<string, unknown>) =>
    createElement("div", props, children as never);
  (StickToBottom as unknown as { Content: unknown }).Content = ({
    children,
    ...props
  }: Record<string, unknown>) => createElement("div", props, children as never);
  return {
    StickToBottom,
    useStickToBottomContext: () => ({ scrollRef: { current: null } }),
  };
});

// A composer thin enough to drive: a real textarea carrying the thread's own
// value and onChange, and a submit that hands the typed text back exactly as
// the real composer does.
vi.mock("../components/ai-elements/prompt-input", () => ({
  PromptInput: ({
    children,
    onSubmit,
  }: {
    children?: unknown;
    onSubmit?: (message: { text: string; files: [] }) => void;
  }) => (
    <form
      data-testid="composer"
      onSubmit={(event) => {
        event.preventDefault();
        const field = event.currentTarget.querySelector("textarea");
        onSubmit?.({ text: field?.value ?? "", files: [] });
      }}
    >
      {children as never}
    </form>
  ),
  PromptInputTextarea: (props: Record<string, unknown>) => (
    <textarea aria-label="Message" {...props} />
  ),
  PromptInputFooter: ({ children }: { children?: unknown }) => <div>{children as never}</div>,
  PromptInputSubmit: ({ disabled }: { disabled?: boolean }) => (
    <button type="submit" data-testid="send" disabled={disabled}>
      Send
    </button>
  ),
}));

const SESSION = "session-1";

let rows: Row[] = [];
let writes: { method: string; url: string; body: Record<string, unknown> }[] = [];
let reads: string[] = [];
let persisted: Row[] = [];
let nextSeq = 0;
let persistStatus = 200;

function json(data: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => JSON.parse(JSON.stringify(data)) };
}

function answer(text: string, extra: Partial<Row> = {}): Row {
  return {
    id: `a${extra.seq ?? nextSeq}`,
    seq: extra.seq ?? nextSeq,
    role: "assistant",
    text,
    attachments: [],
    verificationId: null,
    ...extra,
  };
}

function question(text: string): Row {
  return {
    id: `u${nextSeq}`,
    seq: nextSeq,
    role: "user",
    text,
    attachments: [],
    verificationId: null,
  };
}

function installFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      const payload = init?.body ? JSON.parse(String(init.body)) : undefined;
      if (method !== "GET") writes.push({ method, url, body: payload ?? {} });

      if (url.includes("/messages?after=")) {
        const after = Number(new URL(url, "http://x").searchParams.get("after"));
        const fresh = persisted.filter((row) => row.seq > after);
        return json({ messages: fresh });
      }
      if (url.includes("/messages")) {
        if (method === "POST") {
          if (persistStatus === 403) return json({ error: "guest_wall" }, 403);
          if (persistStatus >= 400) return json({ error: "nope" }, persistStatus);
          const row: Row = {
            id: `p${nextSeq}`,
            seq: nextSeq,
            role: String(payload.role ?? "user"),
            text: String(payload.text ?? ""),
            attachments: payload.attachments ?? [],
            verificationId: null,
          };
          persisted = [...persisted, row];
          return json({ message: row }, 201);
        }
        reads.push(url);
        const params = new URL(url, "http://x").searchParams;
        if (params.has("before")) {
          const before = Number(params.get("before"));
          const older = rows.filter((row) => row.seq < before);
          return json({ messages: older, hasMore: false });
        }
        return json({ messages: rows, hasMore: false });
      }

      if (url.startsWith("/api/chat/verdict")) {
        return json({
          verdict: "HIGH_RISK",
          score: 80,
          category: "advance-fee",
          bullets: ["Demande de frais avant tout"],
          safetyNote: "Ne payez rien.",
          shareText: "Alerte arnaque. Ne payez rien.",
          shareTextPlain: "Alerte arnaque. Ne payez rien.",
          verificationId: "v1",
        });
      }

      if (url.startsWith("/api/chat/lookup")) {
        return json({ normalized: "+237699123456", flagged: null, reports: [] });
      }

      return json({ error: "not_found" }, 404);
    }),
  );
}

function renderThread(overrides: Partial<Parameters<typeof ThreadView>[0]> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0, refetchOnWindowFocus: false } },
  });
  const props: Parameters<typeof ThreadView>[0] = {
    sessionId: SESSION,
    locale: "en",
    initialDraft: null,
    pendingSend: null,
    onPendingSent: vi.fn(),
    wallCapped: false,
    onWall: vi.fn() as Mock,
    verdict: null,
    onVerdict: vi.fn() as Mock,
    onLookup: vi.fn(),
    onFallback: vi.fn(),
    ...overrides,
  };
  const utils = render(
    <QueryClientProvider client={client}>
      <LanguageProvider initialLanguage="en">
        <ThreadView {...props} />
        <Toaster />
      </LanguageProvider>
    </QueryClientProvider>,
  );
  return { ...utils, props, client };
}

async function threadIsReady() {
  await waitFor(() => expect(reads.length).toBeGreaterThan(0));
}

beforeAll(() => {
  // The paging sentinel and Radix both reach for these; happy-dom ships neither.
  globalThis.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
  class FakeEventSource {
    addEventListener() {}
    close() {}
  }
  globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;
});

beforeEach(() => {
  nextSeq = 0;
  rows = [];
  persisted = [];
  writes = [];
  reads = [];
  persistStatus = 200;
  chat.messages = [];
  chat.status = "ready";
  chat.error = undefined;
  chat.options.onData = undefined;
  chat.options.onFinish = undefined;
  chat.options.onError = undefined;
  chat.sendMessage.mockClear();
  chat.stop.mockClear();
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  localStorage.clear();
  installFetch();
});

afterEach(() => {
  toast.dismiss();
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("the empty thread (spec 0005 AC-8)", () => {
  it("covers: AC-8 an empty thread explains itself instead of showing a blank wall", async () => {
    renderThread();
    await threadIsReady();
    // The thread is a log, so assistive tech reads the answers as they arrive.
    expect(screen.getByRole("log")).toBeTruthy();
    expect(document.body.textContent).toContain("What should we verify?");
  });
});

describe("the composer (spec 0005 AC-4, AC-7, AC-9)", () => {
  it("covers: AC-4 the composer is present in every state, with the lookup ready once there is text", async () => {
    renderThread();
    await threadIsReady();

    const field = screen.getByLabelText("Message") as HTMLTextAreaElement;
    const send = screen.getByTestId("send") as HTMLButtonElement;
    // Nothing typed yet, so neither the send nor the lookup can do anything.
    expect(send.disabled).toBe(true);
    expect((screen.getByRole("button", { name: "237" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(field, { target: { value: "699 12 34 56" } });
    // The controls enable off the draft, with no extra step from the reader.
    expect(send.disabled).toBe(false);
    expect((screen.getByRole("button", { name: "237" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("covers: AC-4 a send persists the reader's turn first, then streams it", async () => {
    renderThread();
    await threadIsReady();

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "on me demande 25000" } });
    fireEvent.click(screen.getByTestId("send"));

    await waitFor(() => expect(writes).toHaveLength(1));
    // The user row is written before the stream starts, so the turn exists even
    // if the answer never arrives.
    expect(writes[0].method).toBe("POST");
    expect(writes[0].url).toBe(`/api/chat/sessions/${SESSION}/messages`);
    expect(writes[0].body).toMatchObject({ role: "user", text: "on me demande 25000" });
    await waitFor(() => expect(chat.sendMessage).toHaveBeenCalledTimes(1));
    expect(chat.sendMessage).toHaveBeenCalledWith({ text: "on me demande 25000" });
  });

  it("covers: AC-7 the wall locks the composer, says so, and keeps the draft", async () => {
    const { props } = renderThread({ wallCapped: true });
    await threadIsReady();

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "kept for later" } });
    // The reader is told what happened rather than met with a dead control.
    expect(document.body.textContent).toContain("Daily tries used");
    expect(document.body.textContent).toContain("Sign in to keep checking.");
    expect((screen.getByTestId("send") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("Message") as HTMLTextAreaElement).disabled).toBe(true);
    // The draft survives the wall, which is the whole point of keeping it.
    expect((screen.getByLabelText("Message") as HTMLTextAreaElement).value).toBe("kept for later");
    expect(props.onWall).not.toHaveBeenCalled();
  });

  it("covers: AC-9 a failed turn names the failure and offers retry from the kept draft", async () => {
    chat.error = new Error("transport_failed");
    const { props } = renderThread();
    await threadIsReady();

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "retry me" } });
    const retry = screen.getByRole("button", { name: "Retry" }) as HTMLButtonElement;
    expect(document.body.textContent).toContain("This turn failed. Retry from your kept draft.");
    expect(retry.disabled).toBe(false);

    fireEvent.click(retry);
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].body).toMatchObject({ role: "user", text: "retry me" });
    // A failed turn never invents a verdict: the pane is handed nothing.
    expect(props.onVerdict).toHaveBeenCalledWith(null, false);
  });

  it("covers: AC-9 retry is refused outright when there is no draft to resend", async () => {
    chat.error = new Error("transport_failed");
    renderThread();
    await threadIsReady();

    const retry = screen.getByRole("button", { name: "Retry" }) as HTMLButtonElement;
    expect(retry.disabled).toBe(true);
    fireEvent.click(retry);
    expect(writes).toHaveLength(0);
  });
});

describe("streaming (spec 0005 AC-2, AC-6)", () => {
  it("covers: AC-2 while an answer streams, the streamed text is on screen and Stop replaces send", async () => {
    chat.status = "streaming";
    chat.messages = [
      { id: "m1", role: "user", parts: [{ type: "text", text: "la question" }] },
      { id: "m2", role: "assistant", parts: [{ type: "text", text: "premiere reponse qui arrive" }] },
    ];
    renderThread();
    await threadIsReady();

    expect(document.body.textContent).toContain("la question");
    expect(document.body.textContent).toContain("premiere reponse qui arrive");
    // Send would be a second turn racing the first, so it is replaced outright.
    expect(screen.queryByTestId("send")).toBeNull();
    const stop = screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement;
    expect(stop.disabled).toBe(false);
    fireEvent.click(stop);
    expect(chat.stop).toHaveBeenCalledTimes(1);
  });

  it("covers: AC-6 Stop stays out of the way once the answer settles", async () => {
    chat.messages = [
      { id: "m2", role: "assistant", parts: [{ type: "text", text: "reponse terminee" }] },
    ];
    chat.status = "ready";
    renderThread();
    await threadIsReady();

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "encore" } });
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
    expect((screen.getByTestId("send") as HTMLButtonElement).disabled).toBe(false);
  });

  it("covers: AC-2 only the current turn streams, so an old exchange never repeats", async () => {
    // The SDK keeps every message it has ever sent. Rendering all of them would
    // print the whole history again under the live answer.
    chat.status = "streaming";
    chat.messages = [
      { id: "m1", role: "user", parts: [{ type: "text", text: "première question" }] },
      { id: "m2", role: "assistant", parts: [{ type: "text", text: "première réponse" }] },
      { id: "m3", role: "user", parts: [{ type: "text", text: "deuxième question" }] },
      { id: "m4", role: "assistant", parts: [{ type: "text", text: "deuxième réponse" }] },
    ];
    renderThread();
    await threadIsReady();

    expect(document.body.textContent).not.toContain("première question");
    expect(document.body.textContent).toContain("deuxième question");
    expect(document.body.textContent).toContain("deuxième réponse");
  });
});

describe("the verdict (spec 0005 AC-3, AC-9)", () => {
  it("covers: AC-3 a verdict arriving with the answer seals the dossier and the bubble links to it", async () => {
    const { props } = renderThread();
    await threadIsReady();

    chat.options?.onData?.({
      type: "data-verdict",
      data: {
        verdict: "HIGH_RISK",
        score: 80,
        category: "advance-fee",
        bullets: ["Demande de frais avant tout"],
        safetyNote: "Ne payez rien.",
        shareText: "Alerte arnaque. Ne payez rien.",
        shareTextPlain: "Alerte arnaque. Ne payez rien.",
        verificationId: "v1",
      },
    });

    // Sealed is what tells the dossier the verdict is final rather than a draft.
    await waitFor(() => expect(props.onVerdict).toHaveBeenCalled());
    const [payload, sealed] = props.onVerdict.mock.calls.at(-1) as [
      { verdict: string; verificationId: string },
      boolean,
    ];
    expect(payload.verdict).toBe("HIGH_RISK");
    expect(payload.verificationId).toBe("v1");
    expect(sealed).toBe(true);
  });

  it("covers: AC-9 no verdict means no share controls, rather than a faked one", async () => {
    rows = [answer("une reponse sans verdict")];
    renderThread({ verdict: null });
    await threadIsReady();
    await waitFor(() => expect(document.body.textContent).toContain("une reponse sans verdict"));

    // The reader can still copy the words, but nothing claims a warning exists.
    expect(screen.getByRole("button", { name: "Copy this message" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "WhatsApp" })).toBeNull();
    expect(document.body.textContent).not.toContain("Alerte arnaque");
  });

  it("covers: AC-3 a settled verdict offers the forward warning in the thread", async () => {
    rows = [answer("une reponse avec verdict")];
    renderThread({
      verdict: {
        verdict: "HIGH_RISK",
        score: 80,
        category: "advance-fee",
        bullets: ["Demande de frais avant tout"],
        safetyNote: "Ne payez rien.",
        shareText: "Alerte arnaque. Ne payez rien.",
        shareTextPlain: "Alerte arnaque. Ne payez rien.",
        verificationId: "v1",
      },
    });
    await threadIsReady();

    await waitFor(() => expect(screen.getByRole("button", { name: "WhatsApp" })).toBeTruthy());
    // The warning a reader would forward leads with the verdict, not with chrome.
    expect(screen.getByRole("button", { name: "Facebook" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
  });

  it("covers: AC-3 a reload restores the verdict from the stored check instead of losing it", async () => {
    rows = [answer("une reponse verifiee", { verificationId: "v1" })];
    const { props } = renderThread();
    await threadIsReady();

    // Without this, a reload silently drops a verdict the reader already saw.
    await waitFor(() => expect(props.onVerdict).toHaveBeenCalled());
    const [payload, sealed] = props.onVerdict.mock.calls.at(-1) as [
      { verdict: string },
      boolean,
    ];
    expect(payload.verdict).toBe("HIGH_RISK");
    // Sealed is false on the restored path: nothing is stamped a second time.
    expect(sealed).toBe(false);
  });
});

describe("offline (spec 0005 AC-10)", () => {
  it("covers: AC-10 an offline send is queued, the draft is cleared, and it goes out on reconnect", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    renderThread();
    await threadIsReady();

    expect(document.body.textContent).toContain("You are offline");
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "envoyee plus tard" } });
    fireEvent.click(screen.getByTestId("send"));

    // Nothing reaches the network while offline; the turn waits in storage, so a
    // reload mid outage cannot lose it.
    await waitFor(() =>
      expect(localStorage.getItem("checkam-offline-queue")).toContain("envoyee plus tard"),
    );
    expect(writes).toHaveLength(0);
    expect((screen.getByLabelText("Message") as HTMLTextAreaElement).value).toBe("");

    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    fireEvent(window, new Event("online"));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].body).toMatchObject({ role: "user", text: "envoyee plus tard" });
    await waitFor(() => expect(localStorage.getItem("checkam-offline-queue")).toBe("[]"));
  });
});

describe("freshness (spec 0005 AC-11)", () => {
  it("covers: AC-11 a finished turn invalidates the rail's session list", async () => {
    const { client } = renderThread();
    await threadIsReady();

    const invalidate = vi.spyOn(client, "invalidateQueries");
    chat.options?.onFinish?.();
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["chat", "sessions"] }),
    );
  });

  it("covers: AC-11 a turn refused by the wall calls the wall, not the error toast", async () => {
    const { props } = renderThread();
    await threadIsReady();

    chat.options?.onError?.({
      statusCode: 403,
      responseBody: JSON.stringify({ error: "guest_wall" }),
    });
    // Being out of tries and having a broken turn are different problems, and
    // only one of them can be fixed by signing in.
    await waitFor(() => expect(props.onWall).toHaveBeenCalledTimes(1));
    expect(document.body.textContent).not.toContain("This turn failed");
  });

  it("covers: AC-11 any other refusal still reads as a failed turn", async () => {
    const { props } = renderThread();
    await threadIsReady();

    chat.options?.onError?.({
      statusCode: 403,
      responseBody: JSON.stringify({ error: "unverified" }),
    });
    await waitFor(() => expect(document.body.textContent).toContain("This turn failed"));
    expect(props.onWall).not.toHaveBeenCalled();
  });
});