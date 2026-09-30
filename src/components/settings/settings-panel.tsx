"use client";

import { parseAsString, useQueryState } from "nuqs";
import { useEffect } from "react";
import {
  forwardRef,
  useImperativeHandle,
  type RefObject,
  useCallback,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { PANEL_KEY, PANEL_SETTINGS, panelParam } from "@/lib/search-params";
import { useTranslation } from "@/lib/i18n/context";
import { SettingsForm } from "./settings-form";

export interface SettingsPanelHandle {
  /** Open the panel, pushing a history entry so Back closes it. */
  open: () => void;
}

/**
 * The settings dialog and the panel parameter that opens it.
 *
 * This lives in its own component, and the chat shell wraps it in a `Suspense`
 * boundary, for two reasons. The hook below can suspend, and a boundary that
 * enclosed the shell would put the thread behind a fallback while it does, which
 * is the one thing the panel is not allowed to do. And keeping the URL write
 * here means the address bar stays the single source of truth for whether the
 * panel is open, with no second copy of that answer in component state: the
 * shell asks for it to open through the handle rather than holding a boolean of
 * its own.
 *
 * There is deliberately no `DialogTrigger`. The control that opens this is a
 * menu item, and menu items unmount when their menu closes, so a trigger would
 * have nothing left to hand focus back to on close.
 */
export const SettingsPanelHost = forwardRef<
  SettingsPanelHandle,
  { triggerRef: RefObject<HTMLButtonElement | null> }
>(function SettingsPanelHost({ triggerRef }, ref) {
  const { t } = useTranslation();
  const [panel, setPanel] = useQueryState(PANEL_KEY, panelParam);
  // The same key read with a permissive parser, so the unrecognised value is
  // still visible. A typed parser returns `null` both for an absent parameter
  // and for one it rejects, which means on its own it cannot tell "no panel"
  // from "a panel nobody recognises", and a mistyped link would sit in the
  // address bar wrong forever. Reading the raw value alongside it is what lets
  // the link repair itself after one visit.
  const [rawPanel] = useQueryState(PANEL_KEY, parseAsString);
  const open = panel === PANEL_SETTINGS;

  useEffect(() => {
    if (panel !== null) return;
    if (rawPanel === null) return;
    void setPanel(null, { history: "replace" });
  }, [panel, rawPanel, setPanel]);

  const openPanel = useCallback(() => {
    // Already open, so return without writing. The trigger is a button whose own
    // click does this, and the menu behind it can also deliver a synthesised
    // click on pointer up. Each write here is a push, so a second one would stack
    // a duplicate history entry and ask the reader to press Back twice.
    if (open) return;
    void setPanel(PANEL_SETTINGS, { history: "push" });
  }, [open, setPanel]);

  useImperativeHandle(ref, () => ({ open: openPanel }), [openPanel]);

  const close = useCallback(() => {
    // Replace rather than push. A push here would put the closed state on the
    // history stack, so the Back button would reopen settings instead of
    // leaving the thread.
    void setPanel(null, { history: "replace" });
  }, [setPanel]);

  if (!open) return null;

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent
        closeLabel={t.dialogClose}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
        // The body behind a dialog is scroll locked, so the content scrolls
        // itself. Without a ceiling the password fields sit off the bottom of a
        // short phone and cannot be reached at all.
        className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg motion-reduce:animate-none!"
      >
        <DialogHeader>
          <DialogTitle>{t.settingsTitle}</DialogTitle>
          <DialogDescription>{t.settingsSub}</DialogDescription>
        </DialogHeader>
        <SettingsForm />
      </DialogContent>
    </Dialog>
  );
});
