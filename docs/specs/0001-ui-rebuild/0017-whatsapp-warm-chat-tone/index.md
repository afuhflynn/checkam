# 0017. Warm chat tone for WhatsApp replies

**Date**: 2026-10-02
**Status**: In Progress
**Scope feature**: 32 (WhatsApp warm chat tone, Path 7)
**Build approach**: Journey (project default, from `docs/scope/scope.md`)

## Summary

WhatsApp replies feel stiff today because every turn repeats the full titled verdict shape, even a simple thanks. This spec keeps the full verdict for a first check and adds a short warm shape for follow ups in the same open window (the 24 hour reply window Meta allows). The verdict still comes only from the rules engine (the deterministic scorer that alone decides risk), and safety lines stay even when the note is short.

## Requirements

**User stories**:

1. As someone who checks a scam on WhatsApp, I want the first answer to read as a full verdict with evidence, so I trust it and know what to do.
2. As someone who says thanks or asks a short follow up, I want a short warm note with no repeat title, so the chat feels human.
3. As the operator, I want reactions to skip model extraction and reuse the stored verdict, so routine chat costs less.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

1. **AC-1**: A first check in a thread sends the full shape with a warm opener and closer in the thread language, plus verdict plus evidence plus contact lines plus action block where each applies.
2. **AC-2**: A follow up in the same open window drops the title header and the intro line and reads as a short warm note. Caution and official shorts stay under about 400 characters. High risk keeps its full action block even past that guide.
3. **AC-3**: A new claim in the same window earns a full verdict again. New claim means any of phone number, amount, link, readable image text, or long text above about 140 characters. Short thanks alone never counts as a new claim.
4. **AC-4**: A high risk short note keeps the action lines in full (next step plus hotline plus forward ask). The action block is never dropped or cut, even when short.
5. **AC-5**: A pure reaction with no new claim gets a warm ack plus a one line verdict reminder, with no repeat evidence and no model extraction call.
6. **AC-6**: Thread language is stored on the first full reply and reused for follow ups in that window. A stored value beats per message detection for short notes.
7. **AC-7**: A new window resets tone to full. Opening a new window clears the first reply marker so the next answer is full again.
8. **AC-8**: Cap notes, window refusals, and missing credential notes stay plain and unchanged. An unreadable new check with no extractable text gets a short warm ask for text or a picture, with no verdict.
9. **AC-9**: Existing phone guarantees hold for every full reply. At most 1600 characters with the spec 0015 drop order, real bullet character, no emoji, French accents correct, both languages available.

## Decision

**Chosen option**: Option 1: Fix in place with deterministic template

One renderer builds the full shape with its warm opener and closer. Two small standalone builders cover the rest from a stored verdict with no fresh judging: `renderWhatsAppFollowUp` for short notes and `renderWhatsAppEmptyAsk` for unreadable input. The worker picks the path from stored thread state plus a cheap text signal, stores language on the first full, and skips extraction for pure reactions.

## Rationale

Reasoning and options: see [rationale.md](./rationale.md)

## Feature design

**Data model sketch**:

`WhatsAppThread` gains three nullable columns, all empty for old rows which then read as first check:

1. `windowFirstReplyAt` DateTime nullable (when the full verdict first went out in the current window, cleared when a new window opens)
2. `lastVerdict` String nullable (the verdict sent in that full reply, one of `HIGH_RISK`, `CAUTION`, `VERIFIED_OFFICIAL`)
3. `threadLanguage` String nullable (the language sent, `en` or `fr`)

Relations unchanged. `WhatsAppThread` keeps 1 to N `WhatsAppWebhookEvent`. No new table, no new index, no constraint beyond nullable.

**State transitions**:

1. No marker in current window plus new check arrives, send full, set all three fields.
2. Marker present in same window plus reaction or short follow up arrives, send short, leave marker in place, update outbound time only.
3. Marker present in same window plus new claim arrives, send full again, refresh marker time plus verdict plus language.
4. New inbound opens a new window, clear the marker fields, next reply is full.

