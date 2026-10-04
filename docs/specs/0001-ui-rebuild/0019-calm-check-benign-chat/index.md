# 0019. Calm check for benign chat

**Date**: `2026-10-04`
**Status**: `In Progress`
**Scope feature**: 35 in `docs/scope/scope.md`
**Build approach**: Journey, one full user path at a time, each phase usable

## Summary

You get calm chat on web and WhatsApp that feels like chatting with ChatGPT or Claude. Small talk gets a warm short reply with no verdict and no alarm. Product questions get a clear explainer that invites a try. True checks keep full evidence with the verdict from rules, which is the final decision from your deterministic scorer.

## Requirements

**User stories**:

1. As someone who says hello to test the tone, you want a warm short reply with no verdict, so you trust the chat and stay to check a true claim.
2. As someone who asks how it works, you want a short explainer in your language with a try prompt, so you know what to paste next.
3. As someone with a true claim, you want full evidence plus a clear verdict from rules, so you know what to do before you pay or trust.
4. As the operator, you want benign turns counted apart from true checks, so you can see false alarms drop with no new tables.

**Acceptance criteria**:

1. `AC-1`: Short small talk with no link and no phone number and no amount and no email and no flyer text gets a warm short reply with no verdict tag and no share row, in the thread language, in EN and FR.
2. `AC-2`: How does it work and what can you do get a short explainer in the thread language plus one try prompt, with no verdict and no share row, in EN and FR.
3. `AC-3`: A message with a link or a phone number or an amount or an email or readable flyer text or long text above 140 characters stays a true check with full verdict shape and evidence from rules.
4. `AC-4`: Hello plus a claim in the same turn is treated as a true check, never as benign.
5. `AC-5`: Empty or unreadable input gets a warm ask for full text or a clear picture, with no verdict, in EN and FR.
6. `AC-6`: Web chat and WhatsApp and the guide simulator share the same calm path and the same copy, so what you advertise equals what the bot sends.
7. `AC-7`: Relaxed tone holds everywhere. Benign turns sound chatty. True checks stay plain and firm, with alarm only where risk is present.
8. `AC-8`: Each turn is counted as benign or check in logs with no new tables, so you can watch the mix over time.

## Decision

**Chosen option**: Option 1: Shared helper with rules first

You extend the existing claim test in `src/lib/whatsapp/tone.ts` with one copy deck shared by web and WhatsApp, with rules final for true checks. This keeps one source of truth with no drift and tone even while safety stays firm. You save benign turns for context with no verdict and no guest charge.

## Rationale

Reasoning and options: see [rationale.md](./rationale.md)

## Feature design

**Data model sketch**:

No new tables and no migration. `ChatMessage` and `WhatsAppWebhookEvent` stay as they are. Intent lives only in code plus log counts, never as a stored column. This keeps the change lean and reversible.

**State transitions**:

1. Inbound arrives, helper tests for claim signals first, benign wins only when no signal is present.
2. Benign small talk, send warm short reply, skip extraction, skip verdict, skip share row.
3. Benign product question, send short explainer plus try prompt, skip extraction, skip verdict, skip share row.
4. True check, run extraction plus tools plus rules as today, send full verdict shape.
5. Empty or unreadable, send warm ask for full text or clear picture, with no verdict.
6. Mixed hello plus claim, take the true check path.

**API surface**:

1. `isBenignChat` extends `isNewClaimText` in `src/lib/whatsapp/tone.ts`, internal call, inputs raw text plus `hasMediaText` flag plus length, outputs benign kind small talk or product question or check.
2. `renderBenignReply` in `src/lib/chat/benign.ts`, internal call, inputs benign kind plus language, outputs short body with no verdict, calm under 400 characters and explainer under 800.
3. Chat transport in `src/app/api/chat/transport/route.ts`, uses the helper before extraction, returns calm reply for benign and full flow for check, benign uses the same text stream shape.
4. WhatsApp worker in `src/inngest/functions/process-whatsapp-message.ts`, uses the same helper before extraction, sends calm reply for benign and full verdict for check.
5. Guide simulator in `src/app/(site)/whatsapp/page.tsx`, renders from the same calm copy, so advertised replies equal real replies.

**Copy deck**, fixed words only, no other wording may ship:

1. Warm hello `en`, Hey there, good to see you. Paste a message or a flyer and I will check it for you.
2. Warm hello `fr`, Salut, ravi de vous voir. Collez un message ou un flyer et je le verifie pour vous.
3. Explainer `en`, I check suspicious messages before you pay or trust. Paste the full text, or a clear photo, or a phone number, and I give you a clear verdict with reasons. Try it now, paste what you got.
4. Explainer `fr`, Je verifie les messages suspects avant que vous payiez ou fassiez confiance. Collez le texte complet, ou une photo claire, ou un numero, et je vous donne un avis clair avec les raisons. Essayez, collez ce que vous avez recu.
5. Empty ask `en`, I could not read this. Please send the full text or a clear picture.
6. Empty ask `fr`, Je nai pas pu lire ce message. Envoyez le texte complet ou une photo claire.

