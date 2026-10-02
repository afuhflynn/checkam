"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "../../lib/i18n/context";
import {
  CLICK_TO_CHAT_ANCHOR_ID,
  CLICK_TO_CHAT_HINT,
  CLICK_TO_CHAT_URL,
} from "../../lib/whatsapp/click-to-chat";

/**
 * The persistent chat entry point on small screens (spec 0016, AC-3, AC-11).
 *
 * Small screens only, because on a wide screen the hero button and the guide
 * button are already on the page and a second floating copy is clutter.
 *
 * When a page already shows the in page button, this one steps out of the
 * accessibility tree and out of the tab order rather than disappearing, so it
 * does not pop in and out as the visitor scrolls. A screen reader is then
 * offered the destination once, not twice. The same happens while a form field
 * has focus, so the button never sits on top of the field being typed into.
 */
export function WhatsAppFloatButton() {
  const { language, t } = useTranslation();
  const [anchorOnScreen, setAnchorOnScreen] = useState(false);
  const [fieldFocused, setFieldFocused] = useState(false);

  useEffect(() => {
    const anchor = document.getElementById(CLICK_TO_CHAT_ANCHOR_ID);
    // No anchor on this page, so this button is the only way to the
    // destination and stays fully exposed.
    if (!anchor) return;

    const observer = new IntersectionObserver(
      (entries) => setAnchorOnScreen(entries[0]?.isIntersecting ?? false),
      { rootMargin: "-88px 0px 0px 0px" },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  // A form field can scroll under a fixed button. That is ordinary behaviour
  // for a floating action, but it must never sit on top of the field someone is
  // typing into, so the button steps aside while a field has focus and comes
  // back when they leave it.
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) {
        setFieldFocused(true);
      }
    };
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as HTMLElement | null;
      if (!next?.matches("input, textarea, select, [contenteditable='true']")) {
        setFieldFocused(false);
      }
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  const hidden = anchorOnScreen || fieldFocused;

  return (
    <a
      href={CLICK_TO_CHAT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={CLICK_TO_CHAT_HINT[language]}
      // `inert` takes the link out of the accessibility tree and out of the tab
      // order while leaving its accessible content intact for when it returns.
      inert={hidden || undefined}
      className={[
        // Small screens only, and lifted clear of the home indicator on phones
        // that have one.
        "sm:hidden fixed right-4 z-40 bottom-[max(1rem,env(safe-area-inset-bottom))]",
        // py-3 plus a text-sm line clears the 44 by 44 minimum touch target.
        "inline-flex items-center gap-2 rounded-full bg-[#25D366] pl-3.5 pr-4 py-3",
        "font-sans text-sm font-bold text-white shadow-lg shadow-[#25D366]/30",
        "transition-[transform,background-color] hover:bg-[#1EBE5D] active:translate-y-px",
        "motion-reduce:transition-none motion-reduce:transform-none motion-reduce:active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-authority-900 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        hidden ? "invisible" : "visible",
      ].join(" ")}
    >
      <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{t.waFloatLabel}</span>
    </a>
  );
}
