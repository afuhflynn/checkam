# AI fact extraction

## Overview

The AI layer is responsible for extracting facts from text and uploaded evidence. It is not responsible for deciding the final verdict.

## Key files

| File | Owns |
| --- | --- |
| `src/lib/ai/openrouter.ts` | Model gateway and fallback behavior |
| `src/lib/ai/extract-facts.ts` | Fact schema and extraction logic |
| `src/app/api/verify/route.ts` | Verification orchestration and cache checks |
| `src/inngest/functions/process-whatsapp-message.ts` | Same fact-extraction flow on the WhatsApp path |

## Conventions

- Keep the extraction schema stable and explicit.
- Treat public input as untrusted content.
- Use a low temperature for extraction tasks.
- Cache repeated content where possible to avoid unnecessary model calls.
- If the model fails or credits are missing, fall back to heuristics rather than pretending the model produced a result.

## Operational notes

- The app should clearly distinguish model output from the rules verdict.
- Prompt changes can materially affect output quality, so they should be reviewed deliberately.
- Document any new extraction fields before adopting them in the rules layer; do not widen the schema silently.
