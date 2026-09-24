# CheckAm — Verify Before You Pay 🇨🇲

A bilingual (English/Français) scam-verification platform for Cameroon. People paste a message,
upload a flyer, or search a phone number — and get a clear verdict with hard evidence, plus a
ready-to-forward WhatsApp warning.

> **Mission:** stop MINESEC/MINFOPRA recruitment scams, Orange/MTN Mobile Money fraud, fake
> Canada-visa offers, and Douala-port auction scams **before** money moves. Rules decide the
> verdict; AI only supplies the facts. Official cross-check: ANTIC hotline **8202**.

---

## ✨ Features

| Stage | What |
| ----- | ---- |
| **1 — Verification engine + site** | Intake hub (paste text / upload flyer-PDF / lookup phone-email), 3 one-tap demo cases, deterministic rules engine, AI fact extraction, Receipts card (badge + 3 evidence bullets + official website + ANTIC 8202 + copyable WhatsApp warning) |
| **2 — WhatsApp channel** | Meta webhook (`GET` verify + `POST` HMAC-signed receiver), idempotent event inbox, Inngest async processing, media fetch + same-engine verdict, short WhatsApp reply |
| **3 — Registry + data feed** | Public scam directory (`/directory`), permanent dossiers (`/scam/$slug`), public reporting with moderation queue, gated admin dashboard, structured threat feed (JSON/CSV) for telcos/banks |

Bilingual throughout: browser-language detection with persisted EN | FR switch. Mobile-first.

---

## 🧱 Stack

- **Next.js 16.3.6** (Turbopack) + React 19 + strict TypeScript (`noUncheckedIndexedAccess`), Biome lint/format
- **Tailwind CSS v4** (CSS-first `@theme`), shadcn-style `ui/*`, Lucide icons, Sonner toasts
- **PostgreSQL 16** (Docker, port `5454`) + **Prisma 6** ORM + seed (official entities + 4 confirmed scams + admin)
- **Vercel AI SDK v7** + **OpenRouter** free-model cascade with circuit breaker + heuristic fallback; results cached by SHA-256 so the same flyer is never re-read
- **Arcjet** (Shield + bot defense + rate limits), **Inngest v4** (WhatsApp processing, threat-feed sync), **TanStack Query**, **nuqs** (shareable `?q=&category=`), **Better-Auth** (email+password, ADMIN/MODERATOR roles)
- Local evidence storage: `public/uploads/evidence/` (Docker volume `uploads_data`; swap for S3 without changing code paths)

---

## 🚀 Quickstart

```bash
# 1. Start Postgres (and storage init)
docker compose up -d

# 2. Install + generate + migrate + seed
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed

# 3. Run
pnpm dev          # http://localhost:3000
```

Seeded admin: `admin@checkam.cm` (role ADMIN — set its password via your auth flow, or
promote a signed-up user in `psql`/Studio). Seeded scams: fake MINESEC-325 flyer, 75 000 FCFA
Orange Money reversal SMS, express Canada visa, Douala-port auction.

### Environment

Copy the keys in `.env` and fill real values for production:

| Key | Purpose |
| --- | ------- |
| `DATABASE_URL` | Postgres connection |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Auth signing + base URL |
| `OPENROUTER_API_KEY` / `OPENROUTER_BASE_URL` | AI fact extraction (without a real key the heuristic extractor runs offline) |
| `ARCJET_KEY` | Bot defense + rate limits (dry-run in dev) |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Meta webhook `GET` verification |
| `WHATSAPP_API_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_APP_SECRET` | Meta Cloud API media fetch + replies + HMAC check |
| `NEXT_PUBLIC_APP_URL` | Canonical URL (share links, OpenRouter referer) |
| `CHECKAM_ADMIN_BYPASS="true"` | **Local dev only** — skips moderator sign-in on `/api/admin`. Never set in production. |

---

## 🗺 Routes

| Route | Purpose |
| ----- | ------- |
| `/` | Intake hub + verdict Receipts card |
| `/directory` | Public registry (search + category pills, `?q=&category=`) |
| `/scam/[slug]` | Permanent shareable case dossier |
| `/report` | Public report-a-scam (held PENDING until approved) |
| `/whatsapp` | How the WhatsApp bot works |
| `/admin` | Moderation queue (gated: ADMIN/MODERATOR) |
| `/api/verify` | Verification engine (Arcjet + cache + AI + rules) |
| `/api/reports` | Public list (APPROVED only) + submit |
| `/api/uploads` | Flyer evidence upload → `/uploads/evidence/…` |
| `/api/admin/reports` | Moderation queue + APPROVE/REJECT (gated) |
| `/api/public/whatsapp/webhook` | Meta `GET` challenge + `POST` receiver |
| `/api/public/threat-feed` | `?format=json\|csv&category=&since=` telco/bank feed |
| `/api/auth/[...all]` | Better-Auth handlers |
| `/api/inngest` | Inngest serve endpoint |

---

## 🧠 How verification works

1. **Arcjet** rate-limit/bot check → **Zod** payload validation.
2. **SHA-256 cache**: extraction reused when the same text/flyer was seen before.
3. **Flagged-identifier lookup** in Postgres (`normalizedValue`, active only).
4. **AI extraction** (or offline heuristics): ministry, phones, emails, amount, deadline, payment channel.
5. **Pure rules engine** (`src/lib/rules/`) decides `HIGH_RISK | CAUTION | VERIFIED_OFFICIAL` + 0–100 score + exactly 3 EN/FR bullets. AI never sets the verdict.
6. Session recorded in `scam_verifications`; WhatsApp warning generated in both languages.

Rule families: free-email posing as ministries, `.gov.cm` whitelist, personal-MoMo-for-fees,
advance-fee phrases (`frais de dossier`, `quittance express`), guaranteed-return/visa promises,
reversal-SMS patterns.

---

## 📚 Docs

- [`docs/WHATSAPP.md`](docs/WHATSAPP.md) — Meta Cloud API go-live checklist
- [`docs/THREAT-FEED.md`](docs/THREAT-FEED.md) — telco/bank integration
- [`docs/ADMIN.md`](docs/ADMIN.md) — moderation workflow + safety rules

---

## ✅ Verify

```bash
pnpm typecheck   # tsc --noEmit (strict, no any)
pnpm check       # biome check
pnpm test        # vitest — rules engine (7 tests: 3 demos + official + phones)
pnpm build       # production build (15 routes)
```

Smoke-tested: MINESEC demo → `HIGH_RISK / 100 / CIVIL_SERVICE`; threat feed → seeded threats.

---

## 🛡 Safety & abuse notes

- Nothing is published until a moderator approves it — reports sit in `PENDING`, flagged
  identifiers stay `isActive: false` until APPROVE.
- Approve auto-creates flagged phone/email identifiers; Reject deactivates them.
- Report submissions rate-limited (5/hour/IP); verify + uploads + threat feed behind Arcjet.
- WhatsApp webhook verifies HMAC-SHA256 when `WHATSAPP_APP_SECRET` is real, dedupes by
  `messageId` (single-flight), replies fast 200 then processes async.

---

*Independent public-utility service. Official communications cross-referenced with the
Presidency, Government Ministries, and ANTIC (National Agency for ICT). Cybercrime hotline:
**8202** (toll-free in Cameroon).*
