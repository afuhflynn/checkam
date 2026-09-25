# 0004. Chat memory plus folders plus caching

**Date**: 2026-09-25

## Summary

`ChatFolder` owns `ChatSession` owns `ChatMessage` with rich bodies ordered by per session sequence, guest tries persist ownerless and merge on sign up, and delete feels safe through confirm plus 30 day undo. The guest counter API enforces 2 tries per day with the server as truth and a cookie as fast mirror. One migration adds the tables, history lives until the user deletes it.

## Requirements

**User stories**:
- As a signed in user, I want folders plus sessions plus history so that my checks stay organized.
- As a guest, I want my 2 tries kept so that signing up keeps what I started.
- As a forgetful deleter, I want confirm plus undo so that a slip never loses history.
- As the gate wall, I want one counter API so that guest limits read from one owner.

**Acceptance criteria**:
- **AC-1**: folders, sessions, and messages persist and the rail lists them newest first with pins on top.
- **AC-2**: messages stay exactly ordered through per session sequence numbers claimed in a transaction with 3 retries, streams included; stream chunks carry no sequence, only the final message row does.
- **AC-3**: guest tries persist as ownerless sessions with nullable folder, keyed by browser id, and merge into the default folder on sign up exactly once.
- **AC-4**: the counter API enforces 2 message sends per calendar day Africa Douala by browser id plus IP hash, cookie mirrors for instant paint, server wins mismatch.
- **AC-5**: titles draft after the first assistant answer in thread language capped at 60 chars, stay renamable, and fall back to date plus first words on timeout past 10s.
- **AC-6**: session delete asks inline confirm then offers undo with toast restore, folder delete names the session count in a dialog then cascades with undo; all copy from i18n keys in both languages.
- **AC-7**: the rail pages by cursor of pinned plus updated at plus id at 20 per page with title search plus pin to top.
- **AC-8**: every read and write filters by owner, guest rows by browser id from the signed cookie, password writes need `emailVerified`, admin never lists chats.
- **AC-9**: soft deleted rows purge after 30 days through a daily Inngest cron.
- **AC-10**: two tabs appending at once keep both messages in sequence order, never silent overwrite.
- **AC-11**: session lists cache 30s and thread reads stay fresh, every create plus update plus claim plus delete plus restore invalidates its keys.
- **AC-12**: messages may link a `ScamVerification` through a nullable id sourced from the `0006-agent` verdict call.

## Options considered

### Option 1: Folder tree plus sequence plus soft delete

Folders own sessions own messages, append order by claimed sequence, deletes set `deletedAt` with a 30 day purge, guest rows persist ownerless for claim.

**Pros**:
- Matches the case file rail, exact order, forgiving delete in one model.
- Guest to account claim keeps the growth loop.

**Cons**:
- Soft delete plus purge job is more machinery than hard delete.

### Option 2: Flat sessions with tags

No folders, tags organize, hard delete at once.

**Pros**:
- Smaller schema and simpler delete.

**Cons**:
- Loses the folder rail the engineer chose and makes delete unforgiving.

### Option 3: Memory only guest tries

Guest chats vanish on refresh, only signed in history persists.

**Pros**:
- No anonymous rows to own or purge.

**Cons**:
- Kills try then keep, the reason guest persistence won.

## Decision

**Chosen option**: Option 1: Folder tree plus sequence plus soft delete

Prisma models with unique sequences per session, claim on sign up, server authoritative counter with cookie mirror, drafted titles with rename, confirm plus undo delete UX, cursor rail with search plus pin.

## Rationale

History is the product promise, so the model favors keeping over trimming: folders for organization, sequences for exact order, soft delete for forgiveness, guest persistence for conversion. The server wins counter rule keeps the wall honest while the cookie keeps it instant. Title drafting is owed to the agent child with a shell fallback so this spec never blocks on model behavior.

## Feature design

**Data model sketch**:
`ChatFolder` (id, `ownerId` FK User, name, `pinned`, `deletedAt` nullable, timestamps). `ChatSession` (id, `ownerId` nullable FK User, `folderId` nullable FK, title, `guestKey` nullable for browser id, `pinned`, `deletedAt` nullable, timestamps; guest rows stay unfiled until claim maps them into the auto default folder created at sign up). `ChatMessage` (id, `sessionId` FK, `seq` int, role, text, attachments JSON, toolCalls JSON, tokenUse JSON, `verificationId` nullable FK to `ScamVerification`, timestamps; unique `sessionId` plus `seq`, index on `sessionId` plus `updatedAt`). Guest counter is derived from ownerless sessions per `guestKey` plus IP hash per calendar day Africa Douala, no extra table. Claim reruns are no ops once no ownerless rows remain for the pair.

