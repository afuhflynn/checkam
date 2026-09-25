# Verify: mail plumbing · spec 0003 · updated 2026-09-25
_Steps derived from spec 0003 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Sign up → verify mail arrives in request locale with 24h link → AC-1
- [ ] Forgot → one mail carries 1h link + 10 min code → AC-2
- [ ] Complete verify → exactly one welcome arrives, none for Google → AC-3
- [ ] All three mails render rich HTML + readable plaintext twin, EN and FR → AC-4
## Commands
- [ ] `pnpm typecheck` → clean → AC-1…AC-9
- [ ] `pnpm test` → green → regression
- [ ] Trigger resend 6x one mail → 6th is 429 → AC-6
- [ ] `GET /api/mail/status?jobId=<id>` as owner → sent/sending/failed; as stranger → 404 → AC-5
- [ ] Boot dev with empty SMTP_* → loud console error, trigger fails `mail_not_configured` → AC-9
- [ ] Fire duplicate verify event id → single send → AC-7
## Acceptance-criteria coverage
- AC-1 by signup mail step · AC-2 by reset mail step · AC-3 by welcome step · AC-4 by template steps · AC-5 by status + retry steps · AC-6 by cap steps · AC-7 by duplicate step · AC-8 by SMTP-down step (needs real outage or staging) · AC-9 by boot + jobId steps
