# CheckAm — Verify Before You Pay

Bilingual (FR default, EN toggle) scam verification for Cameroon. Paste text, upload a flyer, or look up a phone or email, get a rules decided verdict with evidence plus a forwardable WhatsApp warning.

## Stack

- **Language / Runtime**: TypeScript 5 strict + Node + pnpm
- **Framework**: Next.js 16 (Turbopack) + React 19
- **Key dependencies**: Prisma 6 + PostgreSQL 16, Better-Auth, Inngest v4, AI SDK v7 via OpenRouter, TanStack Query, Arcjet
- **Package manager**: pnpm

## Build approach

Journey, one full user path at a time, each phase usable (decided in the rebuild scope conversation; scope file pending).

## Commands

```bash
pnpm install
pnpm dev          # next dev --turbopack, http://localhost:3000
pnpm build && pnpm start
pnpm check        # biome check
pnpm lint         # biome lint
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run
pnpm db:generate && pnpm db:push && pnpm db:seed
docker compose up -d   # Postgres 16 on :5454 + uploads volume
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`.

## Rules

- Rules decide the verdict (`HIGH_RISK` / `CAUTION` / `VERIFIED_OFFICIAL`); AI only extracts facts, never the verdict.
- Bilingual everywhere: FR default, EN toggle via `checkam_lang` cookie + localStorage; every user string ships in both languages.
- API routes validate with Zod behind Arcjet (rate limit + bot defense); never trust client input.
- Nothing publishes without moderation: reports stay `PENDING`, flagged identifiers stay inactive until `APPROVE`.
- Cache AI extraction by SHA-256 (`fileHash`); reuse before calling OpenRouter.
- No mail sender wired yet; Nodemailer + Inngest is the planned path, do not introduce another provider without a spec.
- No chat tables yet; `ChatFolder` / `ChatSession` / `ChatMessage` land via spec + migration, never ad hoc.
- Mobile first; keep focus states, touch targets, and reduced motion respected.

## Context files

- [prisma/AGENTS.md](prisma/AGENTS.md) (data model, seed source, migrations)
- [src/inngest/AGENTS.md](src/inngest/AGENTS.md) (background jobs, WhatsApp pipeline, planned mail jobs)
- [src/lib/ai/AGENTS.md](src/lib/ai/AGENTS.md) (OpenRouter cascade, fact schema, prompts)
- [src/lib/rules/AGENTS.md](src/lib/rules/AGENTS.md) (verdict engine, Cameroon heuristics)

_Drafted by /codebase-audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
