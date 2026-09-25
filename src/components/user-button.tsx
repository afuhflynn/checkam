"use client";

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

export function UserButton() {
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
          type="button"
          aria-label={`${t.gateSignedInAs} ${user.name ?? user.email}`}
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Avatar.Root className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-authority-950 font-mono text-xs font-bold text-white">
            <Avatar.Image src={user.image ?? undefined} alt="" className="h-full w-full object-cover" />
            <Avatar.Fallback delayMs={300}>{initials(user.name, user.email)}</Avatar.Fallback>
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
            <p className="truncate text-sm font-bold text-ink">{user.name || user.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
          <DropdownMenu.Item asChild>
            <Link
              href="/settings"
              className="flex cursor-pointer items-center rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100 focus:bg-slate-100"
            >
              {t.gateUserMenuSettings}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={handleSignOut}
            className="flex cursor-pointer items-center rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100 focus:bg-slate-100"
          >
            {t.gateUserMenuSignOut}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
