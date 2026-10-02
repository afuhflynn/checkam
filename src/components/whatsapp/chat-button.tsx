"use client";

import { MessageCircle } from "lucide-react";
import { useTranslation } from "../../lib/i18n/context";
import { cn } from "../../lib/utils";
import {
  CLICK_TO_CHAT_HINT,
  CLICK_TO_CHAT_LABEL,
  CLICK_TO_CHAT_URL,
} from "../../lib/whatsapp/click-to-chat";

/**
 * The chat entry point (spec 0016, AC-1, AC-9, AC-10).
 *
 * A real link, not a click handler, because it navigates somewhere and the
 * browser should be able to open it in a new tab, copy it, and show the
 * destination on hover. The icon is decorative and hidden from assistive
 * technology; the name comes from `CLICK_TO_CHAT_HINT`, so a screen reader hears
 * where the link goes rather than the instruction alone.
 */
export function WhatsAppChatButton({
  variant = "solid",
  className,
  id,
}: {
  /** `solid` is the primary action on a page, `outline` sits beside it. */
  variant?: "solid" | "outline";
  className?: string;
  /** Lets the float button know when this button is already on screen. */
  id?: string;
}) {
  const { language } = useTranslation();

  return (
    <a
      id={id}
      href={CLICK_TO_CHAT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={CLICK_TO_CHAT_HINT[language]}
      className={cn(
        "group inline-flex w-full items-center justify-center gap-2.5 rounded-2xl px-8 py-6 font-sans text-base font-bold shadow-xl transition-transform sm:w-auto",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-authority-900 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        "motion-reduce:transition-none motion-reduce:transform-none",
        variant === "solid"
          ? "bg-[#25D366] text-white shadow-[#25D366]/25 hover:bg-[#1EBE5D] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
          : "border border-slate-300 bg-transparent text-slate-700 hover:border-[#25D366] hover:bg-white hover:text-ink",
        className,
      )}
    >
      <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{CLICK_TO_CHAT_LABEL[language]}</span>
    </a>
  );
}