**Warm copy deck** (fixed copy in both languages, the only warm wording the build may send):

| Shape | en | fr |
|---|---|---|
| Full opener | Thanks for checking, I looked into this for you. | Merci pour votre message, je l'ai examiné pour vous. |
| Full closer | Send me anything else you want checked. | Je peux vérifier un autre message si vous voulez. |
| Short ack | Thanks for letting me know. | Merci de me l'avoir dit. |
| Short reminder high risk | Still high risk: do not send money or codes. | Toujours à risque élevé : n'envoyez ni argent ni code. |
| Short reminder caution | Still worth caution: verify on the official site first. | Restez prudent : vérifiez d'abord sur le site officiel. |
| Short reminder official | Still official as checked: use the institution site itself. | Toujours officiel selon ma vérification : utilisez le site de l'institution. |
| Empty ask | I could not read this. Please send the full text or a clear picture. | Je n'ai pas pu lire ce message. Envoyez le texte complet ou une photo claire. |

Short layout is ack line, then reminder line, then the unchanged action block. Full layout is opener, then today's full body (verdict plus evidence plus contacts), then closer, then the action block. The opener is the first block and is never dropped. The closer rides with the action block and is never dropped or cut. The whole body is sanitised as today.

**New claim signal** (cheap text test first, no model involved):

1. New claim is true when any holds: the existing phone normalizer finds a number, the existing amount pattern finds an amount, a link pattern finds `http` or `www`, extracted emails are non empty, an image yields non empty extracted text, or trimmed text length is above 140 characters.
2. Uncertain reads as new claim. The build fails to full, never to short, so a fresh scam never gets a stale stored verdict.
3. Order per inbound is window, then cap, then claim test, then render, then count, then send. A reaction skips extraction and reuses the stored verdict. A new claim runs extraction as today, and an extraction that comes back empty falls back to the warm empty ask with no verdict.
4. Captions count as text for this test, and email alone counts as a new claim.

**Marker and language policy**:

1. Only a sent full sets the marker fields. Cap notes, window refusals, missing credential notes, failed sends, and empty asks never set and never clear them.
2. Stored language is reused for reactions only. Every new claim re detects with `detectMessageLanguage` on the inbound text or extracted summary and overwrites the stored value, so an early misdetect self heals on the next full.
3. Image only turns use the stored language when present, else detection on the extracted summary, else the detector default.
4. Old rows with empty marker fields read as first check, so the rollout needs no backfill.
5. Marker writes ride with the decision record write, and the per sender worker concurrency already serialises them, so two racing messages cannot both believe they are first.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `renderAlert` in `src/lib/rules/engine.ts` | internal call | verdict plus bullets plus contacts plus action plus language | full phone body | none, internal | none, pure function |
| `renderWhatsAppFollowUp` in `src/lib/rules/engine.ts` | internal call | stored verdict plus language | short phone body | none, internal | none, pure function |
| `renderWhatsAppEmptyAsk` in `src/lib/rules/engine.ts` | internal call | language | warm ask with no verdict | none, internal | none, pure function |
| `openThread` in `src/lib/whatsapp/thread.ts` | internal call | event id plus sender number | window plus cleared tone fields on new window | none, internal | missing event throws |
| `process-whatsapp-message.ts` worker decide step | background job | inbound text plus media result plus thread row | sent full or sent short or plain system note | webhook signature already checked upstream | window shut, cap reached, credentials missing |

**Value sourcing** (every value each action produces names where it comes from):

| Action | Value produced or displayed | Source |
|---|---|---|
| Full reply | verdict line | rules engine result for this check |
| Full reply | evidence bullets | rules engine result for this check |
| Full reply | contact lines | extracted facts for this check |
| Full reply | action block | rules engine safety note for this verdict |
| Full reply | warm opener plus closer | fixed copy constants in both languages |
| Full reply | reply language | per message detection on first check, then stored |
| Short reply | one line verdict reminder | stored `lastVerdict` on the thread row |
| Short reply | action lines for high risk | fixed safety copy for stored verdict |
| Short reply | reply language | stored `threadLanguage` on the thread row |
| Short reply | first versus follow up choice | tone gate in the worker from `windowFirstReplyAt` present plus text signal says reaction |
| New check test | new claim true or false | cheap text signal (phone pattern, amount pattern, link pattern, length) plus extraction emptiness |
| Window reset | cleared tone fields | `openThread` when it opens a new window |

