"use client";

import type { RefObject } from "react";
import * as Avatar from "@radix-ui/react-avatar";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { authClient } from "../lib/auth-client";
import { useTranslation } from "../lib/i18n/context";

function initials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

/**
 * `settingsHref` is where the settings item goes when it is a link. It defaults
 * to `/settings`, which is the cross surface deep link and what every surface
 * outside chat wants.
 *
 * `onOpenSettings` exists because a link is the wrong control inside the chat
 * rail. Following one would navigate, which unmounts the thread, refires its
 * queries and loses the scroll position, undoing the reason settings is a
 * dialog there. When it is supplied the item stops being a link and calls it
 * instead, so the two paths are explicitly different rather than accidentally
 * the same.
 */
export function UserButton({
  hideChat = false,
  settingsHref = "/settings",
  onOpenSettings,
  triggerRef,
}: {
  hideChat?: boolean;
  settingsHref?: string;
  onOpenSettings?: () => void;
  /**
   * Handed out so a dialog opened from this menu can put focus back here. The
   * menu item that opened it does not survive the menu closing, so without this
   * focus has nowhere to return to.
   */
  triggerRef?: RefObject<HTMLButtonElement | null>;
}) {
  const { data: session, isPending } = authClient.useSession();
  const { t } = useTranslation();

  if (isPending) return null;
  if (!session?.user) {
    return (
      <Link
        href="/signin"
        className="rounded-lg bg-authority-950 px-3.5 py-2 text-sm font-bold text-white hover:bg-authority-900"
      >
        {t.gateSignInBtn}
      </Link>
    );
  }

  const user = session.user;

  async function handleSignOut() {
    await authClient.signOut();
    window.location.href = "/";
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={`${t.gateSignedInAs} ${user.name ?? user.email}`}
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Avatar.Root className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-authority-950 font-mono text-xs font-bold text-white">
            <Avatar.Image
              src={user.image ?? undefined}
              alt=""
              className="h-full w-full object-cover"
            />
            <Avatar.Fallback delayMs={300}>
              {initials(user.name, user.email)}
            </Avatar.Fallback>
          </Avatar.Root>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          <div className="px-2.5 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {t.gateSignedInAs}
            </p>
            <p className="truncate text-sm font-bold text-ink">
              {user.name || user.email}
            </p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
          {!hideChat ? (
            <DropdownMenu.Item asChild>
              <Link
                href="/chat"
                className="flex cursor-pointer items-center rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100 focus:bg-slate-100"
              >
                {t.navChat}
              </Link>
            </DropdownMenu.Item>
          ) : null}
          {onOpenSettings ? (
            <DropdownMenu.Item
              onSelect={onOpenSettings}
              className="flex cursor-pointer items-center rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100 focus:bg-slate-100"
            >
              {t.gateUserMenuSettings}
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item asChild>
              <Link
                href={settingsHref}
                className="flex cursor-pointer items-center rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100 focus:bg-slate-100"
              >
                {t.gateUserMenuSettings}
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item
            onSelect={handleSignOut}
            className="flex cursor-pointer items-center rounded-lg px-2.5 py-2 text-sm font-semibold text-red-700 outline-none hover:bg-red-100 focus:bg-red-100"
          >
            {t.gateUserMenuSignOut}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
