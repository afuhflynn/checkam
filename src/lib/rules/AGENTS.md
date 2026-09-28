# Rules verdict engine

## Overview

Pure deterministic engine and sole verdict authority: `runRulesEngine` maps facts to `HIGH_RISK` / `CAUTION` / `VERIFIED_OFFICIAL` plus a 0-100 score, exactly 3 EN/FR bullets, and a forwardable WhatsApp warning. Cameroon specifics (ministries, MoMo patterns, visa lures, port auctions) live here.

## Key files

| File | Owns |
|---|---|
| `src/lib/rules/engine.ts` | Orchestrator, scoring, clamps, finding + safety note builders |
| `src/lib/rules/structural-rules.ts` | Regex detectors for the *shape* of a scheme (mule, fee-before-release, impersonation, OTP request) |
| `src/lib/rules/keyword-rules.ts` | Topic groups: civil service, visa, ponzi, ecommerce, education, laundering, romance, impersonation, prize |
| `src/lib/rules/email-rules.ts` | Free mail vs `gov.cm` legitimacy |
| `src/lib/rules/payment-rules.ts` | Advance fee + MoMo reversal patterns |
| `src/lib/rules/phone-normalizer.ts` | Cameroon extraction, E.164 normalize, operator detect |
| `src/lib/rules/cameroon-entities.ts` | Official institutions (also the seed source) |
| `src/tests/rules.test.ts` | Engine tests incl. demo cases and structural detections |

## Conventions

- Flagged DB hit is near decisive (+95); free mail posing as an entity, reversal SMS, or score ≥ 45 means `HIGH_RISK`.
- Legit `gov.cm` domain with no signals means `VERIFIED_OFFICIAL` (score ≤ 10); everything else lands `CAUTION`.
- Findings cap at 3 and are never padded. An empty list plus a `safetyNote` is the honest state for a message with nothing concrete in it. `evidenceTones` runs index-parallel to both language lists so a surface can colour a red flag against a fact that eased the score.
- Absence signals (`no-payment`, `no-urgency`) lower the score but are never shown as findings; listing them is what made benign messages read as flagged.
- `structural-rules` is the shape authority, `keyword-rules` the topic authority. When both fire the category comes from the keyword group and only the evidence and score come from the structural read. A `HIGH_RISK` pattern adds 45 and is decisive; a `CAUTION` pattern adds 20 so it cannot cross the bound alone.
- Add new scam families as a structural regex where paraphrases matter, a keyword group where the topic name matters, with tests; update `cameroon-entities.ts` and reseed together.
- Share text is rendered twice from one source: `whatsappWarning` keeps `*bold*` for WhatsApp, `whatsappWarningPlain` drops it for Facebook, X and SMS. Keep bullet copy free of asterisks or the plain rendering leaks them.

## Gotchas

- The WhatsApp path skips the flagged DB check today; web and WhatsApp can disagree until parity lands.
- `MINESEC` style substring matching can overfire on lookalike names; prefer exact acronym + domain checks for official verdicts.
- Amount parsing is regex over `FCFA/XAF/CFA`; malformed amounts silently yield null.
- A dead model slug in the cascade is invisible: the turn silently falls back to engine copy. See `src/lib/ai/AGENTS.md`.

_Drafted by /codebase-audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
