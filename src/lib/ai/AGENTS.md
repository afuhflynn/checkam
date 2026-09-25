# AI fact extraction

## Overview

OpenRouter cascade supplies facts only, never the verdict. `extractFactsFromTextOrImage` returns a fixed JSON shape; the rules engine consumes it. Results cache by SHA-256 in `ScamVerification.fileHash` so repeat flyers cost nothing. Offline or exhausted credits fall back to heuristics.

## Key files

| File | Owns |
|---|---|
| `src/lib/ai/openrouter.ts` | Gateway, model cascade, circuit breaker |
| `src/lib/ai/extract-facts.ts` | `ExtractedFactsSchema`, text/image extraction, `hashContent`, heuristic fallback |
| `src/app/api/verify/route.ts` | Cache lookup, flagged check, orchestration order |
| `src/inngest/functions/process-whatsapp-message.ts` | Same extractor on the WhatsApp path |

## Conventions

- Cascade order is free vision models first, paid `gemini-2.0-flash-001` last; keep temperature low (0.1) for extraction.
- Schema is fixed: `claimedEntity`, `phoneNumbers`, `emails`, `paymentMethod`, `amount`, `deadline`, `suspiciousPhrases`, `summaryClaim`; widen it via spec, never ad hoc.
- Circuit opens 60s on credit/quota/rate errors; heuristics answer while open and rules still decide.
- Prompts live beside the extractor; every prompt change needs review since tools and verdict copy depend on wording.

## Gotchas

- Missing or placeholder `OPENROUTER_API_KEY` means heuristics always run; do not mistake heuristic output for model output.
- Image input sends `data:mime;base64` with a read all text instruction; PDFs ride the same path.
- Agent tools (Tavily web search, registry lookup) and chat streaming are not wired here yet; they arrive via spec.

_Drafted by /codebase-audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
