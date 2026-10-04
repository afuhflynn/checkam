# Verify: calm check for benign chat · spec 0019 · updated `2026-10-04`
_Steps derived from spec 0019 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Web chat, send `hello` → warm short reply with no verdict card and no share row → `AC-1`
- [ ] Web chat, send `How does it work?` → short explainer plus one try prompt, no verdict → `AC-2`
- [ ] Web chat, send `Just testing to see how friendly you are` → warm short reply, no verdict → `AC-1`
- [ ] Web chat, send `hello, check 699123456 for me` → full verdict with evidence from rules → `AC-3`, `AC-4`
- [ ] Web chat, send `double your money tomorrow` → full check path, never calm → `AC-3`
- [ ] WhatsApp new thread, send `hello` → language ask first where no choice is stored, then calm reply on next hello → `AC-1`
- [ ] WhatsApp, send `How does it work?` → explainer in thread language, no verdict → `AC-2`, `AC-6`
- [ ] WhatsApp, send photo flyer with readable text → full verdict, never calm → `AC-3`
- [ ] WhatsApp, send blank text → warm ask for full text or clear picture → `AC-5`
- [ ] Guide page `/whatsapp`, Bonjour tab shows the explainer, MINESEC tab shows the full verdict → `AC-6`
- [ ] Reply language: fixed FR choice plus English hello still answers in French; `bonjour` input answers in French → value sourcing language
- [ ] Mixed turn `thanks, also check https://example.cm/x` → full check, calm never wins over a claim → `AC-4`
## Commands
- [ ] `pnpm vitest run src/tests/benign-chat.test.ts` → 23 passed → `AC-1`, `AC-2`, `AC-3`, `AC-4`, `AC-5`
- [ ] `pnpm typecheck` → clean → build integrity
- [ ] Server log shows `[check.kind] benign=smalltalk` on a hello turn → `AC-8`
## Acceptance-criteria coverage
- `AC-1` … covered by hello and friendly probe steps · `AC-2` … covered by how it works steps · `AC-3` … covered by claim and doubling steps · `AC-4` … covered by mixed steps · `AC-5` … covered by blank step · `AC-6` … covered by parity and guide steps · `AC-7` … covered by tone contrast across steps · `AC-8` … covered by log step
