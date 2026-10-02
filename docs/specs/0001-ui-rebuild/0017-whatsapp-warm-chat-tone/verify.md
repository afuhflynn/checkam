# Verify: whatsapp warm chat tone · spec 0017 · updated 2026-10-02
_Steps derived from spec 0017 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Send a first scam text to the CheckAm number → full reply with warm opener, titled header, evidence, closer, action block, in your language → AC-1
- [ ] Reply thanks in the same window → short warm note with no title and no evidence, ack plus verdict reminder → AC-2, AC-5
- [ ] Send a second text with a new phone number in the same window → full verdict again → AC-3
- [ ] High risk follow up → short note still carries hotline 8202 plus forward ask → AC-4
- [ ] First reply English then thanks in French → answer stays English from stored language → AC-6
- [ ] New window after expiry → next reply is full again → AC-7
- [ ] Send an unreadable image with no text → warm ask for text or picture, no verdict invented → AC-8
- [ ] Long French scam with several phones → reply fits one screen, ends on the action block → AC-9
## Commands
- [x] `pnpm vitest run src/tests/whatsapp-tone.test.ts` → new shape, signal, and ask coverage green → AC-1, AC-2, AC-3, AC-4, AC-5, AC-8
- [x] `pnpm vitest run src/tests/whatsapp-platform.test.ts src/tests/rules.test.ts` → ceiling, bullets, accents, header order green → AC-9
- [x] query `WhatsAppThread` columns → `windowFirstReplyAt`, `lastVerdict`, `threadLanguage` present and nullable → AC-6, AC-7
- [x] `pnpm typecheck` shows no errors in `src/lib/rules/engine.ts`, `src/lib/whatsapp/`, `src/inngest/functions/process-whatsapp-message.ts` → build integrity
## Acceptance-criteria coverage
- AC-1 covered by manual step 1 and tone test file · AC-2 covered by manual step 2 and tone test file · AC-3 covered by manual step 3 and signal tests · AC-4 covered by manual step 4 and short shape test · AC-5 covered by manual step 2 and reaction test · AC-6 covered by manual step 5 and column check · AC-7 covered by manual step 6 and column check · AC-8 covered by manual step 7 and ask test · AC-9 covered by manual step 8 and platform tests
