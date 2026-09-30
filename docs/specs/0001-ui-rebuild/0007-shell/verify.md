# Verify: settings as a chat modal · spec 0007 · updated 2026-09-30

_Steps derived from spec 0007 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._

Only AC-4, AC-7, AC-8, AC-9 and AC-10 are in scope here. AC-1, AC-2, AC-3, AC-5 and AC-6 shipped with the shell rebuild and are not rechecked by this feature.

## Preconditions

- Signed in as a verified account with at least one check in the rail.
- A signed out visitor, reachable by clearing cookies.
- `pnpm dev` running on port 3000.
- The network panel visible, because "no refetch" is the whole point of AC-8 and is invisible without it.

## UI / manual

- [ ] Open `/chat`, click the rail avatar, choose Settings → the dialog opens over the thread, the address bar reads `?panel=settings`, the thread is still mounted, and **no `api/chat` request fires** → AC-8
- [ ] On the landing, open the avatar menu → Settings is an `<a href="/settings">`; in the chat rail the same item is a button with no href. The two are deliberately different controls → AC-8
- [ ] Visit `/settings` while signed in → a 307 to `/chat?panel=settings` with the dialog open → AC-8
- [ ] Visit `/settings` while signed out → the auth guard still sends you to `/signin?next=/settings`, unchanged → AC-9
- [ ] Press Escape → the dialog closes, the parameter leaves the address bar, and `document.activeElement` is the avatar button rather than the top of the document → AC-10
- [ ] Open settings, then press the browser Back button → the dialog closes and you are still on `/chat` → AC-7
- [ ] Open settings, close it with Escape, then press Back → Back leaves the thread and does **not** reopen settings → AC-7
- [ ] Type `/chat?panel=banana` → no dialog opens, and `location.search` becomes empty on its own → AC-7
- [ ] Type `/chat?panel=settings` directly → the dialog opens without any click → AC-7
- [ ] Change the language with FR then EN inside the dialog → the whole shell switches and `document.documentElement.lang` follows → AC-4
- [ ] Sign out, then open `/chat?panel=settings` → the dialog shows the sign in prompt, with no name field and no password field → AC-9
- [ ] Follow the sign in link from that prompt → you land on `/signin` with no panel parameter → AC-9
- [ ] On a phone viewport, open the rail, then open settings from the avatar → the drawer closes and the dialog takes the screen → AC-8
- [ ] Use Change password in the dialog → you are signed out and land on `/signin` with no panel parameter → AC-9
- [ ] Press Tab repeatedly inside the dialog → focus never leaves it, cycling the fields and ending on the close control → AC-10
- [ ] Set the OS to reduced motion, then open the dialog → `animation-name` is `none` and duration is `0s`; with motion allowed it returns to `enter` → AC-10
- [ ] Switch the language, then inspect the dialog's close control → its accessible name is the translated label, not the English `Close` the wrapper ships with → AC-10
- [ ] On a short viewport, open the dialog → the content scrolls internally so the password fields are reachable, with `overflow-y: hidden` on the body behind it → AC-10

## Commands

- [ ] `pnpm typecheck` → clean → AC-4, AC-7, AC-8, AC-9, AC-10
- [ ] `pnpm lint` → clean → AC-7, AC-8, AC-10
- [ ] `pnpm test` → 141 pass, including the 16 rail component tests, which mount the nuqs testing adapter because the App Router adapter needs a real router → AC-8
- [ ] `curl -sI http://localhost:3000/settings` with a session cookie → `307` and `location: .../chat?panel=settings` → AC-8
- [ ] `curl -sI http://localhost:3000/settings` with no cookie → `307` to `/signin?next=%2Fsettings`, the proxy guard, not this feature → AC-9

## Value sourcing

One step per row of the spec's Value sourcing table that this feature touches.

- [ ] panel open or closed → the `panel` parameter via the typed enum: the open, Escape, Back, direct URL and bad value steps above → AC-7
- [ ] dialog title and description → `settingsTitle` and `settingsSub`: the language switch step shows both changing → AC-4, AC-10
- [ ] form name → `User.name` through the session: the name field shows the account's current name and saving it persists across a reload → AC-4
- [ ] signed out state → absence of a session: the signed out steps above → AC-9
- [ ] settings destination → the `/settings` redirect, written in one place: the two curl steps plus the landing versus rail step show the redirect is only on the cross surface path → AC-8
- [ ] focus after close → the avatar ref: the Escape step → AC-10
- [ ] dialog close label → the new `dialogClose` key: the close control step → AC-10
- [ ] typed panel value → the parser in `src/lib/search-params.ts`: the bad value step is what proves the type rejects unknown values → AC-7
- [ ] in chat settings trigger → the `settingsHref` prop and `onOpenSettings`: the landing versus rail step proves the two paths differ → AC-8

## Acceptance criteria coverage

- AC-4 covered by the language switch step, the form name value sourcing step, and the existing critical test scenarios for the four fields
- AC-7 covered by the Escape, Back, direct URL and bad value steps, plus the `createParser` value sourcing step
- AC-8 covered by the network panel step, the landing versus rail step, the redirect steps, the phone drawer step and the value sourcing steps
- AC-9 covered by the signed out steps, the phone drawer step, the password change step and the guard curl
- AC-10 covered by the Escape, Tab, reduced motion, close label and short viewport steps

## Not automatable in this repo's suite

The repo has vitest with a happy-dom component stack but no end to end runner, so two kinds of check stay manual here:

- Anything measured in pixels or read off a Tailwind class, which covers the short viewport scroll, the reduced motion override and the dialog's width. happy-dom has no layout and loads no stylesheet.
- The network panel assertion that opening settings does not refetch the thread, which needs a real browser and a real server.

`agent-browser press Back` does not navigate in this environment; drive history with `history.back()` in the page instead, which exercises the same popstate handling the Back button does.
