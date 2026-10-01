# 0014. Message actions and re ask in the chat thread

**Date**: 2026-09-30
**Status**: Proposed
**Scope**: `docs/scope/scope.md` feature 18
**Build approach**: Journey (one full user path at a time, each phase usable)

## Summary

Every message in the thread earns a quiet row of controls, chiefly copy. The most recent answer also gets a re ask button that replaces it with a fresh answer to the same question, charged as an ordinary turn. Rich text rendering and code block copy already ship inside the library you use, so this wires the control primitives that already sit unused in your repo, adds one nullable column to the database, and adds one field to the existing transport request.

## Requirements

**User stories**:
- As a reader who was forwarded a scam warning, I want to copy an answer so that I can paste it into a WhatsApp message.
- As a reader who got a code block or a long list in the answer, I want to copy just that block so that I keep the rest clean.
- As a reader who does not believe an answer, I want to ask again so that I get a second reading instead of starting a new conversation.
- As a reader on a phone, I want the controls to be there without hovering so that I can reach them with a tap.

**Acceptance criteria** (the contract, each independently checkable):
- **AC-1**: every message, both the ones a reader sent and the answers, carries a copy control that places plain text on the clipboard. The clipboard receives the answer converted from its stored Markdown, never the raw Markdown, so no markers, fences or emphasis marks reach it.
- **AC-2**: every code block keeps the copy control Streamdown already renders, it copies only that block, and its accessible titles read correctly in English and French rather than falling back to the library's English defaults.
- **AC-3**: a successful copy turns the copy icon into a check for about one second, and a failed copy shows the existing bilingual failure message.
- **AC-4**: the controls are always present in the page, become visible on hover or on keyboard focus, are reachable by keyboard alone, and read correctly in English and French.
- **AC-5**: no message level action row is shown while an answer is still streaming; it appears once the answer settles. Library owned controls inside code blocks are unaffected by this criterion.
- **AC-6**: only the most recent settled answer carries a re ask control; earlier answers carry copy only.
- **AC-7**: after a re ask the thread shows exactly one answer to that question, the fresh one, in the same position, without a reload and with the replaced answer removed from the mounted pages.
- **AC-8**: the replaced answer stays in the database stamped superseded, and its `toolCalls` keep counting toward the Tavily daily budget. Every read that renders a thread filters superseded rows out; every read that counts or resolves deliberately does not.
- **AC-9**: a re ask is charged as an ordinary turn. For a guest it spends one of the daily tries, and it draws from the Tavily budget in all cases.
- **AC-10**: a verdict record attached to a replaced answer is never deleted or repointed, so a warning already shared keeps resolving.
- **AC-11**: while a re ask is in flight the control is disabled and shows progress, further taps do nothing, and if the guest wall refuses the turn the reader sees the wall rather than the generic failure message.
- **AC-12**: when the preceding turn carries no typed text the re ask control is disabled and states why, checked in the client before any request is sent.
- **AC-13**: answers keep rendering as rich text exactly as they do today, and nothing in this feature overrides how Streamdown renders a code block.
- **AC-14**: a re ask travels through the existing transport route with a single added body field, so the agent tools, the reviewed prompts, the budget and the rate limiter all apply exactly as they do for a normal turn.
- **AC-15**: a re ask whose target is no longer the latest live answer of its session is refused rather than applied, so a second reader or a second tab can never leave two live answers to one question.

## Decision

**Chosen option**: Option 1, corrected: wire the controls that already exist, add one nullable column, and carry the re ask as one field on the existing transport request.

Copy uses the `MessageActions` and `MessageAction` primitives that `src/components/ai-elements/message.tsx` already exports but nothing renders. Code block copy is left to Streamdown, which already renders it. Re ask resends the preceding question through the existing `sendMessage` and adds one optional body field, `supersedeId`, naming the database row of the answer to replace. No new dependency, no message branch table, and no attempt to drive the installed AI SDK's `regenerate`.

