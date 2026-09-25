# Verify: chat memory · spec 0004 · updated 2026-09-25
_Steps derived from spec 0004 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Rail lists folders + sessions newest first with pins on top → AC-1, AC-7
- [ ] Session titles draft after first answer, rename works, fallback on timeout → AC-5
- [ ] Session delete asks inline confirm, toast offers undo restore → AC-6
- [ ] Folder delete names session count, cascades, undo restores all → AC-6
## Commands
- [ ] `pnpm typecheck` → clean → AC-1…AC-12
- [ ] `pnpm test` → green → regression
- [ ] Append twice to one session → seq 0, 1 in order → AC-2, AC-10
- [ ] Two guest sends then third → 403 `guest_wall` with triesLeft 0 → AC-4
- [ ] `POST /api/chat/claim` twice → second is no-op `{claimed: 0}` → AC-3
- [ ] Restore with used token → 409; past 30d → 410 → AC-6
- [ ] Another user reads session → 404; admin has no list path → AC-8
## Acceptance-criteria coverage
- AC-1 by rail step · AC-2 by order step · AC-3 by claim step · AC-4 by wall step · AC-5 by title step · AC-6 by delete steps · AC-7 by rail step · AC-8 by permission step · AC-9 by purge schedule (needs 30d or staging) · AC-10 by concurrent append (needs two tabs) · AC-11 by cache keys (shell) · AC-12 by verification link (needs 0006)