**Key invariants**:

1. Verdict comes only from the rules engine, never from model prose.
2. A high risk reply always carries its full action block, in full and short shapes alike.
3. A reaction never produces a verdict from empty text. Empty new checks get a warm ask with no verdict.
4. Both languages ship every string. No reply ships with a missing translation.
5. The 1600 character ceiling and drop order from spec 0015 still govern every full reply.
6. Uncertain input reads as a new claim and earns a full check. A short note never carries a stale verdict.

**Security model**:

No new auth. The webhook signature check upstream stays the gate. No new personal data beyond what the thread already holds. The sender number already keys the thread, and verdict plus language already travel inside reply text. Storing them as columns adds no new collection, and moderation plus stats boundaries stay as they are.

**Configuration required**:

None. No new env value. Cap, window length, and ceiling stay as spec 0015 set them.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):

1. Happy path: first text check in French gets full shape with warm opener plus evidence, verifies **AC-1**
2. Follow up: thanks in same window gets short note with no title and no extraction call, caution and official under about 400 characters while high risk keeps its full action block, verifies **AC-2**, **AC-5**
3. New claim: second message with a new phone number in same window gets full again, verifies **AC-3**
4. Safety: high risk follow up keeps hotline plus forward lines, verifies **AC-4**
5. Language: first reply English then French thanks still answers English from stored value, verifies **AC-6**
6. Reset: new window clears marker so next reply is full, verifies **AC-7**
7. System plain: cap note and unreadable image ask follow existing plain or warm ask rules with no verdict invented, verifies **AC-8**
8. Ceiling: long full French reply still fits 1600 with action intact, verifies **AC-9**

## Build plan

Ordered by user path, one path usable before the next, per the Journey approach (one full user path at a time).

1. Add the migration for the three nullable thread columns plus the cleared on new window write in `openThread`, satisfies **AC-6**, **AC-7**
2. Extend the phone renderer with warm opener and closer plus the standalone short and empty ask builders in both languages, keeping the ceiling plus drop order plus sanitise, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-9**
3. Wire the worker first versus follow up path with the cheap new claim signal, language store and reuse, and extraction skip for pure reactions, satisfies **AC-3**, **AC-5**, **AC-6**
4. Cover the reaction ack plus empty ask plus untouched system notes, with tests for thanks, new phone in same window, new window reset, and unreadable input, satisfies **AC-5**, **AC-7**, **AC-8**

## Consequences

**Positive**:

1. Chat feels human, first answer earns trust, follow ups stay light.
2. Reactions cost less, since pure thanks skips model extraction.
3. One renderer keeps full and short wording from drifting apart.

**Negative or tradeoffs**:

1. Fixed warm copy cannot riff on the last turn, so some replies will feel templated.
2. The cheap new claim signal can misread an odd phrasing, sending a short note where a full was due or vice versa. Failing to full bounds the harm to an extra full alert, never a missed scam.
3. Storing language plus verdict per thread adds columns every future WhatsApp feature must respect.
4. Warmth follows the 24 hour permission window, so a thanks 20 hours later still reads as a follow up even if it feels like a new chat. This matches the scope choice and Meta permission reality.
5. Savings are inference only. A short note still pays the billed message, it only skips the model extraction call.

**Neutral**:

1. Guide simulator from scope row 28 will need to show both shapes once this ships.

## Follow-up

- [ ] Guide simulator should show the short shape beside the full shape once this ships (scope row 28 owner)
- [ ] Thread memory from scope row 24 should reuse `lastVerdict` plus `threadLanguage` instead of adding rival columns
- [ ] Tighten the long French safety paragraphs noted in Deferred, so full alerts fit one phone screen more often
