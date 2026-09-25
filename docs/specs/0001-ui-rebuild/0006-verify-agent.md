# Verify: agent tools · spec 0006 · updated 2026-09-25
_Steps derived from spec 0006 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Chat turn on MINESEC text → grounded answer with registry trace, verdict from rules → AC-1, AC-2
- [ ] New session title drafts after first answer, rename still works → AC-4
- [ ] Turn with dead Tavily key → honest degrade note, verdict still lands → AC-6
## Commands
- [ ] `pnpm typecheck` → clean → AC-1…AC-8
- [ ] `pnpm test` → green → regression
- [ ] Fourth Tavily-needing turn in a row with budget 3 → refused with capped copy → AC-7 (set `TAVILY_DAILY_BUDGET=3` for the check)
- [ ] Live smoke: traces persisted on assistant row, title fallback stands without model key → AC-1, AC-4
- [ ] Prompt edit → version bump + changelog + registry row, runtime logs new version in dev → AC-3
## Acceptance-criteria coverage
- AC-1 by grounded step · AC-2 by rules step · AC-3 by registry step · AC-4 by title step · AC-5 by cascade config (needs real key for model prose) · AC-6 by dead-tool step · AC-7 by budget step · AC-8 by guard order (covered in shell + memory builds)
