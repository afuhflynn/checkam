# 0001 - CheckAm UI rebuild (umbrella)

**Status:** Accepted
**Date:** 2026-09-25
**Build approach:** Journey (one full user path at a time, each phase usable)
**Scope:** `docs/scope/scope.md` features 1–9

## Summary

Rebuild CheckAm around one calm flow: landing invites trust, signed in chat does the work, settings and WhatsApp guide support it. The verify engine, rules, and registry stay as they are; the rebuild adds auth depth, persistent chat with an agent, mail, and a dossier identity on the shadcn base. Guest visitors may try 2 chats per day, then a sign in wall.

## Structure

Child specs, one per load bearing decision (each buildable on its own):

- `0002-auth.md` ([auth refresh](0002-auth.md), written `Proposed`) - password + Google + email verify + password reset + user button (scope 2)
- `0003-mail.md` ([mail plumbing](0003-mail.md), written `Proposed`) - Nodemailer sender through Inngest jobs: verify, reset, welcome (scope 3)
- `0004-chat-memory.md` ([chat memory](0004-chat-memory.md), written `Proposed`) - `ChatFolder` / `ChatSession` / `ChatMessage` model, ownership, retention, guest cap (scope 5)
- `0005-chat-shell.md` ([chat shell](0005-chat-shell.md), written `Proposed`) - AI Elements thread, streaming via AI SDK, folders rail, composer, upload + lookup (scope 4)
- `0006-agent.md` ([agent tools](0006-agent.md), written `Proposed`) - tools (Tavily web search, registry + flagged lookup, verify call), reviewed versioned prompts, safety limits (scope 6)
- `0007-shell.md` ([shell](0007-shell.md), written `Proposed`) - landing desk, lean settings, WhatsApp guide (scope 1, 7, 8; amended 2026-09-30 to carry settings as a dialog over the chat thread, scope 17)
- `0008-chat-layout.md` ([chat layout](0008-chat-layout.md), written `Proposed`) - route group shells, proxy routing, user card, folder actions (scope 10)
- `0009-thread-sync.md` ([thread sync](0009-thread-sync.md), written `Proposed`) - windowed thread, older pages, SSE plus poll freshness (scope 11)
- `0010-proxy-edge-limits.md` ([edge rate limits](0010-proxy-edge-limits.md), written `Proposed`) - Arcjet sliding windows at the proxy with tiered caps (scope 13)
- Visual polish direction (scope 9) lives in the Design section below and applies to every child.

Cross child contracts: rules decide every verdict and AI never does; all user strings ship EN + FR; chat messages may link a `ScamVerification`; mail state is the `emailVerified` flag on the user row plus the Inngest run history.

## Requirements

- AC-1: a visitor reaches sign in or a first check within 2 taps from landing, in EN and FR, on phone and desktop.
- AC-2: sign up verifies by mail, Google joins in one tap, reset recovers accounts with link plus OTP paths under caps and honest mail states, avatar menu holds settings + sign out.
- AC-3: verify, reset, and welcome mails deliver through queued jobs with retries and logs.
- AC-4: chat streams answers, accepts flyer upload and phone lookup, and shows calm loading, empty, and error states.
- AC-5: history persists across reload, folders organize sessions, guest wall enforces 2 tries per day by browser id + IP hash.
- AC-6: agent answers stay grounded via tools; prompts are reviewed, versioned, and stored; verdicts still come from rules.
- AC-7: settings edits profile, language, and password on one page with instant save notes.
- AC-8: the WhatsApp guide teaches the flow and opens a chat in 3 steps or fewer.

## Decision

Reuse the live stack (Next.js, Better-Auth, Prisma + Postgres, Inngest, AI SDK, TanStack Query, Arcjet) and add only what the rebuild needs: Google provider on Better-Auth, Nodemailer SMTP transport triggered by Inngest, Tavily for web search, `ChatFolder` / `ChatSession` / `ChatMessage` tables, AI Elements for chat surfaces. No new ORM, host, or mail provider beyond these; anything else becomes spec follow-up, not silent choice.

## Design

Dossier identity on the shadcn base (applies to every child; full direction in `rationale.md`):

| Token | Value | Use |
|---|---|---|
| Ink dossier | `#101828` | text |
| Authority night | `#0B192C` | header, footer, CTA ground |
| Paper desk | `#F6F2E9` | page ground |
| Paper deep | `#EFE9DA` | recessed panels |
| Quittance green | `#16A34A` | success, verified seal |
| Seal red | `#DC2626` | high risk seal |
| Caution gold | `#D97706` | caution only |

Type: `Fraunces` display (hero, seal, folder names, sparing), `Public Sans` body, `IBM Plex Mono` filing labels (hotline 8202, verdict codes, timestamps, FR/EN switch). Structure from owned shadcn pieces (`button`, `card`, `badge`, `input`, `textarea`, `tabs`, `progress`); add `dropdown-menu`, `avatar`, `dialog`, `skeleton` only when a child needs them. Signature: the Verdict Seal, one orchestrated stamp moment per result (press + settle), everything else quiet; reduced motion respected.

## Build plan

Ordered by the Journey paths; each child spec carries its own atomic tasks.

- [ ] Path 2 first: `0002-auth` + `0003-mail` (identity and trust before chat).
- [ ] Path 3: `0004-chat-memory` (model + migration), then `0005-chat-shell`, then `0006-agent`.
- [ ] Path 1 + 4: `0007-shell` (landing desk, settings, WhatsApp guide), then polish pass per the Design table.
- [ ] Close each child per the GA tail: `/verify-release`, `/test-engineer`, fresh model `/peer-review`, `/tech-writer`.

## Consequences

- Chat becomes the product home; the old intake hub remains as the landing desk, not a second product.
- Guest abuse surface grows; Arcjet + the daily cap + IP hash contain it, and limits are observable for tuning.
- Prompt and tool sprawl is contained by versioning and one owner per prompt.

## Follow-up

- Google Cloud OAuth credentials for dev + production (see `.env.example`).
- SMTP credentials and sender reputation for `EMAIL_FROM`.
- Tavily key and per day budget.
- Agent Skills discovery for the stack (engineer chose “find them”): Next.js, Tailwind, Prisma, Better-Auth, Inngest, Nodemailer, AI SDK, testing candidates to offer before child builds.

## Rationale

See `rationale.md` in this directory (context, options considered, why Journey + GA, token critique).
