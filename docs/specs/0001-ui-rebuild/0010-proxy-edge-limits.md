# 0010. Proxy edge rate limits

**Date**: 2026-09-27

## Summary

Costly paths get capped at the proxy before they render pages or burn model calls. Arcjet (the traffic guard already guarding each API route) enforces sliding windows at the edge, with tight tiers on actions and loose tiers on reads. Legit readers never notice, capped visitors get words in both languages plus a retry time.

## Requirements

**User stories**:
- As an operator, I want floods stopped at the edge so that pages never render for bots and models never burn for scripts.
- As a reader on shared mobile data, I want my normal checks untouched so that caps never punish my neighbors.
- As a capped visitor, I want a plain slow down note plus a retry time so that I know what happened.

**Acceptance criteria**:
- **AC-1**: sustained floods against auth, verify, and chat send paths receive capped responses before render or model cost.
- **AC-2**: traffic inside starter tiers passes with no visible change and no extra latency worth naming.
- **AC-3**: reads cap near 100 per minute, auth actions near 10, chat send near 20, verify near 30, each enforced per path class below.
- **AC-4**: capped API callers receive JSON plus code plus retry headers; capped page visitors receive the bilingual slow down page rendered inline by the proxy with no new route.
- **AC-5**: client identity uses IP plus fingerprint, allowlisted callers skip caps, authed accounts get roomier tiers, every cap hit is logged.
- **AC-6**: Arcjet failure fails open with an alert, and dev mode logs without blocking.

## Options considered

### Option 1: Arcjet sliding windows at the proxy

Extend the proxy matcher to costly paths and enforce sliding windows through the Arcjet client already in the stack.

**Pros**:
- One vendor, one bill, one dashboard, same patterns as the route guards.
- Sliding windows forgive bursts while holding the line over time.

**Cons**:
- Every proxied request pays a guard lookup; adds vendor dependence to page renders.

### Option 2: Route guards only, no edge caps

Leave the proxy to session routing and keep all caps inside API routes.

**Pros**:
- Smallest change; page renders never wait on the guard.

**Cons**:
- Floods render full pages before any cap bites; the abuse path the scope row names stays open.

### Option 3: Custom counters in proxy memory

Hand rolled counts keyed by IP with fixed windows, no vendor call.

**Pros**:
- No extra vendor traffic on the hot path.

**Cons**:
- Resets on every deploy, no shared state across instances, easy to get wrong under concurrency.

## Decision

**Chosen option**: Option 1: Arcjet sliding windows at the proxy

The proxy matcher grows to cover costly API actions beside pages; sliding windows enforce tiered caps with fingerprint aware identity; capped responses carry retry hints; failures fail open with an alert.

## Rationale

The scope row exists because floods reach render and model cost before route guards engage, so route only coverage leaves the named gap open. Custom counters would trade a solved problem for deploy scoped memory the team must then operate. Arcjet is already paid for, already trusted in this codebase, and sliding windows match the confirmed burst friendly posture. The tight on actions shape follows the confirmed cost map: auth, verify, and chat send burn money or trust, reads do not.

## Feature design

**Data model sketch**:
No new tables and no migration. Caps are stateless at the proxy; counting lives in the Arcjet backing already used by route guards.

**API surface**:
| Path class | Paths | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|---|
| Reads | matched GET pages | GET | client key | pass or capped | none needed | inline slow down page |
| Auth actions (`/api/auth/*`) | signup, signin, resend, OTP checks | mixed | client key | pass or capped | none needed | 429 JSON plus code plus retry headers |
| Verify (`/api/verify`) | single POST | client key | pass or capped | none needed | 429 JSON plus code plus retry headers |
| Chat send (`/api/chat/transport`, upload, lookup, message append) | mixed | client key, session if present | pass or capped | authed tier when signed in | 429 JSON plus code plus retry headers |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Cap verdict per request | pass or capped | sliding window count from Arcjet backing for the path class |
| Retry seconds | seconds until retry | window reset from Arcjet verdict, sent as `Retry-After` plus `RateLimit-*` headers |
| Client key | identity for counting | request IP plus Arcjet fingerprint where present, IP fallback, no client work needed |
| Tier | strict guest, roomy authed | session presence from the existing proxy session read; authed tiers run near 3 times guest tiers |
| Precedence | who wins conflicts | allowlist beats authed beats guest |
| Allowlist pass | skip caps | `PROXY_ALLOWLIST` env config, comma separated IPs or CIDR ranges, exact or prefix match |
| Slow down copy | bilingual page text | user strings in both languages per repo rule, rendered inline, no new route |
| Capped JSON | error plus code body | fixed shape `{ error: "rate_limited", code: <path class> }` |
| Log row | path, hashed key, tier, verdict | structured log line per cap hit; alert is an error log with the `edge-cap` tag |

**Key invariants**:
- Guests always reach `/chat`; tries stay enforced per action, never by a page block.
- Starter tiers: reads near 100 per minute, auth near 10, chat send near 20, verify near 30; authed tiers near 3 times these; tuned from logs after launch.
- Capped page visitors always get words, never a bare code.
- Cap logs carry hashed client keys, never raw IPs or bodies.
- Dev mode logs cap verdicts without blocking, following the existing env convention; edge caps stay coarse while route guards stay fine grained.

**Key invariants**:
- Guests always reach `/chat`; tries stay enforced per action, never by a page block.
- Starter tiers: reads near 100 per minute, auth near 10, chat send near 20, verify near 30; tuned from logs after launch.
- Capped page visitors always get words, never a bare code.
- Cap logs carry hashed client keys, never raw IPs.

**Security model**:
Proxy caps are UX and cost protection, not authentication; every API rechecks session and ownership server side per existing specs. Allowlist entries live in env config, never in code. Cap hit logs avoid raw IPs and request bodies.

**Configuration required**:
- `PROXY_ALLOWLIST`: comma separated IPs or ranges that skip caps (health checks, office, monitors); empty means none.
- `ARCJET_KEY`: already present; no new vendor secret.

**Critical test scenarios**:
- Happy path: normal browsing plus checks inside starter tiers with no visible change, verifies **AC-2**
- Failure case: sustained flood against verify past the tier receives JSON plus code plus retry headers; a manual flood script judges pass or fail, verifies **AC-1**, **AC-3**, **AC-4**
- Auth/permission: allowlisted caller plus authed roomy tier pass where a guest flood stops, verifies **AC-5**

## Build plan

1. Extend the proxy matcher to costly API actions and wire sliding windows with tiered caps, satisfies **AC-1**, **AC-3**
2. Add authed tiers plus fingerprint identity plus env allowlist, satisfies **AC-3**, **AC-5**
3. Add JSON plus bilingual page capped responses with retry headers, satisfies **AC-4**
4. Add cap hit logging with hashed keys, dev log only mode, and fail open alert, satisfies **AC-5**, **AC-6**

## Consequences

**Positive**:
- Floods die before render and model cost.
- One guard system from edge to route.

**Negative / tradeoffs**:
- Every proxied request pays a guard lookup; watch p99 latency after launch.
- Shared mobile IPs still share budget slices; fingerprint softens this but cannot remove it.

**Neutral**:
- Starter tiers are guesses; the log tuning follow up is part of the design, not an afterthought.

## Follow-up

- [ ] Tune starter tiers from cap hit logs after launch.
- [ ] Revisit per account keys if shared IP pressure shows in logs.
- [ ] Name a concrete alert channel for the fail open path (error log with `edge-cap` tag ships first).
- [ ] Write the manual flood script the failure scenario names.
