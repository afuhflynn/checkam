# 0007. Shell (landing plus settings plus WhatsApp guide): rationale

_The decision record: why this was chosen. `/feature-build` skips this file; the build spec is index.md._

## Context


Settings shipped as a standalone page at `/settings`, reached from the avatar in the header on every page. The chat shell arrived afterwards as a full height immersive surface with its own rail, its own thread and a streaming composer, and the standalone page became the one place in the product where a reader leaves their conversation entirely to change four fields, then presses Back and waits for the thread to mount and refetch again.

The scope row for feature 17 records the problem plainly: settings should open over the thread without losing the conversation, the URL should carry the state so the link can be shared and restored, closing should return you to the chat, and `/settings` should still land on the same dialog. Nothing about the fields themselves is in question. Spec 0007 already settled what settings holds, that the password path stays guarded, and that language lives in the existing cookie plus storage with no column.

Two facts from the built code shape this decision. First, `nuqs` is already installed, already wrapped by `NuqsAdapter` in `src/components/providers.tsx`, and already used by `src/app/(site)/directory/page.tsx` for query state, so the address bar contract is a pattern the repo has rather than a new dependency. Worth being precise: those existing calls are untyped, `useQueryState("category", { defaultValue: "ALL" })` is a plain string with a default, and the repo has no `createParser` anywhere. The typed schema this decision needs is the first one, on an API the installed version does export. Second, the shadcn dialog wrapper exists at `src/components/ui/dialog.tsx` and carries the focus trapping, Escape handling, scroll locking and accessibility wiring, but it is not yet in use on the chat surface. The rail's delete confirmation is hand rolled from the bare Radix primitive at `src/components/chat/chat-shell.tsx:817`, and the wrapper's only importer today is `src/components/command.tsx`. This amendment is the wrapper's first real consumer there, so it inherits the wrapper as it stands rather than quietly improving it in passing.

Third, a force only the code reveals: `UserButton` hardcodes `href="/settings"` at `src/components/user-button.tsx:92`, and the rail renders it at `src/components/chat/chat-shell.tsx:676`. Left alone, opening settings from the thread would be a full navigation, which unmounts the thread, refires its queries and loses the scroll position, defeating the whole point. So the in chat trigger and the cross surface deep link have to be two different code paths, not one.

There is a real cost to putting UI state in a URL, and it is named in the Consequences rather than hidden: the address bar now carries a piece of interface state, a mistyped value has to be handled deliberately, and the landing header's settings link will navigate a reader into the chat shell. The alternative of leaving settings as a page was considered and is recorded below.

## Options considered


### Options considered for the shell rebuild (shipped 2026-09-25)

#### Option 1: Keep engine with new frame

Rebuilt frame, tokens, seal, and header around the live intake, registry, and guide content.

**Pros**:
- Keeps the converting engine while the voice turns dossier.
- Smallest risk on working flows.

**Cons**:
- Old component seams constrain the new frame in places.

#### Option 2: Rebuild everything including intake

Fresh intake, fresh registry, fresh guide.

**Pros**:
- No legacy seams at all.

**Cons**:
- Rebuilds a converting flow with real regression risk.

#### Option 3: Landing only, settings later

Ship landing now, defer settings plus guide.

**Pros**:
- Smallest child.

**Cons**:
- Splits the shell across releases and strands the avatar menu.

### Options considered for how settings is reached (2026-09-30)

#### Option A: Dialog over the thread with the state in the URL (chosen)

Settings renders as a dialog inside `ChatShell`, beside the thread. One query parameter, parsed through a `createParser` enum, holds whether it is open. `/settings` becomes a server redirect to the canonical chat url. (basis: `src/components/ui/dialog.tsx` and the installed `nuqs`, both already in the repo, so the build adds no dependency)

**Pros**:
- Changing a name or language never costs the reader their place in the conversation.
- The state is linkable, shareable, restorable by a refresh, and closable with Back, which is what the scope asks for.
- `nuqs` and the dialog wrapper are both already installed, so the build adds no dependency, and the accessibility wiring comes with the wrapper rather than being hand built.
- One component renders the four fields, so there is a single place for them to live and nothing to keep in step.

