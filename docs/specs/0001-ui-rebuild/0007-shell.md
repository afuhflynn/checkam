# 0007. Shell (landing plus settings plus WhatsApp guide)

**Date**: 2026-09-25 (settings reach amended 2026-09-30)

## Summary

The shell wraps the product: a rebuilt landing frame keeps the proven intake engine with guest counter and repeat lift, signed in visitors continue into chat, lean settings hold four fields with guarded password change, and the WhatsApp guide turns reading into doing with deep linked trials. Header gains Chat plus the avatar button, public pages carry full bilingual SEO.

Amended on 2026-09-30: settings now opens as a dialog (a modal layer, a box over the page) over the chat thread instead of a page of its own, and whether it is open lives in the address bar as `?panel=settings` so the link can be shared and the Back button can close it. The four fields do not change at all. Only where they appear and how you get there change. This amendment is not built yet; scope feature 17 tracks the work and acceptance criteria AC-7 through AC-10 are new and unbuilt.

## Context

Settings shipped as a standalone page at `/settings`, reached from the avatar in the header on every page. The chat shell arrived afterwards as a full height immersive surface with its own rail, its own thread and a streaming composer, and the standalone page became the one place in the product where a reader leaves their conversation entirely to change four fields, then presses Back and waits for the thread to mount and refetch again.

The scope row for feature 17 records the problem plainly: settings should open over the thread without losing the conversation, the URL should carry the state so the link can be shared and restored, closing should return you to the chat, and `/settings` should still land on the same dialog. Nothing about the fields themselves is in question. Spec 0007 already settled what settings holds, that the password path stays guarded, and that language lives in the existing cookie plus storage with no column.

Two facts from the built code shape this decision. First, `nuqs` is already installed, already wrapped by `NuqsAdapter` in `src/components/providers.tsx`, and already used by `src/app/(site)/directory/page.tsx` for query state, so the address bar contract is a pattern the repo has rather than a new dependency. Worth being precise: those existing calls are untyped, `useQueryState("category", { defaultValue: "ALL" })` is a plain string with a default, and the repo has no `createParser` anywhere. The typed schema this decision needs is the first one, on an API the installed version does export. Second, the shadcn dialog wrapper exists at `src/components/ui/dialog.tsx` and carries the focus trapping, Escape handling, scroll locking and accessibility wiring, but it is not yet in use on the chat surface. The rail's delete confirmation is hand rolled from the bare Radix primitive at `src/components/chat/chat-shell.tsx:817`, and the wrapper's only importer today is `src/components/command.tsx`. This amendment is the wrapper's first real consumer there, so it inherits the wrapper as it stands rather than quietly improving it in passing.

Third, a force only the code reveals: `UserButton` hardcodes `href="/settings"` at `src/components/user-button.tsx:92`, and the rail renders it at `src/components/chat/chat-shell.tsx:676`. Left alone, opening settings from the thread would be a full navigation, which unmounts the thread, refires its queries and loses the scroll position, defeating the whole point. So the in chat trigger and the cross surface deep link have to be two different code paths, not one.

There is a real cost to putting UI state in a URL, and it is named in the Consequences rather than hidden: the address bar now carries a piece of interface state, a mistyped value has to be handled deliberately, and the landing header's settings link will navigate a reader into the chat shell. The alternative of leaving settings as a page was considered and is recorded below.

## Requirements

