# 0018. Language respect across chat and WhatsApp

## Summary

You get replies in the language you used, and a fixed choice you set stays fixed on both web chat and WhatsApp. A plain greeting with no saved choice gets one warm bilingual ask instead of a silent French reply, and the fix reuses your live thread machinery with no new provider. Detection means guessing English or French from your words, preference means your saved choice that stays until you change it.

## Requirements

**User stories**:

1. As someone who writes hi or hello, I want an answer in my language or one clear ask, so I feel heard on the first turn.
2. As someone who picks English only or French only, I want every later reply to honor it even when I quote the other language, so I stay in control.
3. As the operator, I want one shared rule on both surfaces with a clean audit trail, so web and WhatsApp never drift apart.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

1. **AC-1**: A greeting with no usable signal and no saved choice gets one bilingual ask in a single warm bubble with no verdict, and it is sent at most once per thread until you answer.
2. **AC-2**: A saved fixed choice stays fixed on every later turn on both surfaces even when your new input arrives in the other language, until you change it by phrase or by setting.
3. **AC-3**: A thread with no fixed choice answers a fresh full check in the detected input language and reuses the stored thread language for short notes, and each fresh full check detects again so an early misread self heals.
4. **AC-4**: You may fix your choice by plain phrase on either surface from a small curated list in both languages, or by the web settings toggle which then applies account wide, and both paths store source plus time.
5. **AC-5**: Unclear input such as emoji only with no saved choice and no prior ask gets the bilingual ask once, then later unclear turns fall back to thread language then English, and the app never nags on every turn.
6. **AC-6**: Every recorded check stores the reply language actually sent, so stats and moderation stay true to what you saw.
7. **AC-7**: Only you may change your choice, by your own session on web and by your own sender number on WhatsApp, and each change logs language plus source plus time with no message text stored.
8. **AC-8**: When the model is down, reply language falls back to stored choice then heuristic guess, the verdict still comes only from the rules engine (the deterministic scorer that alone decides risk), and the turn never claims a model wrote it.
9. **AC-9**: When the WhatsApp reply window is shut, the worker stays silent and records the refusal as today, with no send attempt and no language change.
10. **AC-10**: In mixed language threads the verdict plus evidence read in the reply language while short quotes of your own words stay in their original wording.
11. **AC-11**: Short greetings map correctly, with hi and hey and hello and good morning read as English and bonjour and salut and bonsoir read as French, and anything still signal free takes the ask path instead of silent French.

## Decision

**Chosen option**: Option 1: Fix in place with stored choice plus ask

Resolve every reply server side with fixed choice first, then phrase match on short turns, then fresh detection for full checks, then stored thread heuristic for short notes, then the one time bilingual ask guarded by its stamp, then thread heuristic then English. Store the triple of language plus source plus time on the user and on the chat session and as a separate preferred triple on the WhatsApp thread, keeping thread language for guessing only. Extend the guesser word lists, add the small versioned phrase list with longest match winning, persist the settings toggle with fan out to open sessions, stamp the ask once per thread, record the sent language on check plus event rows, version the prompt with a language slot, and log changes with no message text.

## Rationale

Reasoning and options: see [rationale.md](./rationale.md).

## Feature design

**Data model sketch**:

1. `User` gains three nullable columns, empty for all current rows which then read as no fixed choice: `preferredLanguage` Text nullable holding `en` or `fr`, `preferredLanguageSource` Text nullable holding phrase or setting or ask, `preferredLanguageUpdatedAt` DateTime nullable.
2. `ChatSession` gains four nullable columns with identical meaning plus one ask stamp, acting as the web thread home and the guest home: `replyLanguage` Text nullable, `replyLanguageSource` Text nullable, `replyLanguageUpdatedAt` DateTime nullable, `askSentAt` DateTime nullable marking that the one time ask already went out. First guest turn creates the session and returns its id, and the triple lives only there. At session creation for a signed in owner, copy the user triple when present, else leave empty. Settings writes fan out to the user row plus all open sessions, while sessions never write back to the user.
3. `WhatsAppThread` keeps `threadLanguage` for guessing only and gains a separate fixed triple plus one ask stamp: `preferredLanguage` Text nullable, `preferredLanguageSource` Text nullable, `preferredLanguageUpdatedAt` DateTime nullable, `askSentAt` DateTime nullable. A fresh window keeps the fixed triple and the ask stamp, and clears only the tone marker fields from spec 0017, so your language survives while the full versus short shape resets.
4. `ScamVerification` and `WhatsAppWebhookEvent` each gain one nullable column `replyLanguage` Text nullable holding the reply language actually sent, so stats and moderation read truth with no extra join.
5. Relations unchanged. `User` keeps 1 to N `ChatSession`. `WhatsAppThread` keeps 1 to N `WhatsAppWebhookEvent`. No new table and no new index beyond the existing keys, with uniqueness of one triple per owner row by construction.