**Cons**:
- The address bar now carries a piece of interface state, which is a small conceptual cost and a precedent for future panels.
- A visitor who opens settings from the landing header is navigated into the chat shell, which is a change in what that link feels like.
- A mistyped parameter value has to be detected and cleaned rather than ignored, or the URL stays wrong.
- The in chat trigger and the cross surface link stop being one thing, so `UserButton` grows a prop and there are two paths to keep correct.

#### Option B: Keep the standalone page

Leave settings where it is. (basis: the scope row for feature 17, which asks for the conversation to be preserved)

**Pros**:
- No change at all, so no new state, no redirect, no test surface.
- A full page is the easiest place to put a long form.

**Cons**:
- Does not deliver what scope feature 17 asks for at all.
- Keeps the one flow in the product that discards the reader's conversation.

#### Option C: Dialog over the thread with no URL state

Same dialog, held in React state only. (basis: smallest possible implementation, which is the right answer if the linkable and restorable state is not required)

**Pros**:
- Simplest possible implementation, one boolean in a component.
- The URL stays clean, no parameter to parse, strip, or test.

**Cons**:
- A refresh closes settings, and there is no link to share, which is two of the four things the scope asks for.
- Escape and the Back button would disagree, because only one of them could work.

#### Option D: Side panel or drawer instead of a centered dialog

A panel sliding in from the rail side. (basis: the 256 pixel rail width measured in spec 0012, where labels and the title competed for the same row)

**Pros**:
- Keeps the thread visible beside the fields, so nothing is covered.

**Cons**:
- On a phone it competes with the rail drawer for the same space and the same gesture.
- The rail is already 256 pixels on desktop, so a side panel has nowhere to go without eating the thread.
- A new bespoke component with its own focus and gesture handling, where the dialog wrapper already covers that.

## Rationale


The intake converts today, so the frame changes around it rather than through it. Settings stay lean per scope while password change stays guarded because it is the sensitive moment. The guide earns its keep only when samples launch trials, so deep links beat screenshots.

The shell rebuild stands on the force it was chosen for: the intake converts today, so the frame changes around it rather than through it. Nothing in the settings reach decision disturbs that, because the four fields are untouched and the only retired surface is a redirect.

Option A wins on the specific force the scope names. The reader's place in a conversation is the thing at risk, and a dialog opened over a still mounted thread is the only option that protects it: Option B gives it up, and Option C protects it but costs the shareable link and the working Back button, which the scope asks for by name. Width is the other force, the same one that sank the inline labelled buttons in spec 0012: the rail is 256 pixels and a full page form is a lot of surface for four fields, while a dialog sized to the viewport needs none of that width on a phone. The typed enum rather than a boolean is chosen because the scope asks that a bad value cannot reach the component, and a boolean parser treats any value other than `false` as `true`, so `?panel=banana` would open the dialog. An enum rejects it, and stripping the value on read means the link repairs itself. (basis: the scope row's requirement that a bad value cannot reach the component, and the `createParser` API the installed `nuqs` 2.10.1 actually exports)

Option D was rejected on width before it was rejected on effort. The rail is 256 pixels, so a side panel either narrows the thread or overlaps it, and on a phone it fights the rail drawer that already owns that space. Option C is the closest call and deserves an honest note: it is the smallest code, and it would have been the right answer if the scope had not asked for a linkable and restorable state. The engineer was offered that tradeoff explicitly and chose the URL.

The mount point moved once, and the reason is worth recording because the first answer was wrong. The dialog was first specified to mount in the chat route layout, on the reasoning that a dialog is not part of a thread so it should live beside one. Reading the code showed that the rail drawer state (`railOpen`) is local to `ChatShell`, and that the avatar which opens settings lives inside that drawer, so a host in the layout had no way to close the drawer on a phone and would have needed a new channel invented for it. It would also have needed a `Suspense` decision, since the chat page has no boundary today. Mounting inside `ChatShell` as a sibling of the thread removes both problems and still satisfies the requirement that the thread is never unmounted. The layout's only advantage was surviving a future non chat route in that group, which does not exist. The lesson is narrow and worth keeping: the argument for a layout was about tidiness, and the argument against it was about state that already existed one level down.