**User stories**:
- As a first visitor, I want the desk above the proof so that I check in seconds.
- As a returner, I want chat not marketing so that work resumes fast.
- As an account holder, I want four quiet settings so that my account stays mine.
- As a WhatsApp user, I want steps plus trials so that I start from the guide.
- As someone in the middle of a conversation, I want settings to open over the thread so that changing my name does not cost me my place.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: the desk keeps `IntakeHub` plus `VerdictCard` inside the rebuilt frame with the guest counter and repeat visitor desk lift, repeat read from the `checkam_returning` cookie set after the first verify plus session presence; desk verdicts arrive through the `0006-agent` rules handoff and checks pass the unverified block first then the counter with server wins.
- **AC-2**: signed in verified visitors see a continue bar into chat, signed in unverified visitors route to the resend panel per `0002-auth`, guests see the desk on top past the hero.
- **AC-3**: section order stays bulletin plus hero plus desk plus how plus anatomy plus registry plus FAQ plus CTA with entries to sign in, guest try, WhatsApp, and a sample flyer; registry preview reads APPROVED only capped at 3, bulletin plus FAQ plus sample copy comes from i18n keys; header adds Chat plus avatar with settings plus sign out.
- **AC-4**: settings edit name (Zod length checked) plus language plus password (the `0002-auth` 8 plus hint plus blocklist policy) plus inline sign out redirecting to the landing gate, with instant bilingual save notes and FR plus EN field errors; sign out runs Better Auth sign out. The four fields are unchanged by the 2026-09-30 amendment and render inside the dialog rather than on a page. A signed out reader sees the existing sign in prompt in place of the form, not a redirect.
- **AC-5**: the guide shows 3 steps from i18n keys plus the env number with printed fallback plus deep linked trials (`?q` plus `?tab` encoded) into the chat composer and into `wa.me` prefilled in thread language; the number endpoint returns display E.164 plus `waLink`, copy button plus `tel:` link save it, 500 serves the printed fallback.
- **AC-6**: landing plus directory plus dossiers carry bilingual metadata plus OG cards plus canonical plus sitemap entries, all strings from i18n keys.
- **AC-7**: the panel state is one query parameter, `panel`, read through a `createParser` enum that accepts only the value `settings`. Absent means closed. Opening pushes a history entry, so the browser Back button closes the dialog and returns to the thread; closing replaces that entry rather than pushing one, so Back after closing leaves the thread instead of reopening settings. A value outside the enum renders the dialog closed and is stripped from the URL on first read with a replace, so a mistyped or stale link can never reach the component and self heals after one visit. Because a typed parser returns the same empty result for an absent parameter as for an unparseable one, the host also reads the raw presence of `panel` in order to tell those two cases apart.
- **AC-8**: the dialog mounts inside `ChatShell` as a sibling of the thread, so it is neither inside the thread component nor in the route layout, and it opens over the thread without unmounting it, refetching it, or losing its scroll position. Opening it from the thread sets the parameter in place and performs no navigation; the thread is never torn down and its queries never refire, which is the whole reason for a dialog here. Opening it on a phone closes the rail drawer first, in the same handler and before the panel is set, because the drawer state lives in `ChatShell` and the avatar that opens settings sits inside that drawer. The dialog host is wrapped in a `Suspense` boundary of its own with a null fallback, so the boundary never encloses the thread and a first parameter write cannot remount it; the chat page has no boundary today, and the whole page pattern used at `src/app/(site)/directory/page.tsx:256` is explicitly not to be copied here. `GET /settings` answers with a server redirect from the existing page file, and it is a cross surface deep link only: the landing avatar keeps pointing at `/settings`, while the rail opens the panel client side through the `settingsHref` prop, so the redirect is never on the path of opening settings from a thread.
- **AC-9**: a signed out reader who opens the panel sees the existing sign in prompt inside the dialog with a link to `/signin` and no settings fields, and following that link clears the panel parameter on the way, so a later return to chat does not reopen settings unbidden. A signed in but unverified reader gets the full form, which is what the page allows today. Changing the password still revokes every session including the current one and then signs out, and the panel parameter is dropped on the way out, so signing back in does not reopen settings unbidden.
- **AC-10**: the dialog uses the existing shadcn dialog wrapper, so focus is trapped while it is open, Escape closes it, the page behind cannot scroll, and it is announced as a dialog. It is a controlled `Dialog.Root` with no `DialogTrigger` of its own, because the control that opens it is a menu item that unmounts when the menu closes, so `onCloseAutoFocus` refocuses the avatar button through a ref the host holds. Its content carries a maximum height and scrolls internally, so every field stays reachable on a short phone while the body behind it is locked, and its width follows the phone treatment the rail's delete dialog already uses. Its title and description come from the existing bilingual `settingsTitle` and `settingsSub` keys. Exactly one new string is added, a close label, because the wrapper currently renders a hardcoded English `Close` at `src/components/ui/dialog.tsx:49` and this repo requires every shell string to come from an i18n key in both languages; the label is passed in as a prop rather than left to the wrapper. Reduced motion is honoured at the call site with the same override the rail menu uses at `src/components/chat/chat-shell.tsx:1051`, and the shared wrapper is not edited for it, because `src/components/command.tsx` consumes that wrapper too.

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