**Implementation skills**: `ai-sdk` (`/home/afuhflynn/.agents/skills/ai-sdk/`) · `frontend-design` (`/home/afuhflynn/.agents/skills/frontend-design/`) · `tailwindcss` (`/home/afuhflynn/.agents/skills/tailwindcss/`)

## Feature design

**Data model sketch**: one entity changes. No new table and no new relationship.

| Entity | Field | Type | Rules |
|---|---|---|---|
| ChatMessage | id | String, primary key | unchanged, cuid. This is what `supersedeId` carries |
| | sessionId | String, foreign key to ChatSession | unchanged, deletes cascade |
| | seq | Int | unchanged, still unique per session. The next value stays the last one plus one counting superseded rows, so the sequence only grows |
| | role | String | unchanged, user or assistant |
| | text | String | unchanged, stored as Markdown |
| | supersededAt | DateTime, nullable | **new**. Blank means the row is live. Stamped when a re ask replaces it. Every read that renders a thread filters on blank |
| | toolCalls | Json | unchanged, and a superseded row keeps counting toward the Tavily budget. This is what AC-8 protects |
| | tokenUse | Json | unchanged and left alone. It is currently only ever read, never written, so no criterion depends on it |
| | verificationId | String, nullable | unchanged, never cleared when superseded |

Cardinality is unchanged: ChatSession one to many ChatMessage.

