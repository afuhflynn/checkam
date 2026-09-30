"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "../../lib/auth-client";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "../ai-elements/prompt-input";
import type { Language } from "../../lib/i18n/dictionary";
import { useTranslation } from "../../lib/i18n/context";
import {
  DossierPane,
  ThreadView,
  type LookupResult,
  type Verdict,
} from "./thread-view";
import { UserButton } from "../user-button";

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  // Accumulated pages across "More", deduped by id: keyset windows may
  // overlap at millisecond boundaries, so rows can repeat but never vanish.
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [railOpen, setRailOpen] = useState(false);
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
  const pageData = sessionsQuery.data;
  useEffect(() => {
    if (!pageData) return;
    setSessions((prev) => {
      const seen = new Set(prev.map((row) => row.id));
      const fresh = pageData.sessions.filter((row) => !seen.has(row.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, [pageData]);

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
    // An empty title is rejected rather than saved: a blank row in the rail
    // reads as a broken check, and there is no way to tell which one it was.
    if (!renaming.title.trim()) {
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
      toast.error(t.gateFailed);
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
        onRenameSubmit={submitRename}
        onRenameCancel={() => setRenaming(null)}
        onPin={() => togglePin("session", item.id, item.pinned)}
        onShare={() => shareSession(item.id)}
        onDelete={() => setConfirmDelete({ kind: "session", id: item.id })}
        onMove={(folderId) => moveSession(item.id, folderId)}
        t={{
          rename: t.chatRename,
          pin: item.pinned ? t.chatUnpin : t.chatPin,
          share: t.chatShare,
          del: t.chatDeleteSession,
          move: t.chatMoveTo,
          moveNone: t.chatMoveNone,
          actions: t.chatActions,
          save: t.chatSave,
          cancel: t.chatCancel,
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
                  className="flex flex-1 gap-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitRename();
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
                    maxLength={80}
                  />
                  <Button type="submit" size="sm">
                    {t.chatSave}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRenaming(null)}
                  >
                    {t.chatCancel}
                  </Button>
                </form>
              ) : (
                <>
                  <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">
                    {folder.name}
                  </p>
                  <Menu
                    label={t.chatFolderActions}
                    tone="light"
                    items={[
                      {
                        label: t.chatNewCheckIn,
                        onSelect: () => createSession(folder.id),
                      },
                      {
                        label: folder.pinned ? t.chatUnpin : t.chatPin,
                        onSelect: () =>
                          togglePin("folder", folder.id, folder.pinned),
                      },
                      {
                        label: t.chatRename,
                        onSelect: () =>
                          setRenaming({
                            kind: "folder",
                            id: folder.id,
                            title: folder.name,
                          }),
                      },
                      {
                        label: t.chatDeleteFolder,
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
                </>
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
        <UserButton hideChat />
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
                      {confirmDelete.count ?? 0} checks
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
                      {t.chatConfirmDelete}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}

function SessionRowView({
  item,
  folders,
  active,
  renaming,
  onOpen,
  onRename,
  onRenameChange,
  onRenameSubmit,
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
  onOpen: () => void;
  onRename: (title: string) => void;
  onRenameChange: (title: string) => void;
  onRenameSubmit: () => void;
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
    save: string;
    cancel: string;
  };
}) {
  if (renaming !== null) {
    return (
      <li>
        <form
          className="flex gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            onRenameSubmit();
          }}
          onKeyDown={(event) => {
            // Escape backs out of an edit rather than committing a title the
            // reader did not mean to set.
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
            maxLength={120}
          />
          <Button type="submit" size="sm">
            {t.save}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onRenameCancel}>
            {t.cancel}
          </Button>
        </form>
      </li>
    );
  }
  return (
    <li>
      <div
        className={`rounded-lg px-2 py-1.5 ${active ? "bg-authority-950 text-white" : "hover:bg-slate-100"}`}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpen}
            className={`min-w-0 flex-1 truncate text-left text-sm font-semibold ${active ? "text-white" : "text-slate-700"}`}
          >
            {item.pinned ? "★ " : ""}
            {item.title}
          </button>
          <Menu
            label={t.actions}
            tone={active ? "dark" : "light"}
            items={[
              { label: t.rename, onSelect: () => onRename(item.title) },
              { label: t.share, onSelect: onShare },
              { label: t.pin, onSelect: onPin },
              {
                label: t.move,
                submenu: [
                  { label: t.moveNone, onSelect: () => onMove(null) },
                  ...folders.map((folder) => ({
                    label: folder.name,
                    onSelect: () => onMove(folder.id),
                  })),
                ],
              },
              { label: t.del, onSelect: onDelete, danger: true },
            ]}
          />
        </div>
      </div>
    </li>
  );
}

// One row of real action buttons, shared by the inline desktop rail and the
// mobile dropdown so the two cannot drift apart in labels or behaviour.
function ActionList({
  items,
  tone,
}: {
  items: { label: string; onSelect?: () => void; danger?: boolean }[];
  tone: "light" | "dark";
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onSelect}
          className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${
            item.danger
              ? tone === "dark"
                ? "text-rose-300 hover:bg-white/10"
                : "text-rose-600 hover:bg-rose-50"
              : tone === "dark"
                ? "text-slate-300 hover:bg-white/10"
                : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

type MenuItem = {
  label: string;
  onSelect?: () => void;
  danger?: boolean;
  submenu?: { label: string; onSelect: () => void }[];
};

// The rail is 256px on desktop, which fits short labels inline but not four of
// them per row, and on phone it is a drawer where inline labels would push the
// titles to nothing. So desktop gets the labelled row and phone gets one button
// that opens the same labels in a dropdown. Both render MenuItem labels, so
// there is one vocabulary of actions in the product.
function Menu({
  label,
  tone,
  items,
}: {
  label: string;
  tone: "light" | "dark";
  items: MenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const flat = items.filter((item) => !item.submenu);
  const trigger = (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={() => setOpen((value) => !value)}
      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-colors md:hidden ${
        tone === "dark"
          ? "text-slate-300 hover:bg-white/10"
          : "text-slate-600 hover:bg-slate-200"
      }`}
    >
      ⋯
    </button>
  );

  if (open) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {flat.map((item) => (
            <DropdownMenuItem
              key={item.label}
              onSelect={() => {
                setOpen(false);
                item.onSelect?.();
              }}
              className={item.danger ? "text-rose-600" : undefined}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
          {items
            .filter((item) => item.submenu)
            .map((item) => (
              <DropdownMenuSub key={item.label}>
                <DropdownMenuSubTrigger>{item.label}</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {item.submenu?.map((child) => (
                      <DropdownMenuItem
                        key={child.label}
                        onSelect={() => {
                          setOpen(false);
                          child.onSelect();
                        }}
                      >
                        {child.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      {trigger}
      <div className="hidden md:block">
        <ActionList items={flat} tone={tone} />
      </div>
    </>
  );
}
