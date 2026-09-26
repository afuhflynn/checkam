# 0009. Virtual thread plus realtime sync

**Date**: 2026-09-26

## Summary

Long threads stay smooth through a windowed list (50 per page, 3 pages in DOM, scroll anchored), and history stays fresh through poll plus focus plus a hold open SSE endpoint. First load shows the latest page; scrolling up pages older turns in while far pages leave the DOM; once everything is loaded it all stays.

## Requirements

**User stories**:
- As a long history owner, I want smooth scrolling on a weak phone so that big threads never jank.
- As a two tab user, I want the other tab's turns to appear so that history never lies.
- As a guest, I want the same paging without sign in so that tries feel instant.

**Acceptance criteria**:
- **AC-1**: first load renders the latest 50 with correct scroll bottom.
- **AC-2**: scrolling up near the top loads the next older page prepended with scroll position held (no jump).
- **AC-3**: beyond 3 pages, the farthest page leaves the DOM; scrolling back down restores from cache without refetch.
- **AC-4**: fully loaded threads keep everything mounted.
- **AC-5**: new turns (own sends, other tabs, other devices) appear within seconds through SSE, with 30 second poll plus focus refetch as backup.
- **AC-6**: guest threads page identically through the same endpoint and keys.

## Options considered

### Option 1: Windowed pages with hold open SSE

IntersectionObserver top sentinel plus 50 by 3 DOM window plus scroll anchoring; SSE endpoint holds up to 25 seconds watching `updatedAt`, client reconnects; poll plus focus behind it.

**Pros**:
- Bounded DOM on any thread length; freshness without infrastructure (no Redis, no extra service).
- Degrades gracefully: SSE drops, poll covers.

**Cons**:
- Hold open ties one server slot per viewer for up to 25 seconds.

### Option 2: Full list plus refetch

Render everything, refetch on an interval.

**Pros**:
- Simplest code.

**Cons**:
- Long threads jank weak phones; exactly what the user rejected.

## Decision

**Chosen option**: Option 1: Windowed pages with hold open SSE

Messages API gains `before` (older than seq, newest first page) beside `after`; thread reads through the `["chat","thread",sessionId]` key at 30 second stale; rail lists poll at 30 seconds with focus refetch.

## Rationale

The user described windowed paging precisely (page in on scroll up, far page out, everything stays once fully loaded), so the spec mirrors it: 50 by 3 per their pick. SSE plus poll plus focus is their pick for freshness; hold open SSE needs no new infrastructure on Postgres, and the poll covers drops.

## Feature design

**Data model sketch**:
No new tables. Reads `ChatMessage` ordered by `seq`; pages keyed by boundary sequences.

**State transitions**:
Live window (up to 3 cached pages around the viewport) to fully loaded (all pages mounted, sentinels retired).

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| messages | GET | `before?: seq`, `after?: seq`, `limit?` | rows newest first for `before`, oldest first default, `hasMore` | owner or guest key | 401, 404 |
| stream | GET | `sessionId`, `since` (ISO) | SSE `ping` plus `change` events, 25s max | owner or guest key | 401, 404 |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| first paint | latest 50 | messages with no cursor, desc, scoped per 0004 |
| page up | older 50 | messages with `before` set to the oldest mounted seq |
| freshness | change pings | stream endpoint watching session plus message `updatedAt` |
| backup freshness | 30s poll plus focus | TanStack Query `refetchInterval` plus focus refetch |

**Key invariants**:
- At most 3 pages mounted unless fully loaded.
- Prepend never jumps: scroll offset preserved by height delta.
- SSE is a hint channel; poll plus focus remain authoritative.

**Security model**:
Stream and pages enforce the same owner or guest key scoping as all chat reads.

**Configuration required**: none.

**Critical test scenarios**:
- Happy path: open a 200 turn thread, latest page shows, scroll up pages twice, verifies **AC-1**, **AC-2**
- Failure case: SSE drops mid session, poll still delivers new turns, verifies **AC-5**
- Auth/permission: stranger polls another session id and gets 404, verifies scopes

## Build plan

1. Add `before` paging to the messages endpoint, satisfies **AC-1**, **AC-2**, **AC-6**
2. Build the windowed thread with sentinel plus anchoring, satisfies **AC-2**, **AC-3**, **AC-4**
3. Build the stream endpoint plus client wiring plus poll backup, satisfies **AC-5**

## Consequences

**Positive**:
- Bounded DOM and fresh threads on any device.

**Negative / tradeoffs**:
- Hold open requests cost server slots; 25 second cap bounds it.
- Scroll anchoring math must be exact or loads feel jumpy.

**Neutral**: none.

## Follow-up

- [ ] Measure real thread lengths after launch; tune 50 by 3 from data.
