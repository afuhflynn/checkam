# Prisma data model

## Overview

The Prisma schema is the source of truth for the application data model: auth, scam verification records, reports, threat identifiers, and WhatsApp events.

## Key files

| File | Owns |
| --- | --- |
| `prisma/schema.prisma` | Models and enums for users, sessions, verification records, reports, flagged identifiers, and webhook event tracking |
| `prisma/seed.ts` | Seed data for official entities, demo records, and admin account setup |
| `src/lib/db.ts` | Prisma client singleton used by server code |
| `src/lib/rules/cameroon-entities.ts` | Canonical official institutions list used in the rules layer |

## Conventions

- Distinguish `Verification` from `ScamVerification`; they serve different purposes.
- `Session` is for Better-Auth, not chat activity.
- Flagged identifiers should be queried by normalized value and active status.
- Reports remain pending until moderation review.
- Keep migration and seed changes explicit; do not add ad hoc tables without a reviewed spec.

## Operational notes

- `ScamVerification.queryContent` is intentionally truncated for storage efficiency.
- Language-specific output should be handled in the application layer rather than by storing only one language in the DB.
- The schema evolves with migration changes rather than silent assumptions about untracked tables.
