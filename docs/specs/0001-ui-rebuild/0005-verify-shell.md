# Verify: chat shell · spec 0005 · updated 2026-09-25
_Steps derived from spec 0005 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Open `/chat` desktop → rail + thread + dossier; phone → thread with rail/drawer toggles → AC-1
- [ ] Send text → tokens stream, seal stamps on verdict with bullets → AC-2, AC-3
- [ ] Composer holds attach + 237 lookup + counter hint + send, always visible → AC-4
- [ ] Attach 11MB file → inline too_large error, no upload → AC-5
- [ ] Stop mid stream → partial kept marked, retry resends draft → AC-6
- [ ] Guest at 0 tries → composer locks with tries + sign in, draft kept → AC-7
- [ ] Fresh session → bilingual sample prompts, one tap starts → AC-8
- [ ] Failed turn → error + retry, no fake verdict → AC-9
- [ ] Go offline mid draft → queued state, sends on reconnect → AC-10
## Commands
- [ ] `pnpm typecheck` → clean → AC-1…AC-11
- [ ] `pnpm build` → green with `/chat` route → AC-1
- [ ] Live smoke: counter 2→1, session + message persist, transport streams verdict + data part, lookup normalizes, thread reads rows → AC-2, AC-4, AC-11
## Acceptance-criteria coverage
- AC-1 by layout step · AC-2 by stream step · AC-3 by seal step · AC-4 by composer step · AC-5 by upload step (Blob needs token) · AC-6 by stop step · AC-7 by wall step · AC-8 by empty step · AC-9 by failure step · AC-10 by offline step · AC-11 by smoke step