**State transitions**:
active to soft deleted to purged. Guest ownerless to claimed on sign up. Title draft to renamed by user at any time. Purge runs on schedule past 30 days.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| folders | GET, POST | name | folder list, id | session owner | 401, 422 |
| folder id | PATCH, DELETE | name, pin, confirm | folder, undo token | session owner | 401, 404, 409 |
| sessions | GET, POST | folder id, cursor, search | session page, id | session owner or guest key | 401, 422 |
| session id | PATCH, DELETE | title, folder, pin, confirm | session, undo token | owner or guest key | 401, 404, 409 |
| session messages | GET, POST | cursor, seq claim | message page, message | owner or guest key | 401, 404, 409 |
| guest counter | GET | browser id | tries left today | public, Arcjet capped | 429 |
| claim | POST | guest key | merged counts | fresh session, idempotent on guest key plus user id | 401, 409 |
| restore | POST | undo token single use 30d | restored row, 409 when already restored, 410 past window | owner | 401, 404, 409, 410 |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| rail list | folders plus sessions newest first | `ChatFolder` plus `ChatSession` rows by owner, cursor page |
| thread | ordered messages | `ChatMessage` rows by `sessionId` ordered on `seq` |
| wall | tries left today | counter API over ownerless sessions by `guestKey` plus IP hash, cookie mirror |
| title | drafted title | `0006-agent` title action from the first exchange, fallback date plus first words in shell |
| delete | undo token plus restore | soft delete `deletedAt` plus restore endpoint inside 30 days, folder cascade restores folder plus sessions plus messages |
| claim | merged history | guest key match at sign up moving rows to the default folder, rerun no op |
| thread read | fresh messages | `ChatMessage` rows by `sessionId` ordered on `seq`, no stale cache |
| rail read | cached lists | TanStack Query keys `chat:folders`, `chat:sessions:{folder}`, `chat:thread:{session}`, `chat:counter` at 30s stale, invalidated on every mutation plus claim plus restore |
| guest id | browser id plus IP hash | crypto random id in `checkam_guest` cookie Secure plus SameSite Lax 1yr, IP hashed SHA 256 with secret salt |

**Key invariants**:
- `sessionId` plus `seq` stays unique, appends claim the next sequence in a transaction with 3 retries.
- Every chat read and write filters by owner or guest key from the signed cookie, password writes need `emailVerified`, no admin read path exists.
- Soft deleted rows hide everywhere except restore until the daily purge.
- One guest key plus IP hash gets 2 message sends per calendar day Africa Douala.
- Claim moves rows exactly once per guest key plus user id pair.
- Delete and empty and error copy comes from i18n keys in both languages, never invented strings.

**Security model**:
Owner only always, guest rows keyed by unguessable browser id, undo tokens single use and owner bound. No chat content in logs. Purge is a system job.

**Configuration required**:
- Purge schedule for 30 day soft deleted rows (existing Inngest client, new scheduled function).

**Critical test scenarios**:
- Happy path: chat to reload keeps order and titles, verifies **AC-1**, **AC-2**, **AC-5**
- Failure case: two tab append keeps both messages, verifies **AC-10**
- Auth/permission: another user reads nothing, admin lists nothing, verifies **AC-8**

## Migration plan

**Strategy**: single migration, fresh tables, no live data to transform.
**Phases**:
1. Ship migration with the four model additions plus indexes, code reads old paths until the shell cuts over.
**Rollback**: revert the commit and drop the new tables, nothing else references them.
**Risks**: sequence contention under parallel appends, contained by the unique pair plus claim retry.

## Build plan

1. Migrate the three new tables plus indexes, satisfies **AC-1**, **AC-2**
2. Build session plus message CRUD with sequence claim, satisfies **AC-1**, **AC-2**, **AC-10**
3. Build guest persist plus claim plus counter API with cookie mirror, satisfies **AC-3**, **AC-4**
4. Build titles draft plus rename plus fallback, satisfies **AC-5**
5. Build confirm plus undo delete UX with counted folder dialog plus toasts, satisfies **AC-6**
6. Build cursor rail with title search plus pin plus daily purge job plus owner guards plus query keys, satisfies **AC-7**, **AC-8**, **AC-9**, **AC-11**, **AC-12**

## Consequences

**Positive**:
- History, folders, and guest claim make chat a home.
- Forgiving delete earns trust with private data.

**Negative / tradeoffs**:
- Soft delete plus purge plus claim is real machinery to own.
- Anonymous rows grow until purge, watch volume.

**Neutral**:
- Title quality depends on the agent child with a plain fallback.

## Follow-up

- [ ] `0006-agent` owes the title draft action used by **AC-5**.
- [ ] Name purge schedule cadence at build.
- [ ] Consider installing community skills for Prisma conventions before build.