## Decision

**Chosen option**: Option 1: Keep engine with new frame (shipped) plus Option A: Dialog over the thread with the state in the URL (2026-09-30). The mount point is inside `ChatShell` rather than the route layout, and the in chat trigger is client side rather than a link, both settled on the evidence in the Rationale. (basis: `railOpen` is local state in `src/components/chat/chat-shell.tsx:102` and the avatar that opens settings sits inside that drawer, so a host in the layout would have had no way to close it; `src/components/user-button.tsx:92` hardcodes `href="/settings"`, so the primary path would otherwise be a navigation that unmounts the thread)

Strangler beside the live landing, cut over per section, settings plus guide built fresh on shadcn, SEO completed on public routes. The shell keeps the strangler rebuild it already chose. Settings becomes a dialog mounted inside `ChatShell` as a sibling of the thread, neither inside the thread component nor in the route layout, opened by `?panel=settings` parsed through a `createParser` enum that accepts only `settings`. Opening from the thread sets the parameter client side with no navigation at all, through a `settingsHref` prop on `UserButton` that defaults to `/settings`, so the landing avatar keeps pointing at `/settings` while the rail opens the panel in place. `GET /settings` answers as a server redirect from the existing page file.

**Implementation skills**: none installed. This project has no community skills directory and the root `AGENTS.md` carries no `## Agent skills` section, so there are no skill conventions to point at. The conventions this decision leans on are the shadcn wrapper at `src/components/ui/dialog.tsx` and the reduced motion handling established in spec 0013.

## Rationale

The intake converts today, so the frame changes around it rather than through it. Settings stay lean per scope while password change stays guarded because it is the sensitive moment. The guide earns its keep only when samples launch trials, so deep links beat screenshots.

The shell rebuild stands on the force it was chosen for: the intake converts today, so the frame changes around it rather than through it. Nothing in the settings reach decision disturbs that, because the four fields are untouched and the only retired surface is a redirect.

Option A wins on the specific force the scope names. The reader's place in a conversation is the thing at risk, and a dialog opened over a still mounted thread is the only option that protects it: Option B gives it up, and Option C protects it but costs the shareable link and the working Back button, which the scope asks for by name. Width is the other force, the same one that sank the inline labelled buttons in spec 0012: the rail is 256 pixels and a full page form is a lot of surface for four fields, while a dialog sized to the viewport needs none of that width on a phone. The typed enum rather than a boolean is chosen because the scope asks that a bad value cannot reach the component, and a boolean parser treats any value other than `false` as `true`, so `?panel=banana` would open the dialog. An enum rejects it, and stripping the value on read means the link repairs itself. (basis: the scope row's requirement that a bad value cannot reach the component, and the `createParser` API the installed `nuqs` 2.10.1 actually exports)

Option D was rejected on width before it was rejected on effort. The rail is 256 pixels, so a side panel either narrows the thread or overlaps it, and on a phone it fights the rail drawer that already owns that space. Option C is the closest call and deserves an honest note: it is the smallest code, and it would have been the right answer if the scope had not asked for a linkable and restorable state. The engineer was offered that tradeoff explicitly and chose the URL.

The mount point moved once, and the reason is worth recording because the first answer was wrong. The dialog was first specified to mount in the chat route layout, on the reasoning that a dialog is not part of a thread so it should live beside one. Reading the code showed that the rail drawer state (`railOpen`) is local to `ChatShell`, and that the avatar which opens settings lives inside that drawer, so a host in the layout had no way to close the drawer on a phone and would have needed a new channel invented for it. It would also have needed a `Suspense` decision, since the chat page has no boundary today. Mounting inside `ChatShell` as a sibling of the thread removes both problems and still satisfies the requirement that the thread is never unmounted. The layout's only advantage was surviving a future non chat route in that group, which does not exist. The lesson is narrow and worth keeping: the argument for a layout was about tidiness, and the argument against it was about state that already existed one level down.

