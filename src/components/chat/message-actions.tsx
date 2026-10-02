"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckIcon, CopyIcon, RotateCcwIcon } from "lucide-react";
import { MessageAction, MessageActions } from "../ai-elements/message";
import { markdownToPlainText } from "../../lib/chat/plain-text";
import { useTranslation } from "../../lib/i18n/context";

// The quiet row under a message (spec 0014). The controls are always in the
// page rather than mounted on hover, so a tap reaches them with no pointer on
// a phone and a test can find them. They come into view on hover, and on
// keyboard focus too: focus-within is what carries a keyboard reader, who would
// otherwise tab into a control the page had hidden. A device with no hover
// (any phone) keeps them visible outright.
const ROW =
  "opacity-0 transition-opacity duration-150 motion-reduce:transition-none group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100";

export function MessageActionRow({
  text,
  canReAsk,
  reAsking,
  blockedReason,
  onReAsk,
}: {
  text: string;
  canReAsk: boolean;
  reAsking: boolean;
  // Why the re ask cannot run right now, or null when it can. Set in the
  // client before any request leaves, never learned from a refusal.
  blockedReason: string | null;
  onReAsk: () => void;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      // The stored value is Markdown. A reader pasting a warning into a family
      // group must get words, never fences, bullets or asterisks.
      await navigator.clipboard.writeText(markdownToPlainText(text));
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1000);
    } catch {
      toast.error(t.copyFailed);
    }
  };

  const blocked = Boolean(blockedReason);

  // 44px on a phone, back to the thread's own compact size from sm up.
  const TARGET = "size-11 sm:size-8";

  return (
    <MessageActions className={`${ROW} -ml-1`}>
      <MessageAction
        size="icon"
        className={TARGET}
        label={copied ? t.chatCopiedMessage : t.chatCopyMessage}
        onClick={copy}
      >
        {copied ? (
          <CheckIcon className="h-4 w-4" />
        ) : (
          <CopyIcon className="h-4 w-4" />
        )}
      </MessageAction>
      {canReAsk && (
        <MessageAction
          size="icon"
          className={`${TARGET} ${blocked ? "cursor-not-allowed opacity-50" : ""}`}
          label={blocked ? (blockedReason ?? undefined) : t.chatReAsk}
          title={blocked ? (blockedReason ?? undefined) : t.chatReAsk}
          // A blocked control keeps its place in the tab order and says why,
          // rather than vanishing from reach. A control mid flight is a real
          // disabled button, so a second tap cannot even reach it.
          aria-disabled={blocked || undefined}
          aria-busy={reAsking || undefined}
          disabled={reAsking}
          onClick={() => {
            if (blocked || reAsking) return;
            onReAsk();
          }}
        >
          <RotateCcwIcon
            aria-hidden="true"
            className={
              reAsking ? "h-4 w-4 animate-spin motion-reduce:animate-none" : "h-4 w-4"
            }
          />
        </MessageAction>
      )}
    </MessageActions>
  );
}