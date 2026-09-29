# Verify: share message rewrite - spec 0011 - updated 2026-09-29

_Steps derived from spec 0011 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Submit a HIGH_RISK scam text → share message shows "Scam alert - CheckAm Cameroon", evidence bullets, phone, entity, amount, payment method, safety note, hotline, forward prompt → AC-1, AC-2, AC-3, AC-5, AC-7, AC-8, AC-9, AC-10, AC-12
- [ ] Submit a CAUTION text → no hotline line, no forward prompt → AC-13
- [ ] Submit a VERIFIED_OFFICIAL text → lighter safety note, no hotline → AC-11
- [ ] Submit a text with no evidence → bullet section skipped → AC-4
- [ ] Submit a text with em dashes → replaced with hyphens → AC-14
- [ ] Submit a text with multiple phone numbers → all comma separated → AC-5
- [ ] Submit a text with multiple emails and no phone → only first email shown → AC-6

## Commands

- [ ] `pnpm test` → 117 tests pass → AC-1 through AC-16
- [ ] `pnpm typecheck` → clean → AC-15
- [ ] `pnpm lint` → clean → AC-16

## Acceptance criteria coverage

- AC-1: covered by manual step 1 (header format)
- AC-2: covered by manual step 1 (intro line)
- AC-3: covered by manual step 1 (bullet format)
- AC-4: covered by manual step 4 (empty bullets)
- AC-5: covered by manual steps 1, 6 (phone numbers)
- AC-6: covered by manual step 7 (email fallback)
- AC-7: covered by manual step 1 (entity line)
- AC-8: covered by manual step 1 (amount line)
- AC-9: covered by manual step 1 (payment method)
- AC-10: covered by manual step 1 (safety note)
- AC-11: covered by manual step 3 (official verdict)
- AC-12: covered by manual step 1 (HIGH_RISK tail)
- AC-13: covered by manual step 2 (CAUTION tail)
- AC-14: covered by manual step 5 (em dash)
- AC-15: covered by command 2 (typecheck)
- AC-16: covered by command 3 (lint)