One correction is recorded here rather than quietly fixed. This spec previously claimed, at its auth test scenario, that signed out settings access sends to the gate. The built page never did that: `src/app/(chat)/settings/page.tsx` renders an inline sign in prompt with a link to `/signin`. AC-9 and the test scenarios below now follow the code, because changing the rule is a product decision and changing it by accident during a refactor is not.

## Feature design

**Data model sketch**:
No new tables. Settings read and write `User` name plus language preference. Language preference needs a home: reuse the `checkam_lang` cookie plus localStorage already live, no column per the `0002-auth` zero migration rule. The 2026-09-30 amendment adds no table, no migration, and nothing new stored. The one new module is `src/lib/search-params.ts`, which exports the `panel` parser built with `createParser` from the installed `nuqs`, the first typed parser in the repo. The panel state lives in the URL only, and the four fields already exist: `User.name` through the session, language in the existing `checkam_lang` cookie plus localStorage with no column per the `0002-auth` zero migration rule. A panel that remembered itself per user would add a column and a write to carry state the URL already carries.

**State transitions**:
Panel lifecycle: absent means closed. Setting `panel=settings` opens the dialog and pushes a history entry. Closing removes the parameter with a replace, never a push. Back from the open state returns to absent, which is closed. A value outside the enum renders closed and is stripped with a replace, so the URL converges on absent and the reader is not left holding a link that misbehaves. The host distinguishes absent from unparseable by also reading the raw presence of `panel`, because the typed parser alone cannot. On a phone the drawer is closed before the panel is set. A sign out from inside the dialog, and the link through to `/signin`, both drop the parameter before navigating, so no landing page ever carries it.

Guest landing to continue bar to chat on sign in. Settings idle to saving to saved with instant notes. Guide reading to trial launched.

**API surface**:
No new write endpoints. The four settings actions keep calling Better Auth exactly as the page does today. The amendment adds only a read contract and a redirect.

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| panel state | GET (query string) | `panel` (parser enum, only `settings`) | open or closed | public read; the dialog content is session gated | 200, bad value stripped |
| settings deep link | GET | none | redirect to `/chat?panel=settings` | none, the target is gated | 307, from a server `page.tsx` body |
| profile update | PATCH | name | user | session owner | 401, 422 |
| password change | POST | current, new 8 plus | ok, revoked others | session owner | 401, 400, 429 |
| guide number | GET | none | display E.164 plus `waLink`, 500 serves printed fallback | public, Zod plus Arcjet | 500 |

Language switches client side into the existing cookie plus storage.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| desk | intake plus verdict | live `IntakeHub` plus `VerdictCard` components |
| counter | tries left | `0004-chat-memory` counter API |
| continue bar | chat entry | session presence |
| guide trials | prefilled composer | deep link params into chat plus `wa.me` text |
| number | WhatsApp number | env with printed fallback |
| SEO | meta plus cards plus sitemap | route metadata plus existing sitemap extended |
| panel open or closed | whether the dialog renders | the `panel` query parameter, parsed by the typed enum, defaulting to absent |
| dialog title | the settings heading | i18n key `settingsTitle`, both languages already present |
| dialog description | the settings subheading | i18n key `settingsSub`, both languages already present |
| form name | the display name | `User.name` through the Better Auth session |
| signed out state | prompt or form | absence of a session from `authClient.useSession()` |
| settings destination | the canonical url | the `/settings` redirect target, written in one place |
| focus after close | the element refocused | the avatar button ref the host holds, since the menu item that opened the dialog is gone |
| dialog close label | the accessible name of the close control | new i18n key, both languages, passed into the wrapper as a prop |
| typed panel value | open or closed | the `createParser` enum in `src/lib/search-params.ts` |
| in chat settings trigger | whether the avatar navigates or opens in place | the `settingsHref` prop on `UserButton`, defaulting to `/settings` |

