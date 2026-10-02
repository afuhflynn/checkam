# CheckAm

CheckAm is a bilingual scam-verification product for Cameroon. It helps users check a message, flyer, phone number, or email against a deterministic rules engine and a clear evidence trail before they pay, send money, or trust a claim.

The product is designed around a simple flow: a user enters the claim, the app extracts the facts, the rules engine decides the verdict, and the public-facing output stays easy to share in WhatsApp and other channels.

## Project status

This repo is a working Next.js application with a live product surface, not only a prototype. The current codebase includes:

- the public verification flow
- moderation and admin review
- the WhatsApp intake flow
- persistent chat and agent tooling
- threat-feed publication for approved identifiers
- bilingual UI and locale handling

## Stack

- Next.js 16 + React 19 + TypeScript
- Prisma + PostgreSQL
- Better-Auth
- Inngest
- AI SDK + OpenRouter
- Arcjet
- Tailwind + shadcn-inspired UI
- Vitest + Biome

## Quick start

```bash
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

The app runs on http://localhost:3000 by default.

## Key environment variables

Use a real `.env` in local or production environments. The main values are:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `OPENROUTER_API_KEY`
- `ARCJET_KEY`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_API_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_APP_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `TAVILY_API_KEY`
- `NEXT_PUBLIC_APP_URL`

## Core routes

| Route | Purpose |
| --- | --- |
| `/` | Public intake and verdict overview |
| `/signin` | Auth flow and permit gate |
| `/chat` | Chat interface and history |
| `/directory` | Public scam directory |
| `/report` | Report submission |
| `/admin` | Moderation queue |
| `/whatsapp` | WhatsApp guide and setup information |
| `/api/verify` | Verification engine |
| `/api/admin/reports` | Admin workflow |
| `/api/public/whatsapp/webhook` | WhatsApp webhook receiver |
| `/api/public/threat-feed` | Public threat feed |

## Verification model

The rules engine is the final authority for the verdict. AI is for fact extraction, not final decision-making.

1. Validate incoming input and rate-limit it.
2. Check for known active flagged identifiers.
3. Extract facts from text or uploaded evidence.
4. Apply the deterministic rules engine.
5. Produce a verdict with evidence and a clear warning.

## Documentation map

- [AGENTS.md](AGENTS.md) - repository-level operational guide
- [docs/ADMIN.md](docs/ADMIN.md) - moderation and admin workflow
- [docs/WHATSAPP.md](docs/WHATSAPP.md) - WhatsApp integration and go-live notes
- [docs/THREAT-FEED.md](docs/THREAT-FEED.md) - public threat feed format and usage
- [docs/scope/scope.md](docs/scope/scope.md) - current rebuild plan and status
- [docs/specs/0001-ui-rebuild/index.md](docs/specs/0001-ui-rebuild/index.md) - UI rebuild umbrella spec

## Quality checks

```bash
pnpm typecheck
pnpm check
pnpm test
pnpm build
```

## Safety notes

- Public reports and threat-feed entries remain hidden until moderation approves them.
- The verifier never treats AI output as final verdict text.
- The system keeps WhatsApp and admin flows idempotent and rate-limited.

Created for Cameroon, with a focus on practical scam detection and public safety.

> Created with ❤️ by Flynn Afuh for Cameroon
