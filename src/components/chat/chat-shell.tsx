"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Ellipsis,
  FolderInput,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Share2,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "../../lib/auth-client";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "../ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import type { Language } from "../../lib/i18n/dictionary";
import { useTranslation } from "../../lib/i18n/context";
import {
  DossierPane,
  ThreadView,
  type LookupResult,
  type Verdict,
} from "./thread-view";
import { UserButton } from "../user-button";
import {
  SettingsPanelHost,
  type SettingsPanelHandle,
} from "../settings/settings-panel";

interface Folder {
  id: string;
  name: string;
  pinned: boolean;
  updatedAt: string;
}

interface SessionRow {
  id: string;
  title: string;
  folderId: string | null;
  pinned: boolean;
  updatedAt: string;
}

const ACTIVE_SESSION_KEY = "checkam-active-session";

function readActiveSession(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

function writeActiveSession(id: string): void {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
  } catch {
    // A blocked storage quota just means we reopen the newest check instead.
  }
}

export function ChatShell({
  locale,
  trial,
  deepLinkId,
}: {
  locale: Language;
  trial: string | null;
  deepLinkId?: string | null;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: authSession } = authClient.useSession();
  const signedIn = Boolean(authSession?.user);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  // Accumulated pages across "More", deduped by id: keyset windows may
  // overlap at millisecond boundaries, so rows can repeat but never vanish.
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [railOpen, setRailOpen] = useState(false);
  // The panel's open state lives in the URL, not here. The shell only holds a
  // handle to ask for it to open, which is what lets the phone drawer close in
  // the same beat without the address bar gaining a second source of truth.
  const settingsPanelRef = useRef<SettingsPanelHandle>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [sealed, setSealed] = useState(false);
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);
  const [capped, setCapped] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: "session" | "folder";
    id: string;
    count?: number;
  } | null>(null);
  const [newFolder, setNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renaming, setRenaming] = useState<{
    kind: "session" | "folder";
    id: string;
    title: string;
  } | null>(null);
  const [pendingSend, setPendingSend] = useState<string | null>(null);
  const [emptyDraft, setEmptyDraft] = useState(trial ?? "");

  async function startWithText(text: string) {
    const id = await createSession();
    if (id) setPendingSend(text);
  }

  const foldersQuery = useQuery({
    queryKey: ["chat", "folders"],
    staleTime: 30_000,
    refetchInterval: 30_000,
    queryFn: async (): Promise<Folder[]> => {
      const res = await fetch("/api/chat/folders");
      if (!res.ok) throw new Error("folders_failed");
      return ((await res.json()) as { folders: Folder[] }).folders;
    },
  });

  const sessionsQuery = useQuery({
    queryKey: ["chat", "sessions", search, cursor],
    staleTime: 30_000,
    refetchInterval: 30_000,
    queryFn: async (): Promise<{
      sessions: SessionRow[];
      nextCursor: string | null;
    }> => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(
        `/api/chat/sessions${params.size ? `?${params}` : ""}`,
      );
      if (!res.ok) throw new Error("sessions_failed");
      return (await res.json()) as {
        sessions: SessionRow[];
        nextCursor: string | null;
      };
    },
  });

  // Fold each fetched page into the rail, deduped. New searches and mutations reset.
  // The fetch generation is a dependency in its own right, not decoration. The
  // query hands back the very same data object when a refetch returns rows that
  // are deeply equal, and a folder level action such as pinning is exactly that:
  // it reorders folders but leaves every check row untouched. Keyed on the data
  // alone, this effect would not re-run after the rail was emptied, so the checks
  // would stay gone until a page reload brought the component back up.
  const pageData = sessionsQuery.data;
  const railFetchGeneration = sessionsQuery.dataUpdatedAt;
  // biome-ignore lint/correctness/useExhaustiveDependencies: the generation is a deliberate re-run trigger, the body does not read it
  useEffect(() => {
    if (!pageData) return;
    setSessions((prev) => {
      const seen = new Set(prev.map((row) => row.id));
      const fresh = pageData.sessions.filter((row) => !seen.has(row.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, [pageData, railFetchGeneration]);

  const nextCursor = sessionsQuery.data?.nextCursor ?? null;

  // A shared link arrives as ?s=<id>. The rail is cursor paged, so the shared
  // check is usually not in the first page: fetch it, drop it into the rail so
  // the title and actions work, and open it. The 404 path is silent on purpose,
  // a dead link should fall through to the normal "your last check" restore
  // rather than dead end on an error.
  const deepLinkRef = useRef(false);
  useEffect(() => {
    if (deepLinkRef.current || !deepLinkId) return;
    deepLinkRef.current = true;
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/chat/sessions/${deepLinkId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { session: SessionRow };
      if (cancelled) return;
      setSessions((prev) =>
        prev.some((row) => row.id === data.session.id)
          ? prev
          : [data.session, ...prev],
      );
      setActiveId(data.session.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [deepLinkId]);

  // A delete in one tab has to close a menu or a half typed rename in the
  // others, so the rail listens for it. The post carries only a kind and an
  // id, never content, and BroadcastChannel never leaves one browser profile,
  // so it cannot cross an account boundary. The 30 second poll stays the
  // backstop for anything this misses.
  const railChannelRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("checkam-chat-invalidation");
    channel.onmessage = (event: MessageEvent<{ kind?: string; id?: string }>) => {
      const id = event.data?.id;
      if (event.data?.kind !== "deleted" || !id) return;
      // Drop an in flight edit on a row that no longer exists anywhere.
      setRenaming((current) => (current && current.id === id ? null : current));
      setConfirmDelete((current) => (current && current.id === id ? null : current));
      resetRail();
      void queryClient.invalidateQueries({ queryKey: ["chat", "folders"] });
    };
    railChannelRef.current = channel;
    return () => {
      channel.close();
      railChannelRef.current = null;
    };
  }, [queryClient]);

  // Reopen the thread on load. activeId used to start null and only ever got
  // set by clicking the rail or creating a check, so every page load dropped
  // the reader back on the empty state with an empty dossier, even mid
  // conversation. The last opened check is remembered; otherwise the most
  // recent one is picked so a reload never looks like data loss.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || activeId || !sessions.length) return;
    restoredRef.current = true;
    const remembered = readActiveSession();
    const target =
      remembered && sessions.some((s) => s.id === remembered)
        ? remembered
        : sessions[0]?.id;
    if (target) setActiveId(target);
  }, [sessions, activeId]);

  useEffect(() => {
    if (activeId) writeActiveSession(activeId);
  }, [activeId]);

  function openSettingsPanel() {
    // The rail is a full screen drawer on a phone and the avatar that opens
    // settings lives inside it, so the drawer closes first or it is left hanging
    // behind the dialog.
    setRailOpen(false);
    settingsPanelRef.current?.open();
  }

  function resetRail() {
    setCursor(null);
    setSessions([]);
    void queryClient.invalidateQueries({ queryKey: ["chat", "sessions"] });
  }

  const counterQuery = useQuery({
    queryKey: ["chat", "counter"],
    queryFn: async (): Promise<{ triesLeft: number; capped: boolean }> => {
      const res = await fetch("/api/chat/guest-counter");
      if (!res.ok) throw new Error("counter_failed");
      return (await res.json()) as { triesLeft: number; capped: boolean };
    },
    refetchInterval: 60_000,
  });

  const wallCapped = capped || (counterQuery.data?.capped ?? false);

  function refresh() {
    resetRail();
    void queryClient.invalidateQueries({ queryKey: ["chat", "folders"] });
    void queryClient.invalidateQueries({ queryKey: ["chat", "counter"] });
  }

  async function createSession(folderId?: string): Promise<string | null> {
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(folderId ? { folderId } : {}),
      });
      if (res.status === 403) {
        setCapped(true);
        return null;
      }
      if (!res.ok) throw new Error("create_failed");
      const data = (await res.json()) as { session: SessionRow };
      refresh();
      setActiveId(data.session.id);
      setRailOpen(false);
      return data.session.id;
    } catch {
      toast.error(t.gateFailed);
      return null;
    }
  }

  const deleteMutation = useMutation({
    mutationFn: async (target: { kind: "session" | "folder"; id: string }) => {
      const res = await fetch(
        target.kind === "session"
          ? `/api/chat/sessions/${target.id}`
          : `/api/chat/folders/${target.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("delete_failed");
      railChannelRef.current?.postMessage({ kind: "deleted", id: target.id });
      return (await res.json()) as { undoToken: string };
    },
    onSuccess: (data, target) => {
      if (target.kind === "session" && target.id === activeId)
        setActiveId(null);
      refresh();
      toast.success(t.chatDeleted, {
        action: {
          label: t.chatUndo,
          onClick: async () => {
            const res = await fetch("/api/chat/restore", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: data.undoToken }),
            });
            if (res.ok) {
              toast.success(t.chatRestored);
              refresh();
            } else {
              toast.error(t.gateFailed);
            }
          },
        },
      });
      setConfirmDelete(null);
    },
    onError: () => toast.error(t.gateFailed),
  });

  // Share copies a link that opens this check. The id goes in the query so the
  // reader lands on the same immersive chat shell rather than a stripped page,
  // and the route reads it back through the scoped GET above. Session only:
  // a folder is just a grouping of the reader's own checks, and there is no
  // folder view to land on, so offering it would copy a link that opens
  // something other than what the label promised.
  async function shareSession(id: string) {
    const url = new URL("/chat", window.location.origin);
    url.searchParams.set("s", id);
    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success(t.chatShareCopied);
    } catch {
      toast.error(t.gateFailed);
    }
  }

  async function togglePin(
    kind: "session" | "folder",
    id: string,
    pinned: boolean,
  ) {
    const url =
      kind === "session"
        ? `/api/chat/sessions/${id}`
        : `/api/chat/folders/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !pinned }),
    });
    if (res.ok) refresh();
    else toast.error(t.gateFailed);
  }

  async function submitRename() {
    if (!renaming) return;
    // Nothing is sent until the edit is finished. An empty title is refused
    // rather than saved: a blank row in the rail reads as a broken check, and
    // there is no way to tell which one it was. Closing the field restores the
    // previous title because nothing was ever written.
    if (!renaming.title.trim()) {
      setRenaming(null);
      toast.error(t.chatRenameEmpty);
      return;
    }
    // Kind rides the rename state so a folder id absent from the rail can
    // never misroute to the session endpoint.
    const isSession = renaming.kind === "session";
    const url = isSession
      ? `/api/chat/sessions/${renaming.id}`
      : `/api/chat/folders/${renaming.id}`;
    const body = isSession
      ? { title: renaming.title.trim() }
      : { name: renaming.title.trim() };
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setRenaming(null);
      refresh();
    } else {
      // Same outcome as an empty title: the row goes back to what the server
      // still holds, and says why. A distinct string from the empty case, so
      // "you left it blank" is never confused with "the save did not land".
      setRenaming(null);
      toast.error(t.chatRenameFailed);
    }
  }

  async function submitFolder() {
    if (!folderName.trim()) return;
    const res = await fetch("/api/chat/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: folderName.trim() }),
    });
    if (res.ok) {
      setFolderName("");
      setNewFolder(false);
      refresh();
    } else {
      toast.error(t.gateFailed);
    }
  }

  const folders = foldersQuery.data ?? [];
  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  async function moveSession(id: string, folderId: string | null) {
    const res = await fetch(`/api/chat/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });
    if (res.ok) refresh();
    else toast.error(t.gateFailed);
  }

  function sessionRow(item: SessionRow) {
    return (
      <SessionRowView
        key={item.id}
        item={item}
        folders={folders}
        active={item.id === activeId}
        renaming={renaming?.id === item.id ? renaming.title : null}
        signedIn={signedIn}
        onOpen={() => {
          setActiveId(item.id);
          setRailOpen(false);
        }}
        onRename={(title) =>
          setRenaming({ kind: "session", id: item.id, title })
        }
        onRenameChange={(title) =>
          setRenaming({ kind: "session", id: item.id, title })
        }
        onRenameCommit={() => void submitRename()}
        onRenameCancel={() => setRenaming(null)}
        onPin={() => togglePin("session", item.id, item.pinned)}
        onShare={() => shareSession(item.id)}
        onDelete={() => setConfirmDelete({ kind: "session", id: item.id })}
        onMove={(folderId) => moveSession(item.id, folderId)}
        t={{
          rename: t.chatRename,
          pin: item.pinned ? t.chatUnpin : t.chatPin,
          share: t.chatShare,
          del: t.chatDelete,
          move: t.chatMoveTo,
          moveNone: t.chatMoveNone,
          actions: t.chatActions,
          pinned: t.chatPinnedCheck,
          empty: t.chatRenameEmpty,
          failed: t.chatRenameFailed,
        }}
      />
    );
  }

  const rail = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          className="flex-1 font-bold"
          onClick={() => createSession()}
        >
          {t.chatNewChat}
        </Button>
      </div>
      <Input
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setCursor(null);
          setSessions([]);
        }}
        placeholder={t.chatSearchPh}
      />
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {t.chatFolders}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setNewFolder((open) => !open)}
        >
          {t.chatNewFolder}
        </Button>
      </div>
      {newFolder && (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void submitFolder();
          }}
        >
          <Input
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            maxLength={80}
          />
          <Button type="submit" size="sm">
            OK
          </Button>
        </form>
      )}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        {folders.map((folder) => (
          <section key={folder.id} aria-label={folder.name}>
            <div className="group flex items-center gap-1">
              {renaming?.id === folder.id ? (
                <form
                  className="flex flex-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitRename();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setRenaming(null);
                    }
                  }}
                >
                  <Input
                    autoFocus
                    aria-label={t.chatRename}
                    value={renaming.title}
                    onChange={(event) =>
                      setRenaming({
                        kind: "folder",
                        id: folder.id,
                        title: event.target.value,
                      })
                    }
                    onBlur={submitRename}
                    size={Math.max(8, renaming.title.length + 1)}
                    maxLength={80}
                    className="w-auto min-w-0 max-w-full font-bold"
                  />
                </form>
              ) : (
                <div className="group flex min-w-0 flex-1 items-center rounded-lg px-1 py-0.5 hover:bg-slate-100">
                  <PinnedMark pinned={folder.pinned} label={t.chatPinnedFolder} />
                  <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">
                    {folder.name}
                  </p>
                  <RowMenu
                    label={t.chatFolderActions}
                    alwaysVisible={false}
                    entries={[
                      {
                        label: t.chatNewCheckIn,
                        icon: Plus,
                        onSelect: () => createSession(folder.id),
                      },
                      {
                        label: folder.pinned ? t.chatUnpin : t.chatPin,
                        icon: folder.pinned ? PinOff : Pin,
                        onSelect: () => togglePin("folder", folder.id, folder.pinned),
                      },
                      {
                        label: t.chatRename,
                        icon: Pencil,
                        onSelect: () =>
                          setRenaming({
                            kind: "folder",
                            id: folder.id,
                            title: folder.name,
                          }),
                      },
                      {
                        label: t.chatDelete,
                        icon: Trash2,
                        danger: true,
                        onSelect: () =>
                          setConfirmDelete({
                            kind: "folder",
                            id: folder.id,
                            count: sessions.filter(
                              (s) => s.folderId === folder.id,
                            ).length,
                          }),
                      },
                    ]}
                  />
                </div>
              )}
            </div>
            <ul className="mt-1 space-y-0.5">
              {sessions
                .filter((s) => s.folderId === folder.id)
                .map((item) => sessionRow(item))}
            </ul>
          </section>
        ))}
        {sessions.filter((s) => !s.folderId).length > 0 && (
          <section aria-label="unfiled">
            <ul className="space-y-0.5">
              {sessions
                .filter((s) => !s.folderId)
                .map((item) => sessionRow(item))}
            </ul>
          </section>
        )}
      </div>
      {nextCursor && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={sessionsQuery.isFetching}
          onClick={() => setCursor(nextCursor)}
        >
          {t.chatMore}
        </Button>
      )}
      {!wallCapped && counterQuery.data && (
        <p className="text-xs text-slate-500">
          {counterQuery.data.triesLeft} {t.chatTriesLeft}
        </p>
      )}
      <UserCard />
    </div>
  );

  function UserCard() {
    const { data: session } = authClient.useSession();
    if (!session?.user) {
      return (
        <Link
          href="/signin"
          className="rounded-lg bg-authority-950 px-3 py-2 text-center text-sm font-bold text-white"
        >
          {t.gateSignInBtn}
        </Link>
      );
    }
    const name = session.user.name || session.user.email;
    const initials = (session.user.name?.trim() || session.user.email || "?")
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-authority-900/10 bg-white px-2.5 py-2 hover:bg-slate-50">
        <UserButton
          hideChat
          onOpenSettings={openSettingsPanel}
          triggerRef={settingsTriggerRef}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-ink">
            {name}
          </span>
          <span className="block font-mono text-[10px] tracking-wider text-slate-400">
            {session?.user?.email}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full flex-col bg-paper">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-authority-900/10 px-3 md:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRailOpen((open) => !open)}
        >
          ☰
        </Button>
        <p className="flex-1 truncate text-center font-display text-base font-black text-ink">
          CheckAm
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDossierOpen((open) => !open)}
        >
          ❖
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 gap-0 md:gap-3 md:p-3">
        <aside
          className={`${railOpen ? "fixed inset-y-0 left-0 z-40 w-72 border-r border-authority-900/10 bg-paper p-4" : "hidden"} md:static md:block md:w-64 md:shrink-0`}
          aria-label={t.chatFolders}
        >
          {rail}
        </aside>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white md:rounded-2xl md:border md:border-authority-900/10">
          {!activeId ? (
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
                {t.gateKicker}
              </p>
              <p className="font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">
                {t.chatEmptyTitle}
              </p>
              <p className="max-w-md text-sm text-slate-500">
                {t.chatEmptySub}
              </p>
              <div className="w-full">
                <PromptInput
                  onSubmit={(message) => {
                    if (message.text.trim())
                      void startWithText(message.text.trim());
                  }}
                >
                  <PromptInputTextarea
                    value={emptyDraft}
                    onChange={(event) => setEmptyDraft(event.target.value)}
                    placeholder={t.chatComposerPh}
                  />
                  <PromptInputFooter>
                    <span className="font-mono text-[11px] text-slate-400">
                      {!wallCapped && counterQuery.data
                        ? `${counterQuery.data.triesLeft} ${t.chatTriesLeft}`
                        : ""}
                    </span>
                    <PromptInputSubmit disabled={!emptyDraft.trim()} />
                  </PromptInputFooter>
                </PromptInput>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => startWithText(t.chatSampleTextFill)}
                >
                  {t.chatSampleText}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => createSession()}
                >
                  {t.chatSampleFlyer}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => startWithText(t.chatSamplePhoneFill)}
                >
                  {t.chatSamplePhone}
                </Button>
              </div>
            </div>
          ) : (
            <ThreadView
              key={activeId}
              sessionId={activeId}
              locale={locale}
              initialDraft={trial}
              pendingSend={pendingSend}
              onPendingSent={() => setPendingSend(null)}
              wallCapped={wallCapped}
              onWall={() => {
                setCapped(true);
                refresh();
              }}
              verdict={verdict}
              onVerdict={(next, nextSealed) => {
                setVerdict(next);
                setSealed(nextSealed);
              }}
              onLookup={setLookup}
              onFallback={setFallback}
            />
          )}
          {activeSession && (
            <p className="border-t border-authority-900/5 px-4 py-1.5 font-mono text-[11px] text-slate-400">
              {activeSession.title}
            </p>
          )}
        </main>
        <aside
          className={`${dossierOpen ? "fixed inset-y-0 right-0 z-40 w-80 overflow-y-auto border-l border-authority-900/10 bg-paper p-4" : "hidden"} lg:static lg:block lg:w-80 lg:shrink-0`}
          aria-label={t.chatDossierTitle}
        >
          <DossierPane
            verdict={verdict}
            sealed={sealed}
            fallbackText={fallback}
            lookup={lookup}
          />
        </aside>

        <Dialog.Root
          open={confirmDelete !== null}
          onOpenChange={(open) => !open && setConfirmDelete(null)}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2">
              <Card>
                <CardContent className="space-y-3 p-5">
                  <Dialog.Title className="font-display text-lg font-black text-ink">
                    {confirmDelete?.kind === "folder"
                      ? t.chatDeleteFolder
                      : t.chatDeleteSession}
                  </Dialog.Title>
                  {confirmDelete?.kind === "folder" && (
                    <Dialog.Description className="text-sm text-slate-500">
                      {/* Lower bound, not a total: the rail only holds what it
                          has paged in, so saying "and more" is honest where a
                          bare number would look exact and be wrong. */}
                      {(
                        (confirmDelete.count ?? 0) === 1
                          ? t.chatFolderCheckCountOne
                          : t.chatFolderCheckCount
                      )
                        .replace("{count}", String(confirmDelete.count ?? 0))
                        .replace("{more}", t.chatFolderCheckCountMore)}
                    </Dialog.Description>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirmDelete(null)}
                    >
                      {t.chatCancel}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() =>
                        confirmDelete && deleteMutation.mutate(confirmDelete)
                      }
                    >
                      {t.chatDelete}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      {/* Beside the thread rather than inside it, and inside a boundary of its
          own so the shell's own hook cannot put the thread behind a fallback. */}
      <Suspense fallback={null}>
        <SettingsPanelHost ref={settingsPanelRef} triggerRef={settingsTriggerRef} />
      </Suspense>
    </div>
  );
}

function SessionRowView({
  item,
  folders,
  active,
  renaming,
  signedIn,
  onOpen,
  onRename,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  onPin,
  onShare,
  onDelete,
  onMove,
  t,
}: {
  item: SessionRow;
  folders: Folder[];
  active: boolean;
  renaming: string | null;
  signedIn: boolean;
  onOpen: () => void;
  onRename: (title: string) => void;
  onRenameChange: (title: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onPin: () => void;
  onShare: () => void;
  onDelete: () => void;
  onMove: (folderId: string | null) => void;
  t: {
    rename: string;
    pin: string;
    share: string;
    del: string;
    move: string;
    moveNone: string;
    actions: string;
    pinned: string;
    empty: string;
    failed: string;
  };
}) {
  // Rename is the field in place of the title, with no buttons: it grows as
  // you type so nothing is hidden, stops at the row's own width and scrolls
  // past that. Input hardcodes w-full, so w-auto is required for the size
  // attribute to drive the width at all.
  if (renaming !== null) {
    return (
      <li>
        <form
          className="flex"
          onSubmit={(event) => {
            event.preventDefault();
            onRenameCommit();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onRenameCancel();
            }
          }}
        >
          <Input
            autoFocus
            aria-label={t.rename}
            value={renaming}
            onChange={(event) => onRenameChange(event.target.value)}
            onBlur={onRenameCommit}
            size={Math.max(8, renaming.length + 1)}
            maxLength={120}
            className="w-auto min-w-0 max-w-full font-semibold"
          />
        </form>
      </li>
    );
  }

  const entries: RowMenuEntry[] = [
    { label: t.rename, icon: Pencil, onSelect: () => onRename(item.title) },
    { label: t.share, icon: Share2, onSelect: onShare },
    { label: t.pin, icon: item.pinned ? PinOff : Pin, onSelect: onPin },
  ];
  // Moving a check into a folder is refused for guests by the route, so the
  // item is hidden rather than offered and then rejected.
  if (signedIn) {
    entries.push({
      label: t.move,
      icon: FolderInput,
      submenu: [
        { label: t.moveNone, onSelect: () => onMove(null) },
        ...folders.map((folder) => ({
          label: folder.name,
          // The current folder is shown so the list is honest about where the
          // check lives, but not selectable, so it cannot be a no-op write.
          disabled: folder.id === item.folderId,
          onSelect: () => onMove(folder.id),
        })),
      ],
    });
  }
  entries.push({ label: t.del, icon: Trash2, onSelect: onDelete, danger: true });

  return (
    <li>
      <div
        className={`group flex items-center rounded-lg px-2 py-1.5 ${
          active ? "bg-authority-950 text-white" : "hover:bg-slate-100"
        }`}
      >
        <PinnedMark pinned={item.pinned} label={t.pinned} />
        <button
          type="button"
          onClick={onOpen}
          className={`min-w-0 flex-1 truncate text-left text-sm font-semibold ${
            active ? "text-white" : "text-slate-700"
          }`}
        >
          {item.title}
        </button>
        <RowMenu label={t.actions} alwaysVisible={active} entries={entries} />
      </div>
    </li>
  );
}

type RowMenuEntry = {
  label: string;
  icon?: LucideIcon;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
  submenu?: RowMenuEntry[];
};

function RowMenuLabel({ entry }: { entry: RowMenuEntry }) {
  const Icon = entry.icon;
  return (
    <>
      {Icon ? <Icon className="size-4" aria-hidden /> : null}
      {entry.label}
    </>
  );
}

// One menu root per row, built on the project wrapper. Deliberately holds no
// open state of its own. The earlier build kept a local flag beside the
// primitive's own, which left the menu permanently shut on a phone while
// still reporting aria-expanded as true. Radix owns open; this owns the items.
function RowMenu({
  label,
  alwaysVisible,
  entries,
}: {
  label: string;
  alwaysVisible: boolean;
  entries: RowMenuEntry[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          // Always in the DOM and always focusable. Hidden with opacity alone
          // and never unmounted, so Tab reaches it on every row even before a
          // pointer has ever touched the rail.
          className={cn(
            "shrink-0 rounded-md p-1 transition-opacity",
            "focus-visible:opacity-100 data-[state=open]:opacity-100",
            alwaysVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <Ellipsis className="size-4" aria-hidden />
          <span className="sr-only">{label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="motion-reduce:animate-none!">
        {entries.map((entry) =>
          entry.submenu ? (
            <DropdownMenuSub key={entry.label}>
              <DropdownMenuSubTrigger>
                {entry.icon ? <entry.icon className="size-4" aria-hidden /> : null}
                {entry.label}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="motion-reduce:animate-none!">
                {entry.submenu.map((child) => (
                  <DropdownMenuItem
                    key={child.label}
                    disabled={child.disabled}
                    onSelect={child.onSelect}
                    className={cn(child.disabled && "opacity-60")}
                  >
                    <RowMenuLabel entry={child} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : (
            <DropdownMenuItem
              key={entry.label}
              disabled={entry.disabled}
              onSelect={entry.onSelect}
              className={cn(entry.danger && "text-rose-600")}
            >
              <RowMenuLabel entry={entry} />
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// The pinned marker sits in its own fixed width column so it never steals
// pixels from the title, and carries a screen reader label so the state is
// never carried by the shape of an icon alone.
function PinnedMark({ pinned, label }: { pinned: boolean; label: string }) {
  return (
    <span className="flex w-4 shrink-0 items-center justify-center" aria-hidden={!pinned}>
      {pinned ? (
        <>
          <Star className="size-3.5 fill-current" aria-hidden />
          <span className="sr-only">{label}</span>
        </>
      ) : null}
    </span>
  );
}
