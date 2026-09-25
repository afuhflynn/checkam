# 0005. Chat shell (AI Elements streaming)

**Date**: 2026-09-25

## Summary

A rail thread dossier atelier renders the memory model: folders rail plus streaming thread plus evidence dossier with an always visible composer. AI Elements own chat surfaces with `useChat` streaming keyed to per message sequence, shadcn owns the chrome, and the Verdict Seal stamps once when the verdict lands. Flyers ride the storage seam from local dev to Vercel Blob in prod and delete with chat purge.

## Requirements

**User stories**:
- As a chatter, I want rail plus thread plus proof in one screen so that checking feels like case work.
- As a phone user, I want thread first with drawers so that my thumbs reach the work.
- As a guest, I want the wall to keep my draft so that signing in loses nothing.
- As a waiter, I want stream plus seal so that waiting ends in proof.

**Acceptance criteria**:
- **AC-1**: desktop shows rail plus thread plus dossier, phone shows thread with rail and dossier as drawers.
- **AC-2**: answers stream token by token through `useChat` keyed to per message sequence, calm skeleton first.
- **AC-3**: the seal stamps in the dossier when the verdict value arrives with the bubble linking to it, static under reduced motion.
- **AC-4**: the composer holds text plus flyer attach plus phone lookup plus guest counter hint plus send, always visible.
- **AC-5**: flyers cap at 10MB PNG JPG WebP PDF with preview plus clear plus inline errors, stored local in dev and Blob in prod, deleted with purge.
- **AC-6**: stop halts the stream keeping partial text marked stopped, retry resends from the kept draft.
- **AC-7**: the guest wall locks the composer showing tries left plus sign in, draft kept intact.
- **AC-8**: an empty rail offers bilingual one tap sample prompts for text plus flyer plus lookup.
- **AC-9**: a failed turn shows what failed plus retry from the kept draft, verdict never faked.
- **AC-10**: offline holds the draft and queues the send with a clear state.
- **AC-11**: lists, thread, and counter read the `0004-chat-memory` query keys with invalidation on every mutation.

## Options considered

### Option 1: Elements chat plus shadcn chrome

AI Elements thread, message, composer, and actions for conversation; shadcn card, badge, button, progress, dialog, and dropdown for rails, dossier, and menus.

**Pros**:
- Each kit does what it owns, chat behavior arrives tested.
- Matches the owned set with only dialog plus dropdown plus avatar added.

**Cons**:
- Two styling voices to harmonize through tokens.

### Option 2: All shadcn custom chat

Hand built bubbles, stream state, and composer on the owned set.

**Pros**:
- One kit, full control of every pixel.

**Cons**:
- Rebuilds streaming and composer behavior the Elements already own.

### Option 3: Thread only shell

No rail or dossier panes, history in a modal.

**Pros**:
- Smallest screen to build.

**Cons**:
- Hides folders and proof, against the atelier pick.

## Decision

**Chosen option**: Option 1: Elements chat plus shadcn chrome

`useChat` over the chat transport with stop plus retry keyed to `0004-chat-memory` sequences, dossier fed by the active turn verdict, storage seam kept with Blob in prod, design tokens from the umbrella with tool file plus frames still owed.

## Rationale

Conversation behavior is the hard part and the Elements own it, while rails, seals, and dialogs are plain chrome the owned set covers. The atelier needs all three panes because folders organize and the dossier proves, which a thread alone cannot do. Vercel Blob won storage for the simplest delete story through the existing seam, with UploadThing as runner up and local kept for dev.

## Feature design

**Data model sketch**:
No new tables. Reads `ChatFolder`, `ChatSession`, `ChatMessage` per `0004-chat-memory` keys. Drafts live client side until send. Uploads reference storage keys attached to the message attachments JSON.

**State transitions**:
idle to streaming to sealed on verdict, with stopped and failed branches back to idle through retry. Composer states are ready, locked by wall, and offline queued. Drawers open and close without losing thread state.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| chat transport | POST stream | session id, text, attachment key, no seq | token events plus verdict event plus done event | owner verified or guest key | 401, 403, 409, 429 |
| upload | POST | file 10MB, session id | storage key plus signed preview url 1h | owner verified or guest key | 400, 401, 403, 413, 429 |
| lookup | GET | phone normalized E.164 Cameroon | registry plus flagged match | owner or guest key | 400, 429 |
| new session | POST | folder id optional | session id | owner or guest key via `0004-chat-memory` sessions | 401, 422 |

