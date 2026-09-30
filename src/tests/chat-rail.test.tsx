/**
 * @vitest-environment happy-dom
 *
 * Component tests for the chat rail action menu (spec 0013).
 *
 * Scope note, read before trusting a green run: happy-dom has no layout engine
 * and no stylesheet, so anything measured in pixels or read off a Tailwind
 * class is out of reach here. Title width, the hover and focus reveal, the
 * reduced motion behaviour and the escape from the rail's scroll container are
 * all verified by hand in a real browser instead. What is locked in below is
 * everything that is a fact about the DOM and the requests the rail makes.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster, toast } from "sonner";
import { LanguageProvider } from "../lib/i18n/context";
import { ChatShell } from "../components/chat/chat-shell";

interface Row {
  id: string;
  title: string;
  folderId: string | null;
  pinned: boolean;
  updatedAt: string;
  deletedAt?: string | null;
}
interface Folder {
  id: string;
  name: string;
  pinned: boolean;
  updatedAt: string;
}

const auth = vi.hoisted(() => ({ signedIn: true }));

vi.mock("../lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: auth.signedIn ? { user: { id: "u1", email: "reader@example.com" } } : null,
    }),
  },
}));
// The thread, the dossier, the composer and the account menu are not what this
// file is about. Stubbing them keeps the rail the only thing under test.
vi.mock("../components/chat/thread-view", () => ({
  DossierPane: () => null,
  ThreadView: () => null,
}));
vi.mock("../components/user-button", () => ({ UserButton: () => null }));
vi.mock("../components/ai-elements/prompt-input", () => ({
  PromptInput: () => null,
  PromptInputFooter: () => null,
  PromptInputSubmit: () => null,
  PromptInputTextarea: () => null,
}));
vi.mock("next/link", () => ({
  default: ({ children }: { children?: unknown }) => children,
}));

let folders: Folder[] = [];
let sessions: Row[] = [];
let sessionReads = 0;
let writes: { method: string; url: string; body: unknown }[] = [];

// The real routes order pinned first, then most recently touched. The fake
// mirrors that so the rail is handed rows in the order production would send
// them, instead of an order this file invented.
const byPinnedThenRecent = <T extends { pinned: boolean; updatedAt: string }>(a: T, b: T) => {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return a.updatedAt < b.updatedAt ? 1 : -1;
};

function body(data: unknown) {
  // A fresh object every call, the way a real response body arrives. React Query
  // compares what it gets against what it holds, and that comparison is the
  // whole reason the rail once came back empty.
  return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(data)) };
}

function installFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      const payload = init?.body ? JSON.parse(String(init.body)) : undefined;
      // Recorded up front so every write is captured, not only the ones that
      // fall through to the not found branch below.
      if (method !== "GET") writes.push({ method, url, body: payload });

      if (url.startsWith("/api/chat/folders")) {
        if (method === "GET") return body({ folders: [...folders].sort(byPinnedThenRecent) });
        if (method === "POST") {
          const folder: Folder = {
            id: `f${folders.length + 1}`,
            name: String(payload.name),
            pinned: false,
            updatedAt: new Date(2026, 0, 1).toISOString(),
          };
          folders.push(folder);
          return body({ folder });
        }
        const id = url.split("/").pop() as string;
        if (method === "PATCH") {
          const folder = folders.find((f) => f.id === id);
          if (folder) Object.assign(folder, payload, { updatedAt: new Date().toISOString() });
          return body({ folder });
        }
      }

      if (url.startsWith("/api/chat/sessions")) {
        if (method === "GET") {
          sessionReads += 1;
          return body({
            sessions: sessions.filter((s) => !s.deletedAt).sort(byPinnedThenRecent),
            nextCursor: null,
          });
        }
        if (method === "POST") return body({ id: "s-new" });
        const id = url.split("/").pop() as string;
        if (method === "PATCH") {
          const row = sessions.find((s) => s.id === id);
          if (row) Object.assign(row, payload, { updatedAt: new Date().toISOString() });
          return body({ session: row });
        }
        if (method === "DELETE") {
          const row = sessions.find((s) => s.id === id);
          if (row) row.deletedAt = new Date().toISOString();
          return body({ deleted: true, undoToken: "token" });
        }
      }

      if (url.startsWith("/api/chat/restore") && method === "POST") {
        const row = sessions.find((s) => s.id === String(payload?.token).split(":").pop());
        if (row) row.deletedAt = null;
        return body({ restored: true });
      }

      return { ok: false, status: 404, json: async () => ({ error: "not_found" }) };
    }),
  );
}

function seed() {
  folders = [
    { id: "f1", name: "Rent", pinned: false, updatedAt: "2026-01-02T00:00:00.000Z" },
    { id: "f2", name: "Factures", pinned: false, updatedAt: "2026-01-03T00:00:00.000Z" },
  ];
  sessions = [
    { id: "s1", title: "Alpha", folderId: null, pinned: false, updatedAt: "2026-01-05T00:00:00.000Z" },
    { id: "s2", title: "Bravo", folderId: null, pinned: false, updatedAt: "2026-01-04T00:00:00.000Z" },
    { id: "s3", title: "Charlie", folderId: null, pinned: false, updatedAt: "2026-01-03T00:00:00.000Z" },
    { id: "s4", title: "Rent one", folderId: "f1", pinned: false, updatedAt: "2026-01-02T00:00:00.000Z" },
    { id: "s5", title: "Invoice one", folderId: "f2", pinned: false, updatedAt: "2026-01-01T00:00:00.000Z" },
  ];
}

function renderRail() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0, refetchOnWindowFocus: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider initialLanguage="en">
        <ChatShell locale="en" trial={null} deepLinkId={null} />
        {/* Mounted so the toast text is assertable. The rail leans on toasts to
            tell a reader why a write did not land, which makes them part of the
            behaviour rather than decoration. */}
        <Toaster />
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

