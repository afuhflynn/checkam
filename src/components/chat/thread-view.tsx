"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
      void queryClient.invalidateQueries({ queryKey: ["chat", "thread", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["chat", "sessions"] });
    },
    onError: () => {
      toast.error(t.chatTurnFailed);
    },
  });

  // Thread reads through the query key, so the onFinish invalidation
  // below actually refetches instead of going stale.
  const threadQuery = useQuery({
    queryKey: ["chat", "thread", sessionId],
    staleTime: 30_000,
    enabled: sessionId !== null,
    queryFn: async (): Promise<ThreadItem[]> => {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`);
      if (!res.ok) throw new Error("thread_failed");
      return ((await res.json()) as { messages: ThreadItem[] }).messages;
    },
  });
  const persisted = threadQuery.data ?? [];

  // Reset local turn state when the session changes. The keyed query
  // refetches the thread on its own; this only clears the old screen.
  const lastSession = useRef<string | null>(null);
  useEffect(() => {
    if (lastSession.current === sessionId) return;
    lastSession.current = sessionId;
    setDraft("");
    setInFlightSeq(null);
    const { onVerdict, onLookup, onFallback, failedCopy } = callbacks.current;
    onVerdict(null, false);
    onLookup(null);
    onFallback(null);
    if (threadQuery.error) toast.error(failedCopy);
  }, [sessionId, threadQuery.error]);

  useEffect(() => {
    if (!threadQuery.data) return;
    const lastAssistant = [...threadQuery.data]
      .reverse()
      .find((row) => row.role === "assistant");
    callbacks.current.onFallback(lastAssistant ? lastAssistant.text : null);
    if (threadQuery.data.length === 0 && callbacks.current.initialDraft) {
      setDraft((current) => current || callbacks.current.initialDraft || "");
    }
  }, [threadQuery.data]);

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
    inFlightSeq === null ? persisted : persisted.filter((row) => row.seq < inFlightSeq);
  const streaming = status === "streaming" || status === "submitted";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
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
