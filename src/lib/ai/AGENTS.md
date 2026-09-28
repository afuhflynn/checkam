# AI fact extraction

## Overview

OpenRouter cascade supplies facts only, never the verdict. `extractFactsFromTextOrImage` returns a fixed JSON shape; the rules engine consumes it. Results cache by SHA-256 in `ScamVerification.fileHash` so repeat flyers cost nothing. Offline or exhausted credits fall back to heuristics.

## Key files

| File | Owns |
|---|---|
| `src/lib/ai/openrouter.ts` | Gateway, verified model cascade, token budgets, circuit breaker |
| `src/lib/ai/extract-facts.ts` | `ExtractedFactsSchema`, text/image extraction, `hashContent`, heuristic fallback |
| `src/app/api/verify/route.ts` | Cache lookup, flagged check, orchestration order |
| `src/inngest/functions/process-whatsapp-message.ts` | Same extractor on the WhatsApp path |

## Conventions

- Call the gateway through `chatModel(id)`, never the bare `openrouter(id)`. The bare callable posts to OpenAI's Responses API, which OpenRouter only implements for some slugs, so a working model still 404s. `.chat()` pins to `/chat/completions`.
- Every call must state `maxOutputTokens` from `MAX_OUTPUT_TOKENS`. OpenRouter validates the requested ceiling against the key's remaining credit and rejects the whole call with a 402 "requires more credits" when the SDK's context-derived default (tens of thousands) exceeds the balance.
- Cascade order is cheapest verified model first; keep temperature low (0.1) for extraction.
- Schema is fixed: `claimedEntity`, `phoneNumbers`, `emails`, `paymentMethod`, `amount`, `deadline`, `suspiciousPhrases`, `summaryClaim`; widen it via spec, never ad hoc.
- Circuit opens 60s on credit/quota/rate errors; heuristics answer while open and rules still decide.
- Prompts live beside the extractor; every prompt change needs review since tools and verdict copy depend on wording.

## Gotchas

- **A dead model slug fails silently.** The cascade swallows per-model errors, so a 404 on every entry means no model prose is produced at all and every reply quietly becomes engine copy. That is how the product came to read as stiff and robotic. Re-verify slugs against the live catalogue before trusting any output, and re-check them when a reply looks like a template.
- `answerWithCascade` returns null on any error, and the transport then falls back to prose built from the top finding. That fallback is a real surface users read, not an error state, so keep it human.
- Missing or placeholder `OPENROUTER_API_KEY` means heuristics always run; do not mistake heuristic output for model output.
- Image input sends `data:mime;base64` with a read all text instruction; PDFs ride the same path.

_Drafted by /codebase-audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