One correction is recorded here rather than quietly fixed. This spec previously claimed, at its auth test scenario, that signed out settings access sends to the gate. The built page never did that: `src/app/(chat)/settings/page.tsx` renders an inline sign in prompt with a link to `/signin`. AC-9 and the test scenarios below now follow the code, because changing the rule is a product decision and changing it by accident during a refactor is not.

## References


**Project sources** (verifiable, in this repo):
- `AGENTS.md`, the stack, the zero invented copy rule, and the one full user path at a time build approach
- spec 0002 auth, the session model, the password policy, and the zero migration rule for language
- spec 0012 and spec 0013, where rail width is the force that pushed labels off the row, and where reduced motion handling is already settled
- `src/components/ui/dialog.tsx`, the shadcn dialog wrapper already in the repo
- `src/components/providers.tsx` and `src/app/(site)/directory/page.tsx`, the existing `nuqs` wiring and typed query state
- `src/app/(chat)/settings/page.tsx` and `src/components/user-button.tsx`, the surface being changed and the link that reaches it
- `src/lib/i18n/dictionary.ts`, where every string this change renders already exists in both languages

**Practices & standards**:
- Strangler pattern for retiring a live surface, here a redirect that keeps the old url working
- Progressive disclosure, a modal over content that stays present behind it
- Typed parsing at the boundary, so visitor supplied input is rejected by a schema before it reaches a component
- Layered UI over persistent content, where the address bar holds the layer state so the link and the Back button both work

## Amendments (settings reach, 2026-09-30)


- Settings becomes a dialog over the chat thread, opened by `?panel=settings` read through a `createParser` enum, replacing the standalone page. The four fields are unchanged.
- The dialog mounts inside `ChatShell` as a sibling of the thread, in its own `Suspense` boundary, and never unmounts, refetches or scrolls the thread. It was first specified to mount in the route layout; reading `railOpen` and the drawer that holds the avatar showed the layout had no way to close the phone drawer, so the mount moved.
- Opening from a thread is client side with no navigation, through a `settingsHref` prop on `UserButton` that defaults to `/settings`. `UserButton` had `href="/settings"` hardcoded and is rendered in the rail, so without this the primary path was a full navigation that would have undone the feature.
- `/settings` answers as a server redirect from the existing page file, and is a cross surface deep link only. The landing avatar keeps pointing at `/settings`.
- Opening pushes a history entry so Back closes the dialog; closing and stripping a bad value both replace, so Back after closing leaves the thread.
- A value outside the enum renders closed and is stripped on first read. The host reads the raw presence of `panel` as well, because a typed parser returns the same empty result for absent and unparseable.
- Corrects an earlier claim in this spec: signed out settings access does not send to the gate. The built page renders an inline sign in prompt with a link to `/signin`, and AC-9 plus the test scenarios now follow the code.
- Signed in but unverified readers keep the full form, which is what the page allows today and was never checked against `emailVerified`.
- Adds one new string, a close label, because the dialog wrapper hardcodes an English `Close`. Every other string comes from keys that already exist in both languages.
- AC-7 through AC-10 are new and unbuilt. Scope feature 17 tracks the work.
- A cross check pass on a separate model found two factual errors in the first draft of this amendment, both since corrected: that the dialog wrapper was already used by the rail's delete confirmation (it is hand rolled there, and the wrapper's only importer is `src/components/command.tsx`), and that `nuqs` was already used for typed query state (it is used untyped, and this will be the repo's first `createParser`). It also found that `asEnum`, which it recommended, does not exist in the installed `nuqs` 2.10.1; `createParser` is the API actually exported.

## Amendments (peer review pass, 2026-09-25)


- Continue bar routes unverified users to the resend panel, not chat.
- Guide carries tel links plus locale-prefilled wa.me trials alongside web trials.
- Metadata is locale aware per route; robots excludes admin, api, settings, and chat; sitemap includes approved dossiers.
- Settings password change revokes every session including the current one, then signs out.
- Accepted deviations: trial suspect text rides the URL by user action; whatsapp demo copy stays inline (pre-existing style); language does not roam devices.
