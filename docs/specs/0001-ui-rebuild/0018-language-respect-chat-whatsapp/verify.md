# Verify: language respect across chat and WhatsApp · spec 0018 · updated 2026-10-04
_Steps derived from spec 0018 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Send hi with no saved choice on web → expect the bilingual ask with no verdict → AC-1
- [ ] Answer EN → send a claim next → expect a full English reply → AC-2 · AC-4
- [ ] With English fixed, send a French claim → expect an English reply → AC-2
- [ ] Send emoji only twice with no choice → expect one ask then a fallback reply with no nag → AC-5
- [ ] On WhatsApp send hi with no choice → expect the ask once → AC-1
- [ ] On WhatsApp answer FR → send an English claim next → expect a French reply → AC-2 · AC-4
- [ ] Flip the web settings toggle → reload and send a claim → expect the toggled language → AC-4
## Commands
- [ ] `pnpm typecheck` → clean → build health
- [ ] `pnpm vitest run src/tests/language-respect.test.ts` → pass → AC-1 · AC-2 · AC-4 · AC-5 · AC-11
- [ ] DB introspection on `User`, `chat_sessions`, `WhatsAppThread`, `verifications`, `WhatsAppWebhookEvent` → new language columns exist → AC-4 · AC-6 · AC-7
## Acceptance-criteria coverage
- AC-1 … covered by ask steps · AC-2 … covered by fixed steps · AC-3 … covered by fresh full plus short reuse · AC-4 … covered by phrase plus toggle steps · AC-5 … covered by unclear twice step · AC-6 … covered by DB columns step · AC-7 … covered by owner only code path · AC-8 … covered by fallback path · AC-9 … covered by shut window path · AC-10 … covered by mixed thread step · AC-11 … covered by greeting unit tests
