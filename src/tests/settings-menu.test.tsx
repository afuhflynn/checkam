/**
 * @vitest-environment happy-dom
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../lib/i18n/context";
import { UserButton } from "../components/user-button";

/**
 * The rail's Settings trigger, on its own.
 *
 * This lives apart from `chat-rail.test.tsx` because that file stubs the account
 * menu out entirely, and `vi.mock` is hoisted to the whole file, so there is no
 * way to unmock it for one test. The control that regressed is inside this menu,
 * so the rail file cannot be the place that guards it.
 *
 * The regression: the item used to be a link, which is a real interactive
 * element the browser handles taps on itself. It became a bare Radix item, which
 * renders a `div`, so the action hung entirely off the menu firing `select`, and
 * on a finger that did not happen. A tap did nothing at all, while the same path
 * with a mouse worked everywhere. These tests fail if the control goes back to
 * being non interactive.
 */

vi.mock("../lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: "u1", name: "Ada Reader", email: "reader@example.com" } },
    }),
    signOut: () => Promise.resolve(),
  },
}));

function renderMenu(onOpenSettings?: () => void) {
  return render(
    <LanguageProvider initialLanguage="en">
      <UserButton hideChat onOpenSettings={onOpenSettings} />
    </LanguageProvider>,
  );
}

async function openMenu() {
  fireEvent.pointerDown(screen.getByRole("button", { name: /Signed in as/ }), {
    button: 0,
    ctrlKey: false,
  });
  return screen.findByRole("menu");
}

beforeAll(() => {
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Rail Settings trigger (spec 0007)", () => {
  it("covers: the item is a real button, so a tap reaches it", async () => {
    renderMenu(() => {});
    await openMenu();

    const settings = screen.getByRole("menuitem", { name: "Settings" });
    // The load bearing assertion. A bare Radix item renders a `div`, which is
    // not natively tappable; this is what silently broke tapping.
    expect(settings.tagName).toBe("BUTTON");
    expect(settings.getAttribute("type")).toBe("button");
    // Radix supplies the menu role through the slot, so wrapping a real control
    // must not cost the menu semantics the other items keep.
    expect(settings.closest('[role="menu"]')).not.toBeNull();
    expect(settings.textContent?.trim()).toBe("Settings");
  });

  it("covers: a click on the item opens the panel without navigating", async () => {
    const onOpenSettings = vi.fn();
    renderMenu(onOpenSettings);
    await openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "Settings" }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    // The whole point of the callback over a link: no navigation, so the thread
    // is never unmounted and never refetches.
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("covers: mounting the menu never opens the panel on its own", async () => {
    const onOpenSettings = vi.fn();
    renderMenu(onOpenSettings);
    await openMenu();

    // Guards against the handler being wired somewhere that fires without a
    // press, which would pop the dialog at every render of the rail.
    expect(onOpenSettings).not.toHaveBeenCalled();
  });

  it("covers: without the callback the item stays a link to the deep route", async () => {
    renderMenu();
    await openMenu();

    const settings = screen.getByRole("menuitem", { name: "Settings" });
    // Every surface outside the rail still navigates, so the fallback must stay
    // a link rather than becoming an inert button.
    expect(settings.closest("a")?.getAttribute("href")).toBe("/settings");
  });

  it("covers: a signed out rail reader gets a sign in link and no menu", async () => {
    const auth = await import("../lib/auth-client");
    vi.spyOn(auth.authClient, "useSession").mockReturnValue({ data: null } as never);

    const onOpenSettings = vi.fn();
    renderMenu(onOpenSettings);

    // The rail does not hand a guest a settings panel at all, it offers sign in.
    // Guests still reach settings, through the landing page's menu, which keeps
    // the link form of this item.
    expect(screen.getByRole("link", { name: /sign in/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /signed in as/i })).toBeNull();
    expect(screen.queryByRole("menu")).toBeNull();
    expect(onOpenSettings).not.toHaveBeenCalled();
  });
});