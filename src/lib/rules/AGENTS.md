# Rules engine

## Overview

The rules engine is the final authority for verdicts. It takes the extracted facts and decides whether a claim is `HIGH_RISK`, `CAUTION`, or `VERIFIED_OFFICIAL`.

## Key files

| File | Owns |
| --- | --- |
| `src/lib/rules/engine.ts` | Verdict orchestration and scoring |
| `src/lib/rules/structural-rules.ts` | Pattern-based scam-shape detection |
| `src/lib/rules/keyword-rules.ts` | Scam category and topic detection |
| `src/lib/rules/email-rules.ts` | Official-domain and free-email checks |
| `src/lib/rules/payment-rules.ts` | Payment and transfer scam patterns |
| `src/lib/rules/phone-normalizer.ts` | Cameroon number normalization |
| `src/lib/rules/cameroon-entities.ts` | Official entity list and country-specific heuristics |
| `src/tests/rules.test.ts` | Rule-level verification tests |

## Conventions

- Keep the verdict deterministic and explainable.
- Use the evidence set to support the score and the user-facing warning.
- Keep the category and scoring logic consistent with the real Cameroon threat patterns.
- Do not allow a model decision to silently override the rules verdict.

## Operational notes

- Treat false positives as a serious product risk; keep the scoring conservative and transparent.
- New scam variants should be added with rules and tests together.
- If the app adds a new category, update the schema, migration, and tests in the same change.
- The rules layer is the place to keep operational knowledge of official entities, local scam patterns, and payment traps.
