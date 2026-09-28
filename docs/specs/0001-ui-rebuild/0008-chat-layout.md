# 0008. Dedicated chat layout

**Date**: 2026-09-26

## Summary

Chat leaves the marketing shell: a `(chat)` route group owns an immersive full height layout with rail, thread, dossier, and a user card, while `(site)` keeps the header and footer for everything else. The dossier light theme carries over, new chats land unfiled, and `proxy.ts` guards the protected routes.

## Requirements

**User stories**:
- As a chatter, I want chat full screen without marketing chrome so that checking feels immersive.
- As a signed out visitor, I want protected pages to send me to sign in and back, so that I never hit a dead wall.
- As an organizer, I want per folder creation plus move to folder, so that filing happens where I look.

**Acceptance criteria**:
- **AC-1**: `/chat` renders with no site header or footer, full viewport height, dossier light theme.
- **AC-2**: the rail foot shows the user card (avatar, name, plan) opening settings and sign out.
- **AC-3**: each folder offers new chat inside it; any session offers move to folder; default stays unfiled.
- **AC-4**: `proxy.ts` redirects signed out visitors from `/settings` and `/admin` to `/signin?next=`, and signed in visitors from `/signin` to `/chat`.
- **AC-5**: guests keep reaching `/chat` (tries enforced per action, never by the proxy).
- **AC-6**: existing routes, metadata, and SEO entries survive the group move unchanged.

## Options considered

### Option 1: Route groups with proxy gate

`(site)` and `(chat)` groups under one root, `proxy.ts` redirects by session.

**Pros**:
- Framework native split, one root for fonts and providers, per group shells.
- Proxy runs before render, so protection never flashes.

**Cons**:
- Moving files churns imports and route manifests once.

### Option 2: Pathname hiding in the shared shell

Keep one layout, hide header and footer on `/chat` by path.

**Pros**:
- No file moves.

**Cons**:
- One shell serves two masters forever; every shell change risks the other.

## Decision

**Chosen option**: Option 1: Route groups with proxy gate

Root keeps fonts, providers, metadata, and the language script; `(site)` owns header plus footer; `(chat)` owns the immersive shell; `proxy.ts` enforces session routing with the API, static, verify, and reset paths excluded.

## Rationale

The user asked for a layout of its own, different from the root, and pathname hiding is exactly the halfway state that rots. Groups cost one careful move and pay back every later shell change. Guests must pass the proxy because tries are the product loop, enforced per action where the counters live.

## Feature design

**Data model sketch**:
No new tables. Moves only.

**State transitions**:
Signed out on `/settings` or `/admin` to `/signin?next=<path>`; signed in on `/signin` to `/chat` (or `?next=` when present).

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `proxy.ts` matcher | edge | path, session cookie | rewrite or redirect | cookie session | - |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| gate check | signed in yes or no | Better Auth session via `auth.api.getSession` on request headers |
| redirect target | post login landing | `?next=` param, default `/chat` for gate, `/` after sign out |
| user card | avatar plus name | session user, initials fallback per 0002 |

**Key invariants**:
- Guests always reach `/chat`; the wall lives at send, upload, and lookup.
- Verify, reset, API, and static paths never redirect.
- Group moves change paths of files, never URLs.

**Security model**:
Proxy is UX routing only; every API rechecks the session and ownership server side per existing specs.

**Configuration required**: none.

**Critical test scenarios**:
- Happy path: signed out `/settings` lands on `/signin?next=/settings`, sign in returns there, verifies **AC-4**
- Failure case: guest opens `/chat` directly and gets 2 tries, verifies **AC-5**
- Auth/permission: signed in `/signin` bounces to `/chat`, verifies **AC-4**

## Build plan

1. Add `proxy.ts` with matcher plus session routing, satisfies **AC-4**, **AC-5**
2. Move pages into `(site)` and `(chat)` groups with per group layouts, satisfies **AC-1**, **AC-6**
3. Build user card plus per folder create plus move to folder, satisfies **AC-2**, **AC-3**

## Consequences

**Positive**:
- Each shell evolves without touching the other.
- Protection happens before first paint.

**Negative / tradeoffs**:
- One noisy move commit; imports must be rechecked.

**Neutral**:
- `proxy.ts` runs on the edge; keep it light (session read only, no DB).

## Follow-up

- [ ] Consider rate limiting at the proxy edge later; Arcjet per route stays authoritative.

## Amendments (build pass, 2026-09-26)

- Root `proxy.ts` never registered (empty middleware manifest on build); the same file as `src/middleware.ts` registers correctly, so the gate lives there with identical logic.