**Key invariants**:
- Password change needs the current password and revokes other sessions.
- Language truth stays cookie plus storage with no column, accepted as no roam across devices.
- Guide number never hardcodes in copy.
- Trials never send on open, only prefill.
- Every shell string comes from i18n keys in both languages, nothing invented.
- The panel value is parsed through the enum and never read as a raw string, so no visitor supplied text reaches the component.
- Nothing about the panel is persisted. The URL is its only source of truth.
- Opening the panel from a thread never navigates. The only path that navigates is the cross surface `/settings` deep link.
- Opening the panel never unmounts, refetches, or scrolls the thread, and the dialog host's own `Suspense` boundary never encloses the thread.
- The avatar is where focus lands after the dialog closes, because the menu item that opened it no longer exists.
- The four fields behave exactly as AC-4 already specifies. This decision moves where they render and changes nothing about them.

**Security model**:
Self only profile writes, rate capped password change, number endpoint is public data with no PII. The amendment adds no endpoint, no stored value, and no new exposure. The panel parameter is visitor controlled, so it is parsed through the enum and a value outside it never reaches a component. A signed out reader sees only the sign in prompt; no field is rendered or writable without a session, and the redirect target is gated exactly as the page was. There is no compliance scope specific to this change; settings touches the same account PII it already did. One honest limit worth stating: a shared `?panel=settings` link is only meaningful to the account that owns it. Whoever opens it sees their own form, never the sender's, because every field reads from their own session. A link is therefore a convenience for returning to your own settings, not a way to show someone else yours.

**Configuration required**:
- `WHATSAPP_NUMBER`: display plus `wa.me` link number with printed fallback
- The 2026-09-30 amendment adds no environment variable and no credential.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: guest to desk check to sign in to continue bar to chat, verifies **AC-1**, **AC-2**
- Failure case: wrong current password blocks change with field error, verifies **AC-4**
- Settings happy path: from a thread, open settings with the avatar, change the language, close with Escape, and land back on the same thread at the same scroll position, verifies **AC-4**, **AC-8**, **AC-10**
- No navigation: open settings from the thread's avatar, confirm the URL changed to `?panel=settings` with no route transition, the thread still mounted, its queries not refiring, and the scroll position unchanged, verifies **AC-8**
- History: open settings, press Back, and confirm the dialog closes and the thread is still there; then open it again, close it with Escape, press Back, and confirm Back leaves the thread rather than reopening settings, verifies **AC-7**
- Deep link: follow `/settings`, land on `/chat?panel=settings` with the dialog open and the thread behind it intact, verifies **AC-7**, **AC-8**
- Failure case: hand type `/chat?panel=banana`, the dialog stays closed and the parameter is gone from the URL afterwards, verifies **AC-7**
- Failure case: change the password from inside the dialog, get signed out, and confirm the landing gate carries no panel parameter, verifies **AC-9**
- Auth/permission: a signed out reader opens `/chat?panel=settings`, sees the sign in prompt and no fields, verifies **AC-9**
- Keyboard: Tab reaches the trigger, Enter opens the dialog, Escape closes it, and focus is on the avatar rather than lost at the top of the document, verifies **AC-10**
- Small screen: on a phone sized viewport, scroll inside the dialog to reach the password fields with the body behind it locked, verifies **AC-10**
- Bilingual: switch the language and confirm the dialog's close control announces its label in the new language rather than a hardcoded English word, verifies **AC-10**

## Migration plan

**Strategy**: strangler for the shipped landing rebuild, no migration needed for the 2026-09-30 amendment
**Phases**:
1. Build new frame beside live landing, cut over section by section with the desk last.
2. The settings reach change is additive. `/settings` answers as a redirect while the dialog ships, so the old link never breaks and there is no window where settings is unreachable.
**Rollback**: revert the commit, old landing serves untouched. For the settings amendment, reverting restores the page and drops the redirect with it, and no data was touched.
**Risks**: SEO dip on route metadata changes, contained by keeping urls plus canonicals stable. For the settings amendment, none material: the one behaviour change readers notice is that the landing avatar's settings link now lands in the chat shell, which is a navigation change rather than a data risk.

## Build plan

Tasks 1 through 4 shipped with the shell rebuild. Tasks 5 through 8 are the 2026-09-30 settings reach amendment, not yet built. The project builds one full user path at a time and each phase stays usable, so task 5 and task 6 together deliver the whole path (open settings from the thread, see the fields, close, return) before the access states and the dialog polish land.

