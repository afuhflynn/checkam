# Rules verdict engine

## Overview

Pure deterministic engine and sole verdict authority: `runRulesEngine` maps facts to `HIGH_RISK` / `CAUTION` / `VERIFIED_OFFICIAL` plus a 0-100 score, exactly 3 EN/FR bullets, and a forwardable WhatsApp warning. Cameroon specifics (ministries, MoMo patterns, visa lures, port auctions) live here.

## Key files

| File | Owns |
|---|---|
| `src/lib/rules/engine.ts` | Orchestrator, scoring, clamps, bullet + warning builders |
| `src/lib/rules/keyword-rules.ts` | Civil service, visa, ponzi, ecommerce high risk groups |
| `src/lib/rules/email-rules.ts` | Free mail vs `gov.cm` legitimacy |
| `src/lib/rules/payment-rules.ts` | Advance fee + MoMo reversal patterns |
| `src/lib/rules/phone-normalizer.ts` | Cameroon extraction, E.164 normalize, operator detect |
| `src/lib/rules/cameroon-entities.ts` | Official institutions (also the seed source) |
| `src/tests/rules.test.ts` | Engine tests incl. demo cases |

## Conventions

- Flagged DB hit is near decisive (+95); free mail posing as an entity, reversal SMS, or score ≥ 45 means `HIGH_RISK`.
- Legit `gov.cm` domain with no signals means `VERIFIED_OFFICIAL` (score ≤ 10); everything else lands `CAUTION`.
- Bullets cap at 3 and pad with payment channel + ANTIC 8202 guidance; keep EN and FR in lockstep.
- Add new scam families as keyword groups with tests; update `cameroon-entities.ts` and reseed together.

## Gotchas

- The WhatsApp path skips the flagged DB check today; web and WhatsApp can disagree until parity lands.
- `MINESEC` style substring matching can overfire on lookalike names; prefer exact acronym + domain checks for official verdicts.
- Amount parsing is regex over `FCFA/XAF/CFA`; malformed amounts silently yield null.

_Drafted by /codebase-audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
