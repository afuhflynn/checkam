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
import {
  Message,
  MessageContent,
  MessageResponse,
} from "../ai-elements/message";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "../ai-elements/sources";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "../ai-elements/prompt-input";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  FacebookIcon,
  MessageCircleIcon,
  Share2Icon,
} from "lucide-react";
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
  category: string;
  bullets: string[];
  tones?: ("warning" | "reassuring" | "neutral")[];
  safetyNote?: string;
  // Two renderings of one notice. WhatsApp honours *bold*; Facebook and X
  // print the asterisks literally, so those platforms get shareTextPlain.
  shareText?: string;
  shareTextPlain?: string;
  verificationId: string;
  sources?: { title: string; url: string }[];
}

export interface LookupResult {
  normalized: string;
  flagged: { riskLevel: string; category: string } | null;
  reports: { slug: string; title: string }[];
}

const OFFLINE_KEY = "checkam-offline-queue";

// Binds the StickToBottom scroll element out to a ref so paging can read
// heights and hold position across prepends.
function ScrollBinder({
  target,
}: {
  target: React.RefObject<HTMLElement | null>;
}) {
  const { scrollRef } = useStickToBottomContext();
  useEffect(() => {
    target.current = scrollRef.current;
  });
  return null;
}

async function rehydrateVerdict(
  sessionId: string,
  verificationId: string,
  locale: Language,
): Promise<Verdict | null> {
  try {
    const params = new URLSearchParams({ sessionId, verificationId, locale });
    const res = await fetch(`/api/chat/verdict?${params}`);
    if (!res.ok) return null;
    const data = (await res.json()) as Verdict | null;
    return data ?? null;
  } catch {
    // The pane keeps showing the message text, which is an honest fallback.
    return null;
  }
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

// One palette for all three verdicts, so the pane reads the same on a live
// turn and after a reload.
function verdictTheme(verdict: string) {
  if (verdict === "HIGH_RISK") {
    return {
      card: "border-verdict-scam-border bg-verdict-scam-bg",
      chip: "bg-verdict-scam-badge text-white",
      label: "text-verdict-scam-text",
      body: "text-verdict-scam-text",
      score: "text-verdict-scam-badge",
    };
  }
  if (verdict === "VERIFIED_OFFICIAL") {
    return {
      card: "border-verdict-verified-border bg-verdict-verified-bg",
      chip: "bg-verdict-verified-badge text-white",
      label: "text-verdict-verified-text",
      body: "text-verdict-verified-text",
      score: "text-verdict-verified-badge",
    };
  }
  return {
    card: "border-verdict-caution-border bg-verdict-caution-bg",
    chip: "bg-verdict-caution-badge text-white",
    label: "text-verdict-caution-text",
    body: "text-verdict-caution-text",
    score: "text-verdict-caution-badge",
  };
}

const VERDICT_LABEL: Record<
  string,
  "verdictHighRisk" | "verdictCaution" | "verdictOfficial"
> = {
  HIGH_RISK: "verdictHighRisk",
  CAUTION: "verdictCaution",
  VERIFIED_OFFICIAL: "verdictOfficial",
};

function ShareBlock({ verdict }: { verdict: Verdict }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const shareText = verdict.shareText;
  if (!shareText) return null;

  const open = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success(t.chatShareCopied);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(t.copyFailed);
    }
  };

  // Facebook and X have no markdown, so they receive the bare rendering.
  const plain = verdict.shareTextPlain || shareText;

  return (
    <div className="space-y-3 rounded-xl border border-authority-900/10 bg-white p-3">
      <div>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {t.chatShareTitle}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {t.chatShareDesc}
        </p>
      </div>
      <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 font-sans text-xs leading-relaxed text-slate-700">
        {shareText}
      </pre>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="whatsapp"
          className="gap-1.5 font-sans font-semibold"
          onClick={() =>
            open(`https://wa.me/?text=${encodeURIComponent(shareText)}`)
          }
        >
          <MessageCircleIcon className="h-4 w-4" />
          {t.chatShareWhatsapp}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 font-sans font-semibold"
          onClick={() =>
            open(
              `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(plain)}`,
            )
          }
        >
          <FacebookIcon className="h-4 w-4" />
          {t.chatShareFacebook}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 font-sans font-semibold"
          onClick={() =>
            open(
              `https://twitter.com/intent/tweet?text=${encodeURIComponent(plain)}&url=${encodeURIComponent("https://checkam.cm")}`,
            )
          }
        >
          <Share2Icon className="h-4 w-4" />
          {t.chatShareX}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-1.5"
          onClick={copy}
        >
          {copied ? (
            <CheckIcon className="h-4 w-4" />
          ) : (
            <CopyIcon className="h-4 w-4" />
          )}
          {copied ? t.chatShareCopied : t.chatShareCopy}
        </Button>
      </div>
    </div>
  );
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

  if (!verdict) {
    return (
      <Card className="border-2 border-authority-900/10 bg-white">
        <CardContent className="space-y-3 p-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {t.chatDossierTitle}
          </p>
          <p className="text-sm leading-relaxed text-slate-700">
            {fallbackText}
          </p>
          {lookup && (
            <p className="text-sm text-slate-700">
              {lookup.normalized} -{" "}
              {lookup.flagged ? lookup.flagged.riskLevel : "clean"}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const theme = verdictTheme(verdict.verdict);
  const labelKey = VERDICT_LABEL[verdict.verdict] ?? "verdictCaution";

  return (
    <Card className={`border-2 ${theme.card} verdict-in`}>
      <CardContent className="space-y-4 p-4">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {t.chatDossierTitle}
        </p>

        {/*
          The seal used to be one rotated line of display type, "Verdict
          sealed: CAUTION · 15". In a 300px sidebar it wrapped to two lines and
          the rotation pushed it into the card edge, which is what read as
          broken rendering. The badge and the score are now separate blocks,
          upright, and the rotation is gone.
        */}
        <div className="flex items-start justify-between gap-3">
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 font-sans text-[11px] font-bold uppercase tracking-wide ${theme.chip}`}
          >
            {sealed && <span aria-hidden="true">✓</span>}
            {t[labelKey]}
          </span>
          <div className="shrink-0 text-right">
            <div
              className={`font-display text-2xl font-black leading-none ${theme.score}`}
            >
              {verdict.score}
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-500">
              {t.chatRiskScore}
            </div>
          </div>
        </div>

        {verdict.bullets.length > 0 && (
          <div className="space-y-2">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {t.chatWhatWeFound}
            </p>
            <ul className="space-y-1.5">
              {verdict.bullets.map((bullet, index) => {
                const tone = verdict.tones?.[index] ?? "warning";
                return (
                  <li
                    key={`${index}-${bullet.slice(0, 24)}`}
                    className="flex gap-2 text-sm"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 font-mono text-xs font-bold ${
                        tone === "reassuring"
                          ? "text-verdict-verified-badge"
                          : "text-slate-400"
                      }`}
                    >
                      {tone === "reassuring" ? "✓" : "•"}
                    </span>
                    <span className="leading-relaxed text-slate-700">
                      {bullet}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {verdict.safetyNote && (
          <div className="rounded-lg bg-white/70 p-3">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {t.chatNextStep}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {verdict.safetyNote}
            </p>
          </div>
        )}

        {verdict.sources && verdict.sources.length > 0 && (
          <Sources>
            <SourcesTrigger count={verdict.sources.length}>
              <p className="text-sm font-semibold text-slate-700">
                {t.chatSourcesTitle}
              </p>
              <ChevronDownIcon className="h-4 w-4 text-slate-500" />
            </SourcesTrigger>
            <SourcesContent>
              {verdict.sources.map((source) => (
                <Source key={source.url} href={source.url} title={source.title}>
                  {source.title}
                </Source>
              ))}
            </SourcesContent>
          </Sources>
        )}

        <ShareBlock verdict={verdict} />

        {lookup && (
          <p className="text-sm text-slate-700">
            {lookup.normalized} -{" "}
            {lookup.flagged ? lookup.flagged.riskLevel : "clean"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Compact verdict plus share, sitting in the message flow. The evidence
// dossier lives in the side pane, which is desktop first and collapses behind a
// toggle on a phone, so this is the surface that actually reaches people on
// the networks they would actually forward a warning over.
export function InlineVerdict({ verdict }: { verdict: Verdict | null }) {
  if (!verdict) return null;
  const theme = verdictTheme(verdict.verdict);
  const labelKey = VERDICT_LABEL[verdict.verdict] ?? "verdictCaution";
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const shareText = verdict.shareText;
  if (!shareText) return null;
  const plain = verdict.shareTextPlain || shareText;

  const open = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success(t.chatShareCopied);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(t.copyFailed);
    }
  };

  return (
    <div className={`rounded-2xl border-2 p-3 ${theme.card}`}>
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-sans text-[11px] font-bold uppercase tracking-wide ${theme.chip}`}
        >
          {t[labelKey]}
        </span>
        <span
          className={`font-display text-xl font-black leading-none ${theme.score}`}
        >
          {verdict.score}
          <span className="ml-1 font-sans text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t.chatRiskScore}
          </span>
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="whatsapp"
          className="gap-1.5 font-sans font-semibold"
          onClick={() =>
            open(`https://wa.me/?text=${encodeURIComponent(shareText)}`)
          }
        >
          <MessageCircleIcon className="h-4 w-4" />
          {t.chatShareWhatsapp}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 bg-white font-sans font-semibold"
          onClick={() =>
            open(
              `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(plain)}`,
            )
          }
        >
          <FacebookIcon className="h-4 w-4" />
          {t.chatShareFacebook}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 bg-white font-sans font-semibold"
          onClick={() =>
            open(
              `https://twitter.com/intent/tweet?text=${encodeURIComponent(plain)}&url=${encodeURIComponent("https://checkam.cm")}`,
            )
          }
        >
          <Share2Icon className="h-4 w-4" />
          {t.chatShareX}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-1.5"
          onClick={copy}
        >
          {copied ? (
            <CheckIcon className="h-4 w-4" />
          ) : (
            <CopyIcon className="h-4 w-4" />
          )}
          {copied ? t.chatShareCopied : t.chatShareCopy}
        </Button>
      </div>
    </div>
  );
}

export function ThreadView({
  sessionId,
  locale,
  initialDraft,
  pendingSend,
  onPendingSent,
  wallCapped,
  onWall,
  verdict,
  onVerdict,
  onLookup,
  onFallback,
}: {
  sessionId: string | null;
  locale: Language;
  initialDraft: string | null;
  pendingSend: string | null;
  onPendingSent: () => void;
  wallCapped: boolean;
  onWall: () => void;
  verdict: Verdict | null;
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
  const callbacks = useRef({
    onVerdict,
    onLookup,
    onFallback,
    failedCopy: t.gateFailed,
    initialDraft,
  });
  callbacks.current = {
    onVerdict,
    onLookup,
    onFallback,
    failedCopy: t.gateFailed,
    initialDraft,
  };
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
  const oldestSeq = mounted.length ? (mounted[0]?.seq ?? null) : null;

  const fetchPage = useCallback(
    async (
      before: number | null,
    ): Promise<{ rows: ThreadItem[]; more: boolean }> => {
      const params = new URLSearchParams();
      if (before !== null) params.set("before", String(before));
      const res = await fetch(
        `/api/chat/sessions/${sessionId}/messages${params.size ? `?${params}` : ""}`,
      );
      if (!res.ok) throw new Error("thread_failed");
      const data = (await res.json()) as {
        messages: ThreadItem[];
        hasMore: boolean;
      };
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
      const lastAssistant = [...rows]
        .reverse()
        .find((row) => row.role === "assistant");
      callbacks.current.onFallback(lastAssistant ? lastAssistant.text : null);
      // Without this the pane sat on the raw text fallback until the next
      // message was sent, so a reload silently lost a verdict the user had
      // already been shown.
      if (lastAssistant?.verificationId) {
        void rehydrateVerdict(
          sessionId,
          lastAssistant.verificationId,
          locale,
        ).then((payload) => {
          // Only overwrite if the fetch landed, so the text card stays visible
          // instead of flashing empty on a slow round trip.
          if (payload) callbacks.current.onVerdict(payload, false);
        });
      }
      void fetchPage;
    } catch {
      toast.error(callbacks.current.failedCopy);
    }
  }, [sessionId, fetchPage, locale]);

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
      const res = await fetch(
        `/api/chat/sessions/${sessionId}/messages?${params}`,
      );
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
      const lastAssistant = [...data.messages]
        .reverse()
        .find((row) => row.role === "assistant");
      if (lastAssistant) {
        callbacks.current.onFallback(lastAssistant.text);
        if (lastAssistant.verificationId) {
          void rehydrateVerdict(
            sessionId,
            lastAssistant.verificationId,
            locale,
          ).then((payload) => {
            if (payload) callbacks.current.onVerdict(payload, true);
          });
        }
      }
    } catch {
      // Poll backup absorbs transient failures on its next round.
    }
  }, [sessionId, locale]);

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

  const sentPending = useRef<string | null>(null);
  const pendingSentRef = useRef(onPendingSent);
  pendingSentRef.current = onPendingSent;
  useEffect(() => {
    if (mounted.length !== 0) return;
    if (pendingSend && sessionId && sentPending.current !== pendingSend) {
      sentPending.current = pendingSend;
      pendingSentRef.current();
      void submitTurn(pendingSend);
      return;
    }
    if (callbacks.current.initialDraft) {
      setDraft((current) => current || callbacks.current.initialDraft || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSend, sessionId, mounted.length]);

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
          const res = await fetch("/api/chat/upload", {
            method: "POST",
            body: form,
          });
          if (!res.ok) throw new Error("upload_failed");
          const data = (await res.json()) as {
            file: { key: string; mimeType: string; bytes: number };
          };
          keys.push({
            key: data.file.key,
            mime: data.file.mimeType,
            bytes: data.file.bytes,
          });
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
      const res = await fetch(
        `/api/chat/lookup?phone=${encodeURIComponent(draft.trim())}`,
      );
      if (!res.ok) throw new Error("lookup_failed");
      const data = (await res.json()) as LookupResult;
      onLookup(data);
    } catch {
      toast.error(t.gateFailed);
    }
  }

  const visiblePersisted =
    inFlightSeq === null
      ? mounted
      : mounted.filter((row) => row.seq < inFlightSeq);
  const streaming = status === "streaming" || status === "submitted";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ScrollBinder target={scrollEl} />
        <ConversationContent className="items-center">
          <div className="flex w-full max-w-3xl flex-col gap-8">
            {hasMoreUp && mounted.length > 0 && (
              <div
                ref={sentinelRef}
                aria-hidden="true"
                className="flex justify-center py-2"
              >
                {loadingUp && (
                  <span className="font-mono text-[11px] text-slate-400">
                    ···
                  </span>
                )}
              </div>
            )}
            {visiblePersisted.length === 0 && !streaming && (
              <ConversationEmptyState
                title={t.chatEmptyTitle}
                description={t.chatEmptySub}
              />
            )}
            {visiblePersisted.map((row, rowIndex) => {
              const isLastAssistant =
                row.role === "assistant" &&
                rowIndex === visiblePersisted.length - 1 &&
                !streaming;
              return (
                <Message
                  key={row.id}
                  from={row.role === "user" ? "user" : "assistant"}
                >
                  <MessageContent>
                    <MessageResponse className="font-sans text-sm leading-relaxed text-slate-800">
                      {row.text}
                    </MessageResponse>
                    {isLastAssistant && <InlineVerdict verdict={verdict} />}
                  </MessageContent>
                </Message>
              );
            })}
            {streaming &&
              messages.map((message) => (
                <Message
                  key={message.id}
                  from={message.role === "user" ? "user" : "assistant"}
                >
                  <MessageContent>
                    {message.parts
                      .filter((part) => part.type === "text")
                      .map((part, index) => (
                        <MessageResponse
                          key={`${message.id}-${index}`}
                          className="font-sans text-sm leading-relaxed text-slate-800"
                        >
                          {"text" in part ? part.text : ""}
                        </MessageResponse>
                      ))}
                  </MessageContent>
                </Message>
              ))}
          </div>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-authority-900/10 bg-white px-3 pb-3 pt-2 sm:px-4">
        <div className="mx-auto w-full max-w-3xl">
          {!online && (
            <output className="mb-2 block rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
              <span className="font-bold">{t.chatOfflineTitle}.</span>{" "}
              {t.chatOfflineDesc}
            </output>
          )}
          {wallCapped && (
            <div className="mb-2 rounded-lg bg-verdict-caution-bg px-3 py-2">
              <p className="text-sm font-bold text-verdict-caution-text">
                {t.chatWallTitle}
              </p>
              <p className="text-sm text-verdict-caution-text">
                {t.chatWallDesc}
              </p>
            </div>
          )}
          {error && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-verdict-scam-bg px-3 py-2">
              <p className="flex-1 text-sm text-verdict-scam-text">
                {t.chatTurnFailed}
              </p>
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
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => stop()}
                >
                  {t.chatStop}
                </Button>
              ) : (
                <PromptInputSubmit
                  disabled={
                    !draft.trim() || wallCapped || uploading || !sessionId
                  }
                />
              )}
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