1. Build frame plus header plus continue bar plus desk lift, satisfies **AC-1**, **AC-2**, **AC-3** (shipped)
2. Build lean settings with guarded password change, satisfies **AC-4** (shipped)
3. Build guide with env number plus deep linked trials, satisfies **AC-5** (shipped)
4. Complete bilingual SEO on public routes, satisfies **AC-6** (shipped)
5. Extract the four fields into a shared settings form component, and add `src/lib/search-params.ts` exporting the `createParser` enum for `panel` that accepts only `settings` and defaults to closed, satisfies **AC-4**, **AC-7**
6. Add the `settingsHref` prop to `UserButton` defaulting to `/settings`, so the rail can open the panel client side while every other surface keeps its current link, satisfies **AC-8**
7. Mount the dialog inside `ChatShell` as a sibling of the thread in its own `Suspense` boundary, with the controlled root, the focus return to the avatar, the internal scroll on a short screen, the call site reduced motion override, and the bilingual close label passed into the wrapper, satisfies **AC-8**, **AC-10**
8. Turn `/settings` into a server redirect to `/chat?panel=settings`, and add the raw presence read that strips a value outside the enum with a replace, plus push on open and replace on close, satisfies **AC-7**, **AC-8**
9. Add the states: the inline sign in prompt for a signed out reader with the parameter cleared on the way to `/signin`, the full form for an unverified one, the rail drawer closing before the panel is set, and the parameter dropped on sign out, satisfies **AC-8**, **AC-9**

## Consequences

**Positive**:
- One coherent shell from first visit to daily use.
- Engine keeps converting through the rebuild.
- Changing a name or a language no longer costs the reader their place in a conversation.
- Settings is linkable and restorable, and Back closes it the way people expect a layer to close.

**Negative / tradeoffs**:
- Old seams constrain the frame until the desk cutover finishes.
- Language without a column cannot roam across devices.
- The address bar now carries a piece of interface state, which sets a precedent and makes every future panel a decision about the URL.
- The parameter accepts exactly one value, so a boolean would have been simpler, and the enum is carried by the requirement that a bad value cannot reach the component. If a second panel never arrives, this is more machinery than the feature strictly needed.
- A reader who opens settings from the landing header is navigated into the chat shell, which is a change in what that link feels like.
- A mistyped parameter is silently repaired, so a shared link with a typo changes under the reader rather than telling them it was wrong.
- The four fields are now constrained to render inside a dialog, so any future long form work outgrows this surface and needs a second host.
- `UserButton` gains a prop and the avatar now behaves differently depending on which surface renders it, so a future change to that component has two behaviours to keep correct rather than one.
- The shared dialog wrapper gains a close label prop. Every other consumer of that wrapper, currently only `src/components/command.tsx`, keeps whatever it has today unless it is updated too.
- This file now carries two decisions. It is still scannable, but if it keeps growing it should split, with the shell and the settings reach becoming separate specs.

**Neutral**:
- Design tool file plus frames still owed before pixel build.
- No new dependency: `nuqs` and the dialog wrapper were both already installed and in use.
- The parameter accepts exactly one value today. A second panel adds a value and a component, and nothing else.

## Follow-up

- [ ] `src/components/ui/dialog.tsx:49` hardcodes an English `Close` for every consumer. This amendment passes a label in for its own use; the wrapper itself still needs fixing so no future caller inherits the problem.
- [ ] The unverified reader can still open settings and change a name, which is looser than the chat write path that refuses unverified users. Decide later whether to align them.
- [ ] Decide the panel parameter's shape once a second panel exists. A single boolean may be simpler than an enum at that point, though the typed parse should stay.
- [ ] This file carries two decisions. Split the settings reach into its own spec if either decision grows further.
- [ ] AC-3, AC-5 and AC-6 (landing sections, the WhatsApp guide, public SEO) have no critical test scenario. They shipped without one, so `/verify-release` has nothing to check them against if they are ever revisited.
- [ ] Connect a design MCP and name the shell file plus frames.
- [ ] Decide cross device language sync as later work or never.

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