const section = (name: string) =>
  document.querySelector(`section[aria-label="${name}"]`) as HTMLElement;

const rowsIn = (host: HTMLElement) => [...host.querySelectorAll("li")];

const folderNamed = (name: string): Folder => {
  const folder = folders.find((f) => f.name === name);
  if (!folder) throw new Error(`no folder named ${name}`);
  return folder;
};

const rowNamed = (title: string): Row => {
  const row = sessions.find((s) => s.title === title);
  if (!row) throw new Error(`no check titled ${title}`);
  return row;
};

const rowAt = (host: HTMLElement, index: number): HTMLElement => {
  const row = rowsIn(host)[index];
  if (!row) throw new Error(`no row at index ${index} in this section`);
  return row;
};

const titleOf = (li: HTMLElement) =>
  (li.querySelector("button")?.textContent ?? "").trim();

const triggerOf = (li: HTMLElement) => {
  const buttons = [...li.querySelectorAll("button")];
  return buttons[buttons.length - 1] as HTMLButtonElement;
};

async function railIsReady() {
  await waitFor(() => expect(rowsIn(section("unfiled"))).toHaveLength(3));
  await waitFor(() => expect(rowsIn(section("Rent"))).toHaveLength(1));
}

async function openMenu(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  return screen.findByRole("menu");
}

const menuItemNames = () =>
  screen.getAllByRole("menuitem").map((el) => el.textContent?.trim() ?? "");

beforeAll(() => {
  // Radix reaches for these and happy-dom does not ship them.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
  if (!("PointerEvent" in globalThis)) {
    globalThis.PointerEvent = class extends MouseEvent {} as unknown as typeof PointerEvent;
  }
});

beforeEach(() => {
  seed();
  sessionReads = 0;
  writes = [];
  auth.signedIn = true;
  installFetch();
});

