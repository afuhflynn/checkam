"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useStickToBottomContext } from "use-stick-to-bottom";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "../ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "../ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "../ai-elements/prompt-input";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import type { Language } from "../../lib/i18n/dictionary";
import { useTranslation } from "../../lib/i18n/context";

export interface ThreadItem {
  id: string;
  seq: number;
  role: string;
  text: string;
  attachments: { key?: string; url?: string; mime?: string }[] | null;
  verificationId: string | null;
}

export interface Verdict {
  verdict: string;
  score: number;
  bullets: string[];
  verificationId: string;
}

export interface LookupResult {
  normalized: string;
  flagged: { riskLevel: string; category: string } | null;
  reports: { slug: string; title: string }[];
}

const OFFLINE_KEY = "checkam-offline-queue";

// Binds the StickToBottom scroll element out to a ref so paging can read
// heights and hold position across prepends.
function ScrollBinder({ target }: { target: React.RefObject<HTMLElement | null> }) {
  const { scrollRef } = useStickToBottomContext();
  useEffect(() => {
    target.current = scrollRef.current;
  });
  return null;
}

function readQueue(): { sessionId: string | null; text: string }[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_KEY) ?? "[]") as {
      sessionId: string | null;
      text: string;
    }[];
  } catch {
    return [];
  }
}