**State transitions**:

1. No fixed choice plus signal free greeting arrives and no ask stamp exists, send the bilingual ask once, stamp the ask time, and change nothing else. A later unclear turn with a stamp present skips the ask and uses the silent fallback.
2. Fixed choice set by phrase or setting or ask answer, write the triple on the owning row, and every later turn replies in that language. The turn after an ask answers it when it carries a clear en token or fr token, writing fixed with source ask, while both or neither counts as answered with no fixed set and the turn takes fresh detection.
3. Phrase matching runs before detection on short turns only, using lowercased accent stripped includes match with longest match winning, so a scam quote carrying claim markers never flips your choice. Turns carrying claim markers skip phrase matching entirely and take the full path.
4. No fixed choice plus fresh full check arrives, detect from input, reply in that language, and store it as the thread heuristic for short notes. Full versus short reuses the 0017 rule, with new claim text plus marker state deciding the shape.
5. No fixed choice plus reaction or short follow up arrives with a stored thread heuristic, reuse the stored value with no fresh detection.
6. New window opens on WhatsApp, keep the fixed triple plus the ask stamp, clear the tone marker only, and the next full reads fixed first else fresh detection.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/chat/transport` in `src/app/api/chat/transport/route.ts` | POST | session id plus messages plus interface locale for chrome only plus optional phrase | streamed answer in resolved reply language plus verdict payload plus stored reply language plus ask stamp when the ask goes out | owner session scope as today, guests pass the wall as today, first guest turn creates the session | 422 on empty turn, 403 on guest wall, 404 on missing session |
| Existing settings save in `src/app/settings` | PATCH | preferred language plus source | updated user triple plus fan out to all open sessions | owner only | 401 on signed out, 422 on other than `en` or `fr` |
| `process-whatsapp-message.ts` worker decide step in `src/inngest/functions/process-whatsapp-message.ts` | background job | inbound text plus media result plus thread row plus phrase match | sent full or sent short or bilingual ask or silent refusal plus stored reply language plus ask stamp when the ask goes out | webhook signature already checked upstream, per sender concurrency already serializes turns | window shut stays silent, cap reached sends the plain cap note, credentials missing records pending |
| `detectMessageLanguage` in `src/lib/i18n/detect.ts` | internal call | raw text | `en` or `fr` plus a signal flag telling ask worthy from detected | none, pure function | none, total function with thread then English fallback at callers |

**Value sourcing** (every value each action produces names where it comes from):

| Action | Value produced or displayed | Source |
|---|---|---|
| Web turn | resolved reply language | session preferred triple when fixed, else user preferred triple when fixed, else phrase match on short turns, else fresh detection on input text, else ask state, else thread heuristic then `en` |
| Web turn | bilingual ask body | fixed copy deck in `src/lib/i18n/dictionary.ts`, one entry per language, sent once per thread and stamped in `askSentAt` |
| Web turn | verdict prose plus evidence | agent turn plus rules engine result rendered in the resolved reply language |
| Web turn | recorded language | the resolved reply language actually streamed, written to the new `replyLanguage` column on the check row |
| WhatsApp decide | resolved reply language | thread preferred triple when fixed, else phrase match on short turns, else fresh detection on inbound text or extracted summary, else stored thread heuristic, else ask once, else thread heuristic then `en` |
| WhatsApp decide | bilingual ask body | same fixed copy deck, short phone shape with no verdict, stamped in `askSentAt` |
| WhatsApp decide | recorded language | the resolved reply language actually sent, written to the new `replyLanguage` column on the event row plus the thread row |
| Settings save | stored triple | your explicit toggle choice plus the current time fanned out to user plus open sessions, owner only |
| Phrase set | stored triple | matched phrase from the versioned list in `src/lib/i18n/dictionary.ts` plus the current time, owner session or sender number only, short turns only with longest match winning |

**Key invariants**:

1. Fixed beats detection on every turn on both surfaces, and detection never overwrites a fixed triple.
2. Only a fixed set or a sent full writes a language value, while asks plus cap notes plus refusals plus failed sends never write one, and the ask writes only its stamp.
3. The bilingual ask goes out at most once per thread until you answer, guarded by the stamp checked in the same write as the send, and unclear later turns use the silent fallback instead of nagging.
4. Phrase matching runs before detection on short turns only and never on turns carrying claim markers, so quoted scam text cannot flip your choice.
5. Rules alone decide the verdict on every path, and language logic never alters score or evidence selection, only rendering language.
6. A fresh window clears tone markers only and never clears your fixed triple or your ask stamp.
7. The interface locale stays chrome only and never resolves reply language, so a French interface with English input earns an English reply.

**Security model**:

Only the owner may write the web triple through their own session, and only the sender number may write the WhatsApp triple for its own thread, so a shared device or a spoofed note cannot flip your voice. Guests write only their own session triple, never another row. Reads follow existing session scope and thread key scope with no widening. Language plus source plus time is the only stored preference data, with no message text in the audit trail, so the privacy surface stays minimal. Arcjet plus the WhatsApp cap plus per sender concurrency stay as today with no relaxation.

**Configuration required**:

No new env vars and no new credentials. The curated phrase list and the bilingual ask copy live as versioned constants beside the existing dictionary, reviewed like any prompt change.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):

1. Happy path: hi with no choice earns one bilingual ask, your answer sets the triple, and the next claim replies fully in that language, verifies **AC-1** plus **AC-2** plus **AC-4**.
2. Fixed stays fixed: with English fixed, a French claim still earns an English full reply with French quotes preserved, verifies **AC-2** plus **AC-10**.
3. Unclear twice: emoji only twice with no choice earns one ask then a silent fallback reply with no nag, verifies **AC-5**.
4. Greeting words: hi maps to English and bonjour maps to French with no ask, verifies **AC-11**.
5. Auth: another session or another sender number cannot flip your triple and gets a denial with no write, verifies **AC-7**.
6. Failure: model down still replies in stored or guessed language with rules verdict only, and shut window stays silent with refusal recorded, verifies **AC-8** plus **AC-9**.
7. Record truth: stored event language equals the language actually sent on both surfaces, verifies **AC-6**.

## Build plan

Ordered by your Journey approach (one full user path usable before the next), with the confirmed model as the target and one nullable migration for the triples plus stamps plus recorded columns:

1. Extend the guesser word lists with short greetings plus the signal flag, add the bilingual ask copy in both languages, and gate signal free web turns to the one time ask guarded by the stamp, satisfies **AC-1** plus **AC-5** plus **AC-11**.
2. Create the single migration for the user triple plus the session triple plus ask stamp plus the separate WhatsApp preferred triple plus ask stamp plus the recorded reply language columns, all nullable with no backfill, satisfies **AC-4** plus **AC-6** plus **AC-7**.
3. Resolve reply language server side in the chat transport with fixed first then phrase match on short turns then detection then stored then ask then fallback, keep interface locale chrome only, create the guest session on first turn, persist phrase sets and the settings toggle with fan out, and record the sent language, satisfies **AC-2** plus **AC-3** plus **AC-4** plus **AC-6** plus **AC-7**.
4. Mirror the same resolution in the WhatsApp worker with the versioned phrase list and longest match winning, keep the fixed triple plus ask stamp across fresh windows while clearing tone markers only, keep shut windows silent, and record the sent language on thread plus event, satisfies **AC-2** plus **AC-3** plus **AC-6** plus **AC-9**.
5. Version the agent prompt with the resolved language slot, render mixed evidence in the reply language with original quotes, wire the model down fallback to stored plus guess with rules verdict only, and cover the critical scenarios in both languages, satisfies **AC-8** plus **AC-10** plus **AC-11**.

## Consequences

**Positive**:

1. English greetings stop earning French replies, and an explicit pick finally holds everywhere.
2. One shared rule plus one copy deck keeps web and WhatsApp in parity by construction.
3. Audit stays lean with language plus source plus time and no message text retained.

**Negative / tradeoffs**:

1. First hi now costs one clarifying turn before any verdict, which slows users who expect instant answers.
2. Three triples in three tables need joint review on every later language change, or the surfaces drift again.

**Neutral**:

1. One nullable migration ships with this change and rolls back by revert since empty reads as no choice.
2. The curated phrase list needs periodic review as users phrase their pick in new ways.

## Follow-up

1. [ ] Phrase list review after launch week, fold real user phrasings into the versioned list when they clearly set a fixed choice.
2. [ ] Consider a gentle per thread reset phrase such as forget my language, only if users ask for it, since stay fixed is the current contract.
3. [ ] Third language input stays on the unclear path of ask once then fallback, and a dedicated third language copy deck waits until real demand shows it.