CRUD for folders, sessions, and messages is owned by `0004-chat-memory`.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| rail | folders plus sessions | `0004-chat-memory` list keys |
| thread | ordered bubbles | `0004-chat-memory` thread key ordered on `seq` |
| stream | tokens plus verdict | chat transport SSE token events, verdict event carries the rules engine output of verdict plus score plus evidence ids produced through the `0006-agent` call |
| seal | stamp moment | verdict event arrival, static with reduced motion |
| dossier proof | bullets plus source | `ChatMessage.verificationId` to `ScamVerification` bullets plus official site, warning copy from i18n keys |
| shell copy | prompts plus errors plus offline plus stopped plus failed plus seal | `src/lib/i18n/dictionary.ts` keys in both languages, nothing invented |
| counter hint | tries left | `0004-chat-memory` counter API |
| preview | flyer image | storage seam key `chat/{sessionId}/{messageId}/{filename}`, local dev plus Blob prod, PDF shows first page or icon fallback |
| wall | lock plus draft | unverified block first through the `0002-auth` gate helper, then guest cap through the `0004-chat-memory` counter with server wins |
| queue | held offline sends | localStorage FIFO queue surviving reload, flushed in order with wall rechecked |

**Key invariants**:
- Composer stays visible in every state, offline queues instead of blocking.
- Shell sends carry no sequence, the server claims it on persist per `0004-chat-memory`, stream chunks carry none.
- Send and upload pass the unverified block first, then the guest cap with server wins.
- Verdict seal fires exactly once per turn on verdict arrival.
- Stopped partial text stays client side marked stopped, retry resends the kept draft as a new turn.
- Stored uploads delete from Blob on purge only, restore inside the window keeps them.
- Drafts survive wall, drawer, and reload until sent or cleared.

**Security model**:
Owner or guest key on every call per `0004-chat-memory` guards. Uploads validate type plus size client and server side. Storage keys are unguessable and scoped to the session.

**Configuration required**:
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob prod driver
- Chat transport model and budget owned by `0006-agent`

**Critical test scenarios**:
- Happy path: send to stream to seal with dossier proof, verifies **AC-2**, **AC-3**
- Failure case: failed turn shows error plus retry with kept draft, verifies **AC-9**
- Auth/permission: guest wall locks composer at zero tries with draft kept, verifies **AC-7**

## Migration plan

**Strategy**: no migration needed
**Phases**:
1. Ship shell against the `0004-chat-memory` APIs with the storage seam defaulting local, flip prod driver to Blob at deploy.
**Rollback**: revert the commit, memory rows persist untouched.
**Risks**: Elements plus shadcn token drift, contained by building both from umbrella tokens first.

## Build plan

1. Build rail plus thread plus dossier frames with drawers, satisfies **AC-1**
2. Wire `useChat` streaming plus skeleton plus stop plus retry, satisfies **AC-2**, **AC-6**
3. Build composer with attach plus lookup plus counter hint plus wall lock, satisfies **AC-4**, **AC-7**
4. Build dossier with seal on verdict plus proof plus forward warning, satisfies **AC-3**
5. Wire upload seam with preview plus guards plus Blob prod plus cascade, satisfies **AC-5**
6. Cover empty plus error plus offline states with query keys, satisfies **AC-8**, **AC-9**, **AC-10**, **AC-11**

## Consequences

**Positive**:
- Chat becomes a real home with proof beside it.
- Kits split cleanly, each doing what it owns.

**Negative / tradeoffs**:
- Two kit voices need token discipline or the screen frays.
- Blob adds a billed dependency with volume to watch.

**Neutral**:
- Design tool file plus frames still owed before pixel build.

## Follow-up

- [ ] Connect a design MCP and name the shell file plus frames.
- [ ] Confirm Blob budget guardrails at build.
- [ ] Consider installing community skills for AI Elements plus AI SDK conventions before build.
## Amendments (peer review pass, 2026-09-25)

- Transport takes the persisted user sequence and excludes the current turn from the wall recount: single enforcement, no double charge.
- Repeat texts reuse stored facts for rules (extraction cache honored) with a fresh answer each turn.
- Title fallback capped at 60 chars per AC-5; drafts scrubbed like answers.
- Rail pages by cursor with 30 second stale keys; thread reads through its query key so invalidation refetches.
- Uploads and lookups pass the guest cap and Arcjet; folders require verified writes.
- Accepted deviations: offline queue drops attachments and is FIFO best effort; reload restores answer text but not the seal (fallback path).