afterEach(() => {
  // Sonner keeps its toasts in a module level store that outlives unmount, so
  // without this a message from the previous test is still on screen and the
  // next one cannot tell its own words apart.
  toast.dismiss();
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Rail row actions (spec 0013)", () => {
  it("covers: AC-2 every check row keeps a focusable action trigger in the DOM", async () => {
    renderRail();
    await railIsReady();
    for (const li of rowsIn(section("unfiled"))) {
      const trigger = triggerOf(li);
      expect(trigger.tagName).toBe("BUTTON");
      // Present and reachable without a pointer: never unmounted, never removed
      // from the tab order, only hidden by styling this file cannot see.
      expect(trigger.isConnected).toBe(true);
      expect(trigger.tabIndex).toBeGreaterThanOrEqual(0);
      expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
      // The name rides along as text, so the icon is never the only signal.
      expect(trigger.textContent?.trim()).toBe("Actions");
    }
  });

  it("covers: AC-3 the row menu is labelled, not a row of bare symbols", async () => {
    renderRail();
    await railIsReady();
    await openMenu(triggerOf(rowAt(section("unfiled"), 0)));
    expect(menuItemNames()).toEqual(["Rename", "Share", "Pin", "Move to", "Delete"]);
  });

  it("covers: AC-10 the Move to submenu lists No folder first and locks the current folder", async () => {
    renderRail();
    await railIsReady();
    await openMenu(triggerOf(rowAt(section("Rent"), 0)));
    const moveTo = screen.getByRole("menuitem", { name: /Move to/ });
    fireEvent.keyDown(moveTo, { key: "ArrowRight" });

    // The submenu is a second menu, so read that one rather than the parent.
    await waitFor(() => expect(document.querySelectorAll('[role="menu"]').length).toBe(2));
    const submenu = document.querySelectorAll('[role="menu"]')[1] as HTMLElement;
    const items = [...submenu.querySelectorAll('[role="menuitem"]')];
    const names = items.map((el) => el.textContent?.trim() ?? "");
    // No folder leads, so clearing a check's folder is always one step away.
    expect(names).toEqual(["No folder", "Factures", "Rent"]);
    // The check already lives in Rent, so it is shown for honesty but cannot be
    // chosen, which would otherwise be a write that changes nothing.
    const current = items[2];
    if (!current) throw new Error("the submenu lost its last folder");
    expect(current.getAttribute("aria-disabled")).toBe("true");
  });

  it("covers: AC-10 a guest is never offered Move to", async () => {
    auth.signedIn = false;
    renderRail();
    await railIsReady();
    await openMenu(triggerOf(rowAt(section("unfiled"), 0)));
    expect(menuItemNames()).toEqual(["Rename", "Share", "Pin", "Delete"]);
  });

  it("covers: AC-11 a folder offers New check here, Rename, Pin and Delete, and never Share", async () => {
    renderRail();
    await railIsReady();
    const folderTrigger = document.querySelector(
      'section[aria-label="Rent"] > div button[aria-haspopup="menu"]',
    ) as HTMLElement;
    await openMenu(folderTrigger);
    expect(menuItemNames()).toEqual(["New check here", "Pin", "Rename", "Delete"]);
    expect(menuItemNames()).not.toContain("Share");
  });

  it("covers: AC-11 a pinned folder offers Unpin instead of Pin", async () => {
    folderNamed("Rent").pinned = true;
    renderRail();
    await railIsReady();
    const folderTrigger = document.querySelector(
      'section[aria-label="Rent"] > div button[aria-haspopup="menu"]',
    ) as HTMLElement;
    await openMenu(folderTrigger);
    expect(menuItemNames()).toContain("Unpin");
    expect(menuItemNames()).not.toContain("Pin");
  });

  it("covers: AC-8 a pinned check is announced as pinned from its own column", async () => {
    rowNamed("Alpha").pinned = true;
    renderRail();
    await railIsReady();
    const li = rowAt(section("unfiled"), 0);
    expect(titleOf(li)).toBe("Alpha");
    // The announcement sits beside the title, not inside it, so a screen reader
    // hears the state and the name as two things rather than one run-on title.
    expect(li.textContent).toContain("Pinned");
    expect(titleOf(li)).not.toContain("Pinned");
  });

  it("covers: AC-8 and AC-11 pinning a folder leaves every check row in place", async () => {
    // This is the regression that broke both criteria. A folder action reorders
    // folders and touches no check row, so the refetch that follows comes back
    // deep-equal to the one already held. The rail used to empty itself and stay
    // empty until a reload, because the refill only ran when the fetched data
    // arrived as a new object, which an unchanged refetch never is.
    renderRail();
    await railIsReady();
    const before = rowsIn(section("unfiled")).map(titleOf);
    expect(before).toHaveLength(3);
    const readsBefore = sessionReads;

    const folderTrigger = document.querySelector(
      'section[aria-label="Factures"] > div button[aria-haspopup="menu"]',
    ) as HTMLElement;
    await openMenu(folderTrigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Pin" }));

    await waitFor(() => {
      expect(writes.some((w) => w.method === "PATCH" && w.url === "/api/chat/folders/f2")).toBe(true);
    });
    // The write landed, and the rows the write must not have touched are all
    // still on screen, without a reload.
    expect(folderNamed("Factures").pinned).toBe(true);
    // The rail has to be refilled by a fresh read, not left over from before, so
    // the read is part of what is under test. Without it the rows below could
    // simply be the ones that never left.
    await waitFor(() => expect(sessionReads).toBeGreaterThan(readsBefore));
    await waitFor(() => {
      expect(rowsIn(section("unfiled")).map(titleOf)).toEqual(before);
    });
    expect(rowsIn(section("unfiled"))).toHaveLength(3);
    expect(rowsIn(section("Rent"))).toHaveLength(1);
  });

  it("covers: AC-5 rename swaps the title for a field and offers no buttons", async () => {
    renderRail();
    await railIsReady();
    const li = rowAt(section("unfiled"), 0);
    await openMenu(triggerOf(li));
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));

    const field = await screen.findByRole("textbox", { name: "Rename" });
    expect(field).toHaveProperty("value", "Alpha");
    // The width pressure that sank the previous design was two buttons in a
    // 256 pixel row, so committing happens on blur or Enter and nothing else.
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("covers: AC-5 Escape restores the title and writes nothing", async () => {
    renderRail();
    await railIsReady();
    const li = rowAt(section("unfiled"), 0);
    await openMenu(triggerOf(li));
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));

    const field = await screen.findByRole("textbox", { name: "Rename" });
    fireEvent.change(field, { target: { value: "Renamed in a hurry" } });
    fireEvent.keyDown(field, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Rename" })).toBeNull());
    expect(titleOf(rowAt(section("unfiled"), 0))).toBe("Alpha");
    expect(writes.some((w) => w.method === "PATCH")).toBe(false);
  });

  it("covers: AC-15 the icon carries no name of its own", async () => {
    renderRail();
    await railIsReady();
    const li = rowAt(section("unfiled"), 0);
    const icon = li.querySelector("button[aria-haspopup='menu'] svg");
    expect(icon).not.toBeNull();
    // The label beside the icon already says what it does. A second name on the
    // icon would make a screen reader say it twice.
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(icon?.querySelector("title")).toBeNull();
  });

  it("covers: AC-6 clearing the field sends nothing and says why", async () => {
    renderRail();
    await railIsReady();
    await openMenu(triggerOf(rowAt(section("unfiled"), 0)));
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));

    const field = await screen.findByRole("textbox", { name: "Rename" });
    fireEvent.change(field, { target: { value: "" } });
    fireEvent.blur(field);

    await waitFor(() =>
      expect(document.body.textContent).toContain("Give the check a name before saving."),
    );
    // A blank row in the rail reads as a broken check, so an empty title is
    // refused at the edge rather than half saved.
    expect(writes.some((w) => w.method === "PATCH")).toBe(false);
    await waitFor(() => expect(titleOf(rowAt(section("unfiled"), 0))).toBe("Alpha"));
  });

  it("covers: AC-6 a save that does not land says something different", async () => {
    renderRail();
    await railIsReady();
    // Force the write to fail the way a lost session or a vanished row would.
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? "GET").toUpperCase();
      if (method === "PATCH") return { ok: false, status: 404, json: async () => ({ error: "not_found" }) };
      return realFetch(input, init);
    }));

    await openMenu(triggerOf(rowAt(section("unfiled"), 0)));
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
    const field = await screen.findByRole("textbox", { name: "Rename" });
    fireEvent.change(field, { target: { value: "Never lands" } });
    fireEvent.blur(field);

    await waitFor(() =>
      expect(document.body.textContent).toContain("That name did not save. The old one is back."),
    );
    // Two different problems, so two different sentences. A reader who left the
    // field blank must never be told the save failed, or the reverse.
    expect(document.body.textContent).not.toContain("Give the check a name before saving.");
    await waitFor(() => expect(titleOf(rowAt(section("unfiled"), 0))).toBe("Alpha"));
  });

  it("covers: AC-7 Share copies a link back to this check and says so", async () => {
    const copied: string[] = [];
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async (value: string) => void copied.push(value) },
      configurable: true,
    });
    renderRail();
    await railIsReady();
    await openMenu(triggerOf(rowAt(section("unfiled"), 0)));
    fireEvent.click(screen.getByRole("menuitem", { name: "Share" }));

    await waitFor(() => expect(copied).toHaveLength(1));
    // The id rides in the query so the reader lands in the same chat shell
    // rather than a stripped page that knows nothing about the check.
    expect(copied[0]).toMatch(/\/chat\?s=[a-z0-9]+$/);
    await waitFor(() => expect(document.body.textContent).toContain("Copied"));
  });

  it("covers: AC-13 Escape closes the menu and hands focus back to the trigger", async () => {
    renderRail();
    await railIsReady();
    const trigger = triggerOf(rowAt(section("unfiled"), 0));
    await openMenu(trigger);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    // Focus has to land back on the row's own icon, or a keyboard reader is
    // dropped at the top of the document with no idea where they were.
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("covers: AC-9 Delete asks before removing anything", async () => {
    renderRail();
    await railIsReady();
    await openMenu(triggerOf(rowAt(section("unfiled"), 0)));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("Delete this check?");
    // Still there, because the confirmation has not been answered yet.
    expect(sessions.filter((s) => !s.deletedAt)).toHaveLength(5);
    expect(writes.some((w) => w.method === "DELETE")).toBe(false);
  });
});
