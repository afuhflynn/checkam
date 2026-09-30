# 0007. Shell (landing plus settings plus WhatsApp guide)

**Date**: 2026-09-25 (settings reach amended 2026-09-30)

_No `**Status**:` line on purpose. This file records three shipped features (the landing rebuild, lean settings, the WhatsApp guide) alongside the settings dialog work, which shipped on 2026-09-30. A single status cannot be true of both, and the dated Amendments in rationale.md carry the build state per slice. `/state-sync` should reconcile this if the split ever happens._

## Summary

The shell wraps the product: a rebuilt landing frame keeps the proven intake engine with guest counter and repeat lift, signed in visitors continue into chat, lean settings hold four fields with guarded password change, and the WhatsApp guide turns reading into doing with deep linked trials. Header gains Chat plus the avatar button, public pages carry full bilingual SEO.

Amended on 2026-09-30: settings now opens as a dialog (a modal layer, a box over the page) over the chat thread instead of a page of its own, and whether it is open lives in the address bar as `?panel=settings` so the link can be shared and the Back button can close it. The four fields do not change at all. Only where they appear and how you get there change. This amendment is not built yet; scope feature 17 tracks the work and acceptance criteria AC-7 through AC-10 are new and unbuilt.

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

## Decision


**Chosen option**: Option 1: Keep engine with new frame (shipped) plus Option A: Dialog over the thread with the state in the URL (2026-09-30). The mount point is inside `ChatShell` rather than the route layout, and the in chat trigger is client side rather than a link, both settled on the evidence in the Rationale. (basis: `railOpen` is local state in `src/components/chat/chat-shell.tsx:102` and the avatar that opens settings sits inside that drawer, so a host in the layout would have had no way to close it; `src/components/user-button.tsx:92` hardcodes `href="/settings"`, so the primary path would otherwise be a navigation that unmounts the thread)

Strangler beside the live landing, cut over per section, settings plus guide built fresh on shadcn, SEO completed on public routes. The shell keeps the strangler rebuild it already chose. Settings becomes a dialog mounted inside `ChatShell` as a sibling of the thread, neither inside the thread component nor in the route layout, opened by `?panel=settings` parsed through a `createParser` enum that accepts only `settings`. Opening from the thread sets the parameter client side with no navigation at all, through a `settingsHref` prop on `UserButton` that defaults to `/settings`, so the landing avatar keeps pointing at `/settings` while the rail opens the panel in place. `GET /settings` answers as a server redirect from the existing page file.

**Implementation skills**: none installed. This project has no community skills directory and the root `AGENTS.md` carries no `## Agent skills` section, so there are no skill conventions to point at. The conventions this decision leans on are the shadcn wrapper at `src/components/ui/dialog.tsx` and the reduced motion handling established in spec 0013.

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
5. [x] Extract the four fields into a shared settings form component, and add `src/lib/search-params.ts` exporting the `createParser` enum for `panel` that accepts only `settings` and defaults to closed, satisfies **AC-4**, **AC-7**
6. [x] Add the `settingsHref` prop to `UserButton` defaulting to `/settings`, so the rail can open the panel client side while every other surface keeps its current link, satisfies **AC-8**
7. [x] Mount the dialog inside `ChatShell` as a sibling of the thread in its own `Suspense` boundary, with the controlled root, the focus return to the avatar, the internal scroll on a short screen, the call site reduced motion override, and the bilingual close label passed into the wrapper, satisfies **AC-8**, **AC-10**
8. [x] Turn `/settings` into a server redirect to `/chat?panel=settings`, and add the raw presence read that strips a value outside the enum with a replace, plus push on open and replace on close, satisfies **AC-7**, **AC-8**
9. [x] Add the states: the inline sign in prompt for a signed out reader with the parameter cleared on the way to `/signin`, the full form for an unverified one, the rail drawer closing before the panel is set, and the parameter dropped on sign out, satisfies **AC-8**, **AC-9**

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

## Rationale

Reasoning and options: see rationale.md.