export function DossierPane({
  verdict,
  sealed,
  fallbackText,
  lookup,
}: {
  verdict: Verdict | null;
  sealed: boolean;
  fallbackText: string | null;
  lookup: LookupResult | null;
}) {
  const { t } = useTranslation();
  if (!verdict && !fallbackText && !lookup) return null;
  return (
    <Card className="border-2 border-authority-900/10 bg-white">
      <CardContent className="space-y-3 p-4">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {t.chatDossierTitle}
        </p>
        {verdict && (
          <div className={sealed ? "stamp-rotated quittance-stripes rounded-lg p-3" : "p-1"}>
            <p className="font-display text-xl font-black text-ink">
              {t.chatSealStamped}: {verdict.verdict} · {verdict.score}
            </p>
            <ul className="mt-2 space-y-1.5">
              {verdict.bullets.map((bullet, index) => (
                <li key={`${index}-${bullet.slice(0, 24)}`} className="text-sm text-slate-700">
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        )}
        {!verdict && fallbackText && <p className="text-sm text-slate-700">{fallbackText}</p>}
        {lookup && (
          <p className="text-sm text-slate-700">
            {lookup.normalized} — {lookup.flagged ? lookup.flagged.riskLevel : "clean"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ThreadView({
  sessionId,
  locale,
  initialDraft,
  wallCapped,
  onWall,
  onVerdict,
  onLookup,
  onFallback,
}: {
  sessionId: string | null;
  locale: Language;
  initialDraft: string | null;
  wallCapped: boolean;
  onWall: () => void;
  onVerdict: (verdict: Verdict | null, sealed: boolean) => void;
  onLookup: (lookup: LookupResult | null) => void;
  onFallback: (text: string | null) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [inFlightSeq, setInFlightSeq] = useState<number | null>(null);
  const [online, setOnline] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Session reset effect must run on sessionId only; callbacks ride a ref
  // so parent re-renders never retrigger the thread fetch.
  const callbacks = useRef({ onVerdict, onLookup, onFallback, failedCopy: t.gateFailed, initialDraft });
  callbacks.current = { onVerdict, onLookup, onFallback, failedCopy: t.gateFailed, initialDraft };
  // Sequence of the persisted user turn, handed to the transport so the
  // wall recount excludes the current turn instead of charging it twice.
  const turnSeq = useRef<number | undefined>(undefined);

  const { messages, sendMessage, stop, status, error } = useChat({
    id: sessionId ?? "guest-pending",
    transport: new DefaultChatTransport({
      api: "/api/chat/transport",
      body: () => ({ sessionId, locale, userSeq: turnSeq.current }),
    }),
    onData: (part) => {
      const data = part as { type?: string; data?: Verdict };
      if (data.type === "data-verdict" && data.data) {
        onVerdict(data.data, true);
      }
    },
    onFinish: () => {
      setInFlightSeq(null);
      void syncNew();
      void queryClient.invalidateQueries({ queryKey: ["chat", "sessions"] });
    },
    onError: () => {
      toast.error(t.chatTurnFailed);
    },
  });

  // Windowed pages (spec 0009): oldest page first, 50 rows each, at most
  // 3 mounted unless the thread is fully loaded. Scroll position is held
  // across prepends by height delta, so paging up never jumps.
  const PAGE_ROWS = 50;
  const MAX_MOUNTED_PAGES = 3;
  const [pages, setPages] = useState<ThreadItem[][]>([]);
  const [hasMoreUp, setHasMoreUp] = useState(true);
  const [loadingUp, setLoadingUp] = useState(false);
  const [fullyLoaded, setFullyLoaded] = useState(false);
  const scrollEl = useRef<HTMLElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const mountedPages = fullyLoaded ? pages : pages.slice(-MAX_MOUNTED_PAGES);
  const mounted = mountedPages.flat();
  const oldestSeq = mounted.length ? mounted[0]?.seq ?? null : null;

  const fetchPage = useCallback(
    async (before: number | null): Promise<{ rows: ThreadItem[]; more: boolean }> => {
      const params = new URLSearchParams();
      if (before !== null) params.set("before", String(before));
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages${params.size ? `?${params}` : ""}`);
      if (!res.ok) throw new Error("thread_failed");
      const data = (await res.json()) as { messages: ThreadItem[]; hasMore: boolean };
      return { rows: data.messages, more: data.hasMore };
    },
    [sessionId],
  );

  const loadInitial = useCallback(async () => {
    if (!sessionId) return;
    try {
      const { rows, more } = await fetchPage(null);
      setPages([rows]);
      setHasMoreUp(more);
      setFullyLoaded(!more);
      const lastAssistant = [...rows].reverse().find((row) => row.role === "assistant");
      callbacks.current.onFallback(lastAssistant ? lastAssistant.text : null);
      void fetchPage;
    } catch {
      toast.error(callbacks.current.failedCopy);
    }
  }, [sessionId, fetchPage]);

  const loadOlder = useCallback(async () => {
    if (!sessionId || loadingUp || !hasMoreUp || oldestSeq === null) return;
    setLoadingUp(true);
    const el = scrollEl.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;
    try {
      const { rows, more } = await fetchPage(oldestSeq);
      if (rows.length) {
        setPages((prev) => {
          const seen = new Set(prev.flat().map((row) => row.id));
          const fresh = rows.filter((row) => !seen.has(row.id));
          return fresh.length ? [fresh, ...prev] : prev;
        });
      }
      setHasMoreUp(more);
      if (!more) setFullyLoaded(true);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = prevTop + (el.scrollHeight - prevHeight);
      });
    } catch {
      toast.error(callbacks.current.failedCopy);
    } finally {
      setLoadingUp(false);
    }
  }, [sessionId, loadingUp, hasMoreUp, oldestSeq, fetchPage]);

  // Newest mounted seq rides a ref so the sync callback stays stable
  // across page appends.
  const newestSeq = useRef(-1);
  useEffect(() => {
    const last = pages.flat().at(-1)?.seq;
    if (last !== undefined) newestSeq.current = last;
  }, [pages]);

  // Sync new rows (own sends, other tabs, other devices) without reload.
  const syncNew = useCallback(async () => {
    if (!sessionId) return;
    try {
      const params = new URLSearchParams({ after: String(newestSeq.current) });
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages?${params}`);
      if (!res.ok) return;
      const data = (await res.json()) as { messages: ThreadItem[] };
      if (!data.messages.length) return;
      setPages((prev) => {
        const seen = new Set(prev.flat().map((row) => row.id));
        const fresh = data.messages.filter((row) => !seen.has(row.id));
        if (!fresh.length) return prev;
        if (!prev.length) return [fresh];
        const last = [...prev];
        last[last.length - 1] = [...(last[last.length - 1] ?? []), ...fresh];
        return last;
      });
      const lastAssistant = [...data.messages].reverse().find((row) => row.role === "assistant");
      if (lastAssistant) callbacks.current.onFallback(lastAssistant.text);
    } catch {
      // Poll backup absorbs transient failures on its next round.
    }
  }, [sessionId]);

  // Reset local turn state when the session changes, then load the
  // latest page fresh.
  const lastSession = useRef<string | null>(null);
  useEffect(() => {
    if (lastSession.current === sessionId) return;
    lastSession.current = sessionId;
    setDraft("");
    setInFlightSeq(null);
    setPages([]);
    setHasMoreUp(true);
    setFullyLoaded(false);
    const { onVerdict, onLookup, onFallback, failedCopy } = callbacks.current;
    onVerdict(null, false);
    onLookup(null);
    onFallback(null);
    if (!sessionId) return;
    void loadInitial().catch(() => toast.error(callbacks.current.failedCopy));
  }, [sessionId, loadInitial]);

  // Top sentinel pages older turns in as it scrolls into view.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMoreUp) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadOlder();
      },
      { rootMargin: "400px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreUp, loadOlder]);

  // Freshness in three layers (spec 0009): SSE push, 30 second poll,
  // window focus. SSE is a hint, the poll stays authoritative.
  useEffect(() => {
    if (!sessionId) return;
    let source: EventSource | null = null;
    try {
      source = new EventSource(
        `/api/chat/stream?sessionId=${encodeURIComponent(sessionId)}&since=${encodeURIComponent(new Date().toISOString())}`,
      );
      source.addEventListener("change", () => void syncNew());
    } catch {
      source = null;
    }
    const poll = window.setInterval(() => void syncNew(), 30_000);
    const onFocus = () => void syncNew();
    window.addEventListener("focus", onFocus);
    return () => {
      source?.close();
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
    };
  }, [sessionId, syncNew]);

  useEffect(() => {
    if (mounted.length === 0 && callbacks.current.initialDraft) {
      setDraft((current) => current || callbacks.current.initialDraft || "");
    }
  }, [mounted.length]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (!online) return;
    const queue = readQueue();
    if (queue.length === 0) return;
    localStorage.setItem(
      OFFLINE_KEY,
      JSON.stringify(queue.filter((item) => item.sessionId !== sessionId)),
    );
    for (const item of queue) {
      if (item.sessionId === sessionId) void submitTurn(item.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, sessionId]);

  async function submitTurn(text: string) {
    if (!sessionId) return;
    if (!online) {
      const queue = readQueue();
      queue.push({ sessionId, text });
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue));
      toast.success(t.chatOfflineDesc);
      setDraft("");
      return;
    }
    setInFlightSeq(null);
    onVerdict(null, false);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", text }),
      });
      if (res.status === 403) {
        onWall();
        return;
      }
      if (!res.ok) throw new Error("persist_failed");
      const data = (await res.json()) as { message: { seq: number } };
      setInFlightSeq(data.message.seq);
      turnSeq.current = data.message.seq;
      setDraft("");
      await sendMessage({ text });
    } catch {
      toast.error(t.chatTurnFailed);
    }
  }

  async function handleSubmit(message: PromptInputMessage) {
    const text = message.text.trim();
    if (!text || !sessionId || status === "streaming") return;
    if (message.files.length > 0) {
      setUploading(true);
      try {
        const keys: { key: string; mime: string; bytes: number }[] = [];
        for (const file of message.files.slice(0, 5)) {
          const blob = file.url ? await (await fetch(file.url)).blob() : null;
          if (!blob) continue;
          const form = new FormData();
          form.append("sessionId", sessionId);
          form.append("file", blob, "flyer");
          const res = await fetch("/api/chat/upload", { method: "POST", body: form });
          if (!res.ok) throw new Error("upload_failed");
          const data = (await res.json()) as {
            file: { key: string; mimeType: string; bytes: number };
          };
          keys.push({ key: data.file.key, mime: data.file.mimeType, bytes: data.file.bytes });
        }
        await submitTurnWithAttachments(text, keys);
      } catch {
        toast.error(t.gateFailed);
      } finally {
        setUploading(false);
      }
      return;
    }
    await submitTurn(text);
  }

  async function submitTurnWithAttachments(
    text: string,
    attachments: { key: string; mime: string; bytes: number }[],
  ) {
    if (!sessionId || !online) return;
    onVerdict(null, false);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", text, attachments }),
      });
      if (res.status === 403) {
        onWall();
        return;
      }
      if (!res.ok) throw new Error("persist_failed");
      const data = (await res.json()) as { message: { seq: number } };
      setInFlightSeq(data.message.seq);
      turnSeq.current = data.message.seq;
      setDraft("");
      await sendMessage({ text });
    } catch {
      toast.error(t.chatTurnFailed);
    }
  }

  async function handleLookup() {
    if (!draft.trim()) return;
    try {
      const res = await fetch(`/api/chat/lookup?phone=${encodeURIComponent(draft.trim())}`);
      if (!res.ok) throw new Error("lookup_failed");
      const data = (await res.json()) as LookupResult;
      onLookup(data);
    } catch {
      toast.error(t.gateFailed);
    }
  }

  const visiblePersisted =
    inFlightSeq === null ? mounted : mounted.filter((row) => row.seq < inFlightSeq);
  const streaming = status === "streaming" || status === "submitted";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ScrollBinder target={scrollEl} />
        <ConversationContent>
          {hasMoreUp && mounted.length > 0 && (
            <div ref={sentinelRef} aria-hidden="true" className="flex justify-center py-2">
              {loadingUp && (
                <span className="font-mono text-[11px] text-slate-400">···</span>
              )}
            </div>
          )}
          {visiblePersisted.length === 0 && !streaming && (
            <ConversationEmptyState title={t.chatEmptyTitle} description={t.chatEmptySub} />
          )}
          {visiblePersisted.map((row) => (
            <Message key={row.id} from={row.role === "user" ? "user" : "assistant"}>
              <MessageContent>
                <MessageResponse>{row.text}</MessageResponse>
              </MessageContent>
            </Message>
          ))}
          {streaming &&
            messages.map((message) => (
              <Message key={message.id} from={message.role === "user" ? "user" : "assistant"}>
                <MessageContent>
                  {message.parts
                    .filter((part) => part.type === "text")
                    .map((part, index) => (
                      <MessageResponse key={`${message.id}-${index}`}>
                        {"text" in part ? part.text : ""}
                      </MessageResponse>
                    ))}
                </MessageContent>
              </Message>
            ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-authority-900/10 bg-white px-3 pb-3 pt-2 sm:px-4">
        {!online && (
          <output className="mb-2 block rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            <span className="font-bold">{t.chatOfflineTitle}.</span> {t.chatOfflineDesc}
          </output>
        )}
        {wallCapped && (
          <div className="mb-2 rounded-lg bg-verdict-caution-bg px-3 py-2">
            <p className="text-sm font-bold text-verdict-caution-text">{t.chatWallTitle}</p>
            <p className="text-sm text-verdict-caution-text">{t.chatWallDesc}</p>
          </div>
        )}
        {error && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-verdict-scam-bg px-3 py-2">
            <p className="flex-1 text-sm text-verdict-scam-text">{t.chatTurnFailed}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => draft && submitTurn(draft)}
              disabled={!draft}
            >
              {t.chatRetry}
            </Button>
          </div>
        )}
        <PromptInput
          accept="image/png,image/jpeg,image/webp,application/pdf"
          multiple
          maxFiles={5}
          maxFileSize={10 * 1024 * 1024}
          onError={() => toast.error(t.gateFailed)}
          onSubmit={handleSubmit}
        >
          <PromptInputTextarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t.chatComposerPh}
            disabled={wallCapped || uploading}
          />
          <PromptInputFooter>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLookup}
                disabled={!draft.trim()}
              >
                237
              </Button>
            </div>
            {streaming ? (
              <Button type="button" size="sm" variant="outline" onClick={() => stop()}>
                {t.chatStop}
              </Button>
            ) : (
              <PromptInputSubmit disabled={!draft.trim() || wallCapped || uploading || !sessionId} />
            )}
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
