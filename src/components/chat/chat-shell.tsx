"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "../../lib/auth-client";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import type { Language } from "../../lib/i18n/dictionary";
import { useTranslation } from "../../lib/i18n/context";
import { DossierPane, ThreadView, type LookupResult, type Verdict } from "./thread-view";

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

export function ChatShell({ locale, trial }: { locale: Language; trial: string | null }) {
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
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "session" | "folder"; id: string; count?: number } | null>(null);
  const [newFolder, setNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renaming, setRenaming] = useState<{ kind: "session" | "folder"; id: string; title: string } | null>(null);

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
    queryFn: async (): Promise<{ sessions: SessionRow[]; nextCursor: string | null }> => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/chat/sessions${params.size ? `?${params}` : ""}`);
      if (!res.ok) throw new Error("sessions_failed");
      return (await res.json()) as { sessions: SessionRow[]; nextCursor: string | null };
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

  async function createSession(folderId?: string) {
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(folderId ? { folderId } : {}),
      });
      if (res.status === 403) {
        setCapped(true);
        return;
      }
      if (!res.ok) throw new Error("create_failed");
      const data = (await res.json()) as { session: SessionRow };
      refresh();
      setActiveId(data.session.id);
      setRailOpen(false);
    } catch {
      toast.error(t.gateFailed);
    }
  }

  const deleteMutation = useMutation({
    mutationFn: async (target: { kind: "session" | "folder"; id: string }) => {
      const res = await fetch(
        target.kind === "session" ? `/api/chat/sessions/${target.id}` : `/api/chat/folders/${target.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("delete_failed");
      return (await res.json()) as { undoToken: string };
    },
    onSuccess: (data, target) => {
      if (target.kind === "session" && target.id === activeId) setActiveId(null);
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

  async function togglePin(kind: "session" | "folder", id: string, pinned: boolean) {
    const url = kind === "session" ? `/api/chat/sessions/${id}` : `/api/chat/folders/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !pinned }),
    });
    if (res.ok) refresh();
    else toast.error(t.gateFailed);
  }

  async function submitRename() {
    if (!renaming || !renaming.title.trim()) return;
    // Kind rides the rename state so a folder id absent from the rail can
    // never misroute to the session endpoint.
    const isSession = renaming.kind === "session";
    const url = isSession ? `/api/chat/sessions/${renaming.id}` : `/api/chat/folders/${renaming.id}`;
    const body = isSession ? { title: renaming.title.trim() } : { name: renaming.title.trim() };
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
        onRename={(title) => setRenaming({ kind: "session", id: item.id, title })}
        onRenameChange={(title) => setRenaming({ kind: "session", id: item.id, title })}
        onRenameSubmit={submitRename}
        onPin={() => togglePin("session", item.id, item.pinned)}
        onDelete={() => setConfirmDelete({ kind: "session", id: item.id })}
        onMove={(folderId) => moveSession(item.id, folderId)}
        t={{
          rename: t.chatRename,
          pin: item.pinned ? t.chatUnpin : t.chatPin,
          del: t.chatDeleteSession,
        }}
      />
    );
  }

  const rail = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button type="button" className="flex-1 font-bold" onClick={() => createSession()}>
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
        <Button type="button" variant="ghost" size="sm" onClick={() => setNewFolder((open) => !open)}>
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
          <Input value={folderName} onChange={(event) => setFolderName(event.target.value)} maxLength={80} />
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
                >
                  <Input
                    value={renaming.title}
                    onChange={(event) => setRenaming({ kind: "folder", id: folder.id, title: event.target.value })}
                    maxLength={80}
                  />
                  <Button type="submit" size="sm">
                    OK
                  </Button>
                </form>
              ) : (
                <>
                  <p className="flex-1 truncate text-sm font-bold text-slate-800">{folder.name}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t.chatNewChat}
                    title={t.chatNewChat}
                    onClick={() => createSession(folder.id)}
                  >
                    +
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={folder.pinned ? t.chatUnpin : t.chatPin}
                    onClick={() => togglePin("folder", folder.id, folder.pinned)}
                  >
                    {folder.pinned ? "★" : "☆"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t.chatRename}
                    onClick={() => setRenaming({ kind: "folder", id: folder.id, title: folder.name })}
                  >
                    ✎
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t.chatDeleteFolder}
                    onClick={() =>
                      setConfirmDelete({
                        kind: "folder",
                        id: folder.id,
                        count: sessions.filter((s) => s.folderId === folder.id).length,
                      })
                    }
                  >
                    ✕
                  </Button>
                </>
              )}
            </div>
            <ul className="mt-1 space-y-0.5">
              {sessions.filter((s) => s.folderId === folder.id).map((item) => sessionRow(item))}
            </ul>
          </section>
        ))}
        {sessions.filter((s) => !s.folderId).length > 0 && (
          <section aria-label="unfiled">
            <ul className="space-y-0.5">
              {sessions.filter((s) => !s.folderId).map((item) => sessionRow(item))}
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
      <Link
        href="/settings"
        className="flex items-center gap-2.5 rounded-xl border border-authority-900/10 bg-white px-2.5 py-2 hover:bg-slate-50"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-authority-950 font-mono text-[11px] font-bold text-white">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-ink">{name}</span>
          <span className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
            {t.gateUserMenuSettings}
          </span>
        </span>
      </Link>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-7xl gap-4 px-4 py-4 sm:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <Button type="button" variant="outline" size="sm" onClick={() => setRailOpen((open) => !open)}>
          ☰
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setDossierOpen((open) => !open)}>
          ❖
        </Button>
      </div>
      <aside
        className={`${railOpen ? "fixed inset-y-0 left-0 z-40 w-72 bg-paper p-4" : "hidden"} md:static md:block md:w-64 md:shrink-0`}
        aria-label={t.chatFolders}
      >
        {rail}
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-authority-900/10 bg-white">
        {!activeId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="font-display text-2xl font-black text-ink">{t.chatEmptyTitle}</p>
            <p className="text-sm text-slate-500">{t.chatEmptySub}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  await createSession();
                }}
              >
                {t.chatSampleText}
              </Button>
              <Button type="button" variant="outline" onClick={() => createSession()}>
                {t.chatSampleFlyer}
              </Button>
              <Button type="button" variant="outline" onClick={() => createSession()}>
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
            wallCapped={wallCapped}
            onWall={() => {
              setCapped(true);
              refresh();
            }}
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
        className={`${dossierOpen ? "fixed inset-y-0 right-0 z-40 w-80 overflow-y-auto bg-paper p-4" : "hidden"} lg:static lg:block lg:w-80 lg:shrink-0`}
        aria-label={t.chatDossierTitle}
      >
        <DossierPane verdict={verdict} sealed={sealed} fallbackText={fallback} lookup={lookup} />
      </aside>

      <Dialog.Root open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2">
            <Card>
              <CardContent className="space-y-3 p-5">
                <Dialog.Title className="font-display text-lg font-black text-ink">
                  {confirmDelete?.kind === "folder" ? t.chatDeleteFolder : t.chatDeleteSession}
                </Dialog.Title>
                {confirmDelete?.kind === "folder" && (
                  <Dialog.Description className="text-sm text-slate-500">
                    {confirmDelete.count ?? 0} checks
                  </Dialog.Description>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setConfirmDelete(null)}>
                    {t.chatCancel}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
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
  onPin,
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
  onPin: () => void;
  onDelete: () => void;
  onMove: (folderId: string | null) => void;
  t: { rename: string; pin: string; del: string };
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
        >
          <Input value={renaming} onChange={(event) => onRenameChange(event.target.value)} maxLength={120} />
          <Button type="submit" size="sm">
            OK
          </Button>
        </form>
      </li>
    );
  }
  return (
    <li>
      <div
        className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 ${active ? "bg-authority-950 text-white" : "hover:bg-slate-100"}`}
      >
        <button
          type="button"
          onClick={onOpen}
          className={`flex-1 truncate text-left text-sm font-semibold ${active ? "text-white" : "text-slate-700"}`}
        >
          {item.pinned ? "★ " : ""}
          {item.title}
        </button>
        <button
          type="button"
          aria-label={t.pin}
          onClick={onPin}
          className={`text-xs ${active ? "text-slate-300" : "text-slate-400"}`}
        >
          {item.pinned ? "★" : "☆"}
        </button>
        <button
          type="button"
          aria-label={t.rename}
          onClick={() => onRename(item.title)}
          className={`text-xs ${active ? "text-slate-300" : "text-slate-400"}`}
        >
          ✎
        </button>
        <button
          type="button"
          aria-label={t.del}
          onClick={onDelete}
          className={`text-xs ${active ? "text-slate-300" : "text-slate-400"}`}
        >
          ✕
        </button>
        <select
          aria-label="folder"
          value={item.folderId ?? ""}
          onChange={(event) => onMove(event.target.value || null)}
          className={`max-w-20 truncate rounded bg-transparent text-xs ${active ? "text-slate-300" : "text-slate-400"}`}
        >
          <option value="">≣</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}
