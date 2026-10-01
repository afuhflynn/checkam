# CheckAm

CheckAm is an open-source bilingual scam-verification project for Cameroon. It helps people check messages, flyers, phone numbers, and emails before they pay or trust a claim.

This repository is meant to be reviewed, forked, and improved by contributors. Keep the project practical, transparent, and contributor-friendly.

## Product rules

- The rules engine determines the verdict: `HIGH_RISK`, `CAUTION`, or `VERIFIED_OFFICIAL`.
- AI only extracts facts; it does not issue the verdict.
- Public reports stay unpublished until a moderator approves them.
- All user-facing text ships in both French and English.
- Server routes validate input and apply Arcjet protection.
- Chat, mail, and system jobs must be implemented with clear specs and migration work where needed.

## Stack and workflow

- TypeScript + Next.js 16 + React 19
- Prisma + PostgreSQL
- Better-Auth
- Inngest
- AI SDK with OpenRouter
- Arcjet
- Tailwind + shadcn-inspired components
- Vitest + Biome

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm check
pnpm lint
pnpm typecheck
pnpm test
pnpm db:generate && pnpm db:push && pnpm db:seed
docker compose up -d
```

## Specs and docs

Stored under `docs/specs/` and `docs/`.

## Context files

- [prisma/AGENTS.md](prisma/AGENTS.md) — data model and database conventions
- [src/inngest/AGENTS.md](src/inngest/AGENTS.md) — async jobs and WhatsApp flow
- [src/lib/ai/AGENTS.md](src/lib/ai/AGENTS.md) — extraction, prompts, and model cascade
- [src/lib/rules/AGENTS.md](src/lib/rules/AGENTS.md) — verdict engine and Cameroon heuristics

## Notes for contributors

- Keep the product bilingual and mobile-first.
- Prefer deterministic rules and clear evidence over opaque outputs.
- Do not introduce new email or chat infrastructure without a spec and migration if needed.
- Keep privacy and moderation boundaries intact when publishing flagged or reported content.
