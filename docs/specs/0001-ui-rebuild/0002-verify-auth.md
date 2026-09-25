# Verify: auth refresh · spec 0002 · updated 2026-09-25
_Steps derived from spec 0002 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Visit `/signin` → Google button visible above divider, mail form below → AC-1, AC-2
- [ ] Sign up with new mail → verify panel with resend → AC-1, AC-3
- [ ] Forgot → reset title + OTP mode switch, confirm 6-digit code → AC-4, AC-5
- [ ] Wrong password → field-level bilingual error + toast, no crash → AC-10
- [ ] Signup with 7-char password → weak hint shows, submit blocked client side → AC-6
- [ ] Open `/signin?expired=1` → expired panel + reissue button → AC-4
- [ ] Google cancel → back on gate with kept-form note → AC-8
- [ ] Signed in → header shows avatar with initials fallback, menu holds Settings + Sign out → AC-1
## Commands
- [ ] `pnpm typecheck` → clean → AC-1…AC-13
- [ ] `pnpm test` → 11/11 pass → regression
- [ ] `POST /api/auth/resend-verify` with bad mail → 400 `invalid_email` → AC-7
- [ ] `POST /api/auth/resend-verify` 6x same mail → 6th is 429 → AC-7
- [ ] `POST /api/auth/resend-verify` unknown mail → 200 with null jobId (no probing) → AC-7
## Acceptance-criteria coverage
- AC-1 covered by gate + signup steps · AC-2 by Google wiring (needs real keys) · AC-3 by verify panel · AC-4 by expired + OTP steps · AC-5 by OTP steps · AC-6 by hint + session config · AC-7 by resend command steps · AC-8 by cancel step · AC-9 by cookie-loss path (shell) · AC-10 by error steps · AC-11 by roles untouched · AC-12 by delayed state (needs 0003) · AC-13 by signup name option
