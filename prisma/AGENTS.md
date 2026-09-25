# Prisma data model

## Overview

Single Postgres schema plus seed is the source of truth for users, scam checks, registry, and WhatsApp inbox. `src/lib/rules/cameroon-entities.ts` seeds `OfficialEntity`; seed drift between that file and the DB is the main risk. No chat tables exist yet; they land here via spec + migration.

## Key files

| File | Owns |
|---|---|
| `prisma/schema.prisma` | All models + enums (`User`, `Session`, `Account`, `Verification`, `ScamVerification`, `ScamReport`, `FlaggedIdentifier`, `OfficialEntity`, `WhatsAppWebhookEvent`) |
| `prisma/seed.ts` | Upserts official entities + demo reports + admin user |
| `src/lib/db.ts` | Prisma singleton for server code |
| `src/lib/rules/cameroon-entities.ts` | Canonical official institutions list (seed input) |

## Conventions

- `Verification` (`auth_verifications`) holds Better-Auth tokens; `ScamVerification` (`verifications`) holds scam checks; never confuse the two.
- `Session` is the Better-Auth session (token + expiry), not a chat session.
- Flagged lookups always query `normalizedValue` with `isActive: true`; phone values normalize to E.164 (`+237…`) before compare.
- Reports stay `PENDING` until moderation; `APPROVE` creates flagged identifiers, `REJECT` deactivates them.
- Migrations via `pnpm db:push` in dev; chat tables (`ChatFolder` / `ChatSession` / `ChatMessage`) require a spec first.

## Gotchas

- `ScamVerification.queryContent` is truncated to 1000 chars; full text is not stored.
- `whatsappWarning` is stored FR only; EN/FR bullets live in `evidenceBullets` JSON.
- No FK links `ScamVerification` to WhatsApp events or users; per sender threads do not exist yet.

_Drafted by /codebase-audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