**Trigger lists**, starter sets in code with tests, doubt means check:

1. Small talk `en`, `hi` and `hello` and `hey` and `thanks` and `thank you` and `ok` and `okay`.
2. Small talk `fr`, `salut` and `bonjour` and `bonsoir` and `merci` and `ok`.
3. Product question `en`, `how does it work` and `what can you do` and `how do I check`.
4. Product question `fr`, `comment ca marche` and `que peux tu faire` and `comment verifier`.
5. Order per inbound is claim test first, then scam phrase safety net from `src/lib/rules/keyword-rules.ts`, then product question, then small talk, then check on doubt. Scam phrases like double money force check even when short.

**Value sourcing**:

1. Calm reply body, source fixed copy deck above in EN and FR per benign kind.
2. Reply language, source stored choice where present, else `detectMessageLanguage` result, else `en`.
3. Try prompt, source fixed copy deck, one line inviting a paste.
4. Verdict line for true checks, source rules engine result for this check.
5. Evidence bullets for true checks, source rules engine result for this check.
6. Benign or check count, source helper outcome per turn in app logs plus Inngest run history as `check.kind` with `benign` or `check`, no new tables.
7. Media text flag, source extractor output as `hasMediaText`, worker trusts it.

**Key invariants**:

1. Benign never emits `CAUTION` and never emits `HIGH_RISK` and never emits `VERIFIED_OFFICIAL`.
2. Benign never shows a share row and never shows evidence bullets.
3. Any link or phone number or amount or email or readable flyer text forces the check path.
4. Uncertain reads as check, never as benign, so a fresh scam cannot get a calm reply.
5. Rules alone decide the verdict for true checks, the helper only routes, never judges risk.
6. Benign turns save to the thread for context with no verdict and no guest budget charge, so follow ups keep sense.

**Key invariants**:

1. Benign never emits `CAUTION` and never emits `HIGH_RISK` and never emits `VERIFIED_OFFICIAL`.
2. Benign never shows a share row and never shows evidence bullets.
3. Any link or phone number or amount or email or readable flyer text forces the check path.
4. Uncertain reads as check, never as benign, so a fresh scam cannot get a calm reply.
5. Rules alone decide the verdict for true checks, the helper only routes, never judges risk.

**Security model**:

Public input stays untrusted on both surfaces. The helper reads raw text only and holds no secrets and cannot send. Extraction and sends stay outside the helper as today. Benign replies carry no links and no pay instructions, so a planted instruction in small talk has nowhere to run. Rate caps and signature checks stay as they are.

**Configuration required**:

No new env vars. Thresholds live as named constants in code with tests, so tuning is a code edit with review.

**Critical test scenarios**:

1. Happy benign, hello gets warm short with no verdict, verifies `AC-1`.
2. Product question, how does it work gets explainer plus try prompt, verifies `AC-2`.
3. True claim, message with phone number gets full verdict from rules, verifies `AC-3`.
4. Mixed, hello plus phone number takes check path, verifies `AC-4`.
5. Empty, blank input asks for full text with no verdict, verifies `AC-5`.
6. Parity, same input on web and WhatsApp returns same calm shape, verifies `AC-6`.
7. Tone, benign sounds chatty while high risk stays firm with action lines, verifies `AC-7`.

## Build plan

1. Add the shared helper plus copy deck in EN and FR with unit tests for greetings and product questions and claim signals, satisfies `AC-1`, `AC-2`, `AC-3`, `AC-4`.
2. Wire web chat to use the helper before extraction, with calm reply and no share row for benign, satisfies `AC-1`, `AC-2`, `AC-6`, `AC-7`.
3. Wire WhatsApp worker to use the same helper, keeping the full verdict path for checks and the warm ask for empty, satisfies `AC-3`, `AC-4`, `AC-5`, `AC-6`, `AC-7`.
4. Update the guide simulator to render from the same calm copy, plus add benign or check counts to logs, satisfies `AC-6`, `AC-8`.

## Consequences

**Positive**:

1. You feel welcome on first hello, so you stay to check true claims.
2. False CAUTION drops on small talk, so true alarms keep weight.
3. Web and WhatsApp sound as one, so what you advertise is what you send.

**Negative and tradeoffs**:

1. Short slang in EN and FR may need tuning after launch, so some benign turns may still take the check path at first.
2. A claim phrased with no signal words could slip calm until lists grow, so tuning must favor check on doubt.

**Neutral**:

1. No schema change, so rollout is code only with no backfill.

## Follow up

1. [ ] Tune word lists from real benign turns after launch, keeping uncertain as check.
2. [ ] Review guide screenshots once the calm copy ships, so visuals match the new tone.
