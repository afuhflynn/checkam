# 0018 rationale - Language respect across chat and WhatsApp

## Context

Today a simple hi on WhatsApp or web often earns a French reply even when you wrote in English, and asking for English still keeps French. Three forces combine to cause this. First, the word guesser (`src/lib/i18n/detect.ts`) defaults to French when nothing matches, and short greetings like hi match nothing since only hello sits in the English list. Second, the web client sends the interface language as the reply language (`src/app/api/chat/transport/route.ts` reads an optional locale and falls back to guessing), so a French interface pins French replies no matter what you typed. Third, WhatsApp stores a thread language but clears it each new window and has no saved preference and no ask step, so short notes fall back to French by default (`src/inngest/functions/process-whatsapp-message.ts`, `src/lib/whatsapp/thread.ts`). The result breaks trust for English speakers and for anyone who explicitly picks a language. Not deciding keeps the bias and makes every later tone fix build on a wrong base.

## Options considered

### Option 1: Fix in place with stored choice plus ask

Extend the word guesser with greeting words, add a one time bilingual ask for signal free turns, store a fixed triple on the user plus the chat session plus the WhatsApp thread, resolve reply language server side with fixed first then detection, and carry the choice through the existing versioned prompt slot. Small curated phrase list sets the fixed choice on both surfaces, and the settings toggle persists it account wide.

Plus:

1. Small blast radius that reuses the live marker and window machinery from spec 0017.
2. One rule serves both surfaces so parity holds by construction.
3. Nullable columns need no backfill since empty reads as no choice.

Minus:

1. Touches two reply paths plus prompts plus settings in one change, so review must cover both surfaces.
2. Guest web choice needs a session home since guests own no user row, which adds one more triple to keep aligned.

### Option 2: Strangler with a side language service

Build a new language resolver beside the old logic, migrate web first then WhatsApp, and retire the old guessing once both prove out.

Plus:

1. Each surface cuts over independently with instant rollback to the old path.
2. Experiment friendly since old and new can run side by side.

Minus:

1. Two sources of truth during migration invite drift between surfaces, the exact failure you want to end.
2. Overweight process for a small scope with no new provider and no live data reshape.

### Option 3: Direct replace of the reply pipeline

Rewrite the reply language layer on both surfaces at once with a new canonical flow and migrate all callers in one pass.

Plus:

1. Cleanest end state with no legacy branches left behind.
2. One review covers the whole new flow.

Minus:

1. Large blast radius across chat transport plus worker plus prompts plus settings in a single landing, risking verdict parity regressions.
2. No incremental proof since everything flips together, so a defect hits both surfaces at once.

## Rationale

Your answers point at control plus calm. Ask first for a plain hi removes the silent French default that caused the report, and stay fixed always is only credible with a stored triple on each surface. Fix in place wins because the 0017 marker plus window plus reaction machinery already serializes per sender work and already stores a thread language, so the missing pieces are small and local: greeting words, an ask gate, a fixed triple, and server side resolution order. A side service would double the truth during migration and a direct rewrite would risk the verdict parity that specs 0015 and 0017 protect. Guest web needs the session triple because guests own no user row, while signed in web reads the account default and WhatsApp keeps its own thread value, separate but aligned.

## Build notes

During the build the settings save took the cookie path you picked instead of a new PATCH route: the web toggle persists through the `checkam_lang` cookie as today, and the transport treats a valid cookie value as fixed with source setting while syncing it to your user plus session rows. The spec API table still names the earlier PATCH idea, so a later `/solution-architect` touch up may align that row with the cookie path. No behavior beyond your pick was added.