**State transitions**: a message moves from live to superseded exactly once, and only by a re ask. There is no path back. A re ask control moves idle to running to idle, entering running on tap and leaving when the stream settles or is refused, with any second tap while running ignored.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/chat/transport` | POST | existing `messages`, plus optional `supersedeId` as the cuid of the answer row to replace | streamed answer chunks, as today | session owner through `sessionScope`, guest through `guestKey` | 404 not found, 403 guest wall, 409 stale re ask target, 422 empty turn, 429 rate limited |
| `/api/chat/sessions/[id]/messages` | GET | session id, existing `before` or `after` cursor | a page of messages, now filtered to live rows only | session owner or guest | 403, 404 |

The only shape change is one optional field on the transport body. The re ask does not use the AI SDK's `regenerate`, because this client never seeds the SDK's own message state and never has, so that function cannot find the message to replace.

**Filter rule, and the paths that must deliberately break it**:

A read that renders a thread filters `supersededAt` blank. That is `sessions/[id]/messages` only, at both its queries. Four other paths must **not** filter, and getting this backwards is the expensive mistake:

- `verdict/route.ts`, which resolves a verdict link. Filtering here would break AC-10, since a shared warning stops resolving.
- `src/lib/agent/tools.ts`, which reads `toolCalls` for the daily Tavily budget. Filtering here would under count and break AC-8.
- `transport/route.ts`, which assigns the next `seq`. Filtering the assignment would hand a new row the sequence of a live row and collide with the unique constraint on `[sessionId, seq]`.
- `src/lib/chat/counter.ts`, which derives the guest tries.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Copy a message | the plain text for the clipboard | the row's `text`, converted from Markdown to plain: fence markers removed but their inner text kept, link text kept and the URL dropped, list bullets and emphasis marks removed. This conversion is a named build task, because the stored value is Markdown and the reader must never receive it raw |
| Copy a code block | that block's source | the code element Streamdown renders from the same message `text` |
| Copy confirmation | the check icon, then the icon again | local component state with a one second timeout |
| Copy failure message | the failure text | the existing `copyFailed` string in `src/lib/i18n/dictionary.ts` |
| New bilingual strings | copy label, copied state, re ask label, re ask in progress, re ask unavailable reason | new keys added to both language halves of `src/lib/i18n/dictionary.ts` |
| Code control titles | the copy and copied titles on a code block | Streamdown's own `translations` prop, supplied in both languages, so its English defaults are replaced rather than shown |
| Which answer gets re ask | the row to replace | derived client side as the last assistant row, and re-validated on the server against the latest live answer |
| Re ask charge | one guest try | derived: user rows plus superseded assistant rows |
| Supersede stamp | the timestamp on the replaced row | the server clock at the moment the re ask is accepted |
| The answer being replaced | its database id | the `supersedeId` input, which is a cuid and is validated to belong to the session |
| Verdict on a replaced answer | the verdict link | the existing `verificationId`, deliberately untouched |

**Key invariants**:

- A session has at most one live answer to any question, enforced by marking the previous row superseded in the same transaction that inserts the new one.
- `toolCalls` on a superseded row still counts against the Tavily budget. Deleting the row instead would silently under count and hand a reader more real searches than the cap intends.
- Every read that renders a thread filters superseded rows. A missed filter shows two answers to one question, the most visible failure this feature can have.
- A re ask target must be the latest live answer of the caller's own session, or the request is refused with 409.
- A verdict row referenced by anything already shared is never deleted or repointed.
- The sequence number only ever grows, superseded rows keep their place in it, and the sequence assignment never filters.
- No control mutates a message a reader does not own. A session is reached only through `sessionScope` or the guest key.

**Security model**:

Copy runs entirely in the browser and touches no server, so it adds no authorization surface. Re ask runs through the existing transport route, so it inherits the same rules as a normal turn: `sessionScope(actor)` for signed in readers, the guest key for guests, and the Arcjet rate limiter ahead of both. The `supersedeId` is validated to be a row inside the caller's own session, so it cannot be used to supersede another reader's answer. A re ask draws from the same Tavily budget and spends the same guest try. No compliance scope is triggered, because the feature stores nothing new about a person and reads nothing new.

**Critical test scenarios** (each maps to an acceptance criterion above):
- Happy path: copy an answer, the icon checks for a second and the clipboard holds plain text with no fences or markers, verifies **AC-1**, **AC-3**
- Plain text: copy an answer containing a fenced block, a link and a bulleted list, and confirm the clipboard holds the words only, verifies **AC-1**
- Code block: copy one block and confirm the clipboard holds only that block and that its title is French in the French interface, verifies **AC-2**
- Happy path: re ask the most recent answer and the thread shows one answer, the new one, in the same position with no reload, verifies **AC-7**
- Accounting: re ask twice, the superseded rows keep their `toolCalls` and the Tavily budget reflects all three turns, verifies **AC-8**, **AC-9**
- Guest wall: a guest on their last try re asks and is refused with the wall, not a generic failure, verifies **AC-9**, **AC-11**
- Filtering: a session holding superseded rows renders only live rows from the first page and from a cursor paged older page, verifies **AC-8**
- Stale target: a re ask aimed at an answer that is no longer the latest live one is refused with 409 and no row is superseded, verifies **AC-15**
- Touch: the controls are in the page and a tap reaches copy and re ask without any hover, verifies **AC-4**
- Streaming: no action row is present while an answer streams and it appears once the answer settles, verifies **AC-5**
- Disabled: re ask is disabled with a stated reason when the preceding turn has no typed text, and no request is sent, verifies **AC-12**
- Shared verdict: re ask an answer that was shared, the old verdict link still resolves, verifies **AC-10**
- Auth: a reader cannot supersede an answer in a session that is not theirs, verifies **AC-14**

## Build plan

Ordered by Journey, so each step leaves the thread usable and the reader never meets a half built control.

1. Migration: add the nullable `supersededAt` to `ChatMessage`, with no default and no backfill, since every existing row is live by definition. Satisfies **AC-8**.
2. Server, the filter rule: filter `supersededAt` blank in the one read that renders a thread, and record the four paths that must not filter, with the reason each one breaks. Satisfies **AC-7**, **AC-8**, **AC-10**.
3. Server, the re ask: add optional `supersedeId` to the transport body, validate it is the latest live answer of the caller's session or answer 409, then stamp the old row and insert the new one in a single transaction, leaving the sequence assignment unfiltered. Satisfies **AC-6**, **AC-7**, **AC-8**, **AC-15**.
4. Server, the charge: extend the count the transport actually uses, which is the inline recount rather than the helper, so a superseded assistant row spends a guest try alongside a user row. Satisfies **AC-9**.
5. Client, the action row: copy on every message, with the Markdown to plain conversion, the check confirmation, and the existing bilingual failure message. Always mounted, visible on hover or focus. Satisfies **AC-1**, **AC-3**, **AC-4**.
6. Client, the strings: add every new key to both language halves of the dictionary, and supply Streamdown's `translations` prop so the code block control is not left in English. Only strings are configured here, never the `components` override, so Streamdown keeps rendering the block itself. Satisfies **AC-2**, **AC-4**, **AC-13**.
7. Client, the re ask: the control on the most recent settled answer, resending the preceding question with `supersedeId`, hiding the answer being replaced while the stream runs, disabling while running, and mapping the guest wall to the wall message rather than the generic failure. Satisfies **AC-5**, **AC-6**, **AC-7**, **AC-11**, **AC-14**.
8. Client, the settled state: drop the replaced answer from the mounted pages on finish so no reload is needed, and guard re ask in the client when the preceding turn has no typed text. Satisfies **AC-7**, **AC-12**.
9. Surface pass: keyboard reach, focus visibility, reduced motion, touch target size, and both languages across every control. Satisfies **AC-4**.

## Consequences

**Positive**:
- A reader can forward a verdict without retyping it, which is the single most common thing they will do with the product.
- A reader who does not trust an answer can re ask without losing the conversation or starting a new thread.
- The budget and the guest wall cannot be quietly bypassed, because a re ask is a row like any other.
- Nothing new to operate. No new provider, no new table, no new background job, and no reliance on an SDK code path this client does not use.

**Negative / tradeoffs**:
- The filter rule is asymmetric and therefore easy to get backwards. Four paths must deliberately not filter, and two of them fail silently rather than loudly: the budget under counts, or a shared verdict stops resolving.
- Superseded rows accumulate. They are small, but a heavily re asked chat holds more rows than it displays, which affects nothing today and will matter if per user storage caps ever arrive.
- The guest wall counter no longer equals the number of messages a guest sent, so it stops being obvious from the data alone.
- Re ask re runs the agent tools, so it costs real Tavily calls and real latency. A reader who taps it three times pays for three searches, which is intended but worth knowing.
- Copy must convert Markdown to plain text, which is new code and a place where the output can differ from what the reader sees. Rendering is the source of truth for what is copied, not the stored string.
- Turning a message into a control is the first interaction added inside the thread. It is a small surface, and small surfaces are where the tap bug in the rail menu came from.

**Neutral**:
- The vendored `MessageBranch` primitives stay unused. A deliberate choice, not an oversight.
- Only the new controls are styled. The rest of the thread keeps its shipped appearance.

## Follow-up

- [ ] `ai-sdk`, `frontend-design` and `tailwindcss` conventions are installed but not referenced from `AGENTS.md`, which has no `## Agent skills` section. `ai-sdk` governs how `useChat` and the transport behave and applies to every chat task, so it belongs in the root file; `tailwindcss` is project wide for the same reason; `frontend-design` is narrower and can wait for the first restyle.
- [ ] The `tokenUse` column on `ChatMessage` is read but never written, so no accounting depends on it. Either start writing real values or drop the column, as a separate decision.
- [ ] The client never seeds the AI SDK's own message state and renders the thread from fetched pages instead. Any future SDK feature that depends on that state, such as `regenerate` or `resumeStream`, will hit the same wall this design worked around.
- [ ] Mark the vendored `MessageBranch` primitives in `src/components/ai-elements/message.tsx` as unused for this feature, so a later reader does not read them as a gap.

## Rationale

Reasoning and options: see `rationale.md`.
