# 0015. Rationale: WhatsApp platform rules and cost

## Context

Two platform changes landed under us and neither is visible from inside the repository. The first is version expiry: the integration hardcodes `v19.0` in two places, the media fetch in `src/inngest/functions/process-whatsapp-message.ts:59` and the send at line 108. Meta's changelog records v19.0 as expired on 2026-05-21, and the current version is v26.0 (basis: Meta Graph API changelog, see References). A dead version does not degrade, it fails, so this is the most urgent item in Path 7 and it gates the rest.

The second is pricing. Meta moved from per conversation to per message billing in July 2025, and from 1 October 2026 free form service messages inside the customer service window became billable too. The free allowance is now 1,000 service messages per business phone number per month, resetting at midnight in the account timezone, and message 1,001 is charged at the market rate (basis: Meta WhatsApp pricing and non template messages documentation). Meta publishes rate cards per market and we could not confirm which card Cameroon (country calling code 237) falls under, so no rate we can write down today is trustworthy.

The customer service window is the third fact. Any inbound message of any type opens a 24 hour window, and each later inbound message resets it. Outside that window Meta rejects free form text outright with error code 131047. We keep no inbound timestamp today, so we cannot know whether a reply is legal, and the send path has no decision step at all: it posts and hopes.

Money and legality are entangled with a fourth problem, the shape of the reply itself. The string we send is the same string the website shows and the same share text, built by `renderAlert` in `src/lib/rules/engine.ts:491` and reused by the chat transport, the verify route, the public dossier page, the verdict card and the share payload. Our French is written without accents ("Numero a surveiller", "Ce message a ete analyse") even though the same file already contains correctly accented French at line 368. On a phone the reply uses a hyphen as a bullet, which WhatsApp renders as a literal hyphen, and a message aimed at a scared person reading unaccented French is a message we are asking them to trust on thin evidence.

The result of not deciding: replies we cannot legally send, a bill we did not agree to, and copy that undercuts the one thing this product sells.

## Options considered

### Option 1: One module, one version constant, our own window and cap

Extract every Meta call into `src/lib/whatsapp`, keep the window and the monthly count in our own tables, and decide before sending rather than after failing.

**Pros**:
- One door to Meta, so a version bump is one edit and cannot be half applied.
- The send decision happens before we spend anything or waste an attempt.
- The refusal reason is data we own, so row 29 can build a run history on it.

**Cons**:
- Two new tables and a migration, and the window logic is now ours to maintain.
- Our counter is an opinion, not Meta's ledger, so it will drift from the real bill.

### Option 2: Keep the calls inline and add only the checks

Swap the version string in place and add the window and cap logic inside the existing worker.

**Pros**:
- Smallest diff, nothing new to learn.
- No new module to read.

**Cons**:
- The version stays duplicated in two files, which is the bug we are fixing.
- The rules engine keeps growing phone concerns, and every future WhatsApp decision lands in a worker file that also does extraction.

### Option 3: Let Meta be the ledger

Trust Meta's own rejection (error 131047) and its own billing as the only limits, and add no tables.

**Pros**:
- Nothing to maintain, and the numbers are Meta's own.
- No clock questions, no timezone questions.

**Cons**:
- We learn about an illegal send only by attempting it, and a rejection is a poor experience for a person mid question.
- There is no cap. The first viral scam week is the first invoice, and the first thing we learn about cost is the invoice amount.

### Option 4: Route replies through a BSP (a provider that resells WhatsApp)

Move sending, templates and limits to a Business Solution Provider such as Twilio or 360dialog.

**Pros**:
- Templates, delivery receipts and billing handled for us.
- A support path when Meta refuses something.

**Cons**:
- Adds a vendor, a second bill and a second failure mode between us and the person who needs help.
- The per message cost is the same, so it solves the problem we actually have (the cap) not at all.
- Nothing in the current stack points at a BSP, so this is new operational surface for a pre launch product.

## Rationale

Option 1 wins because the failure we are preventing is silent. An expired version and an unbudgeted bill are both invisible until a person in Cameroon does not get an answer, and both are cheap to prevent if the decision happens in our code before the Meta call rather than in Meta's rejection afterwards. Option 3 is the tempting one because it has no tables, but it makes Meta the only ledger we have, and a ledger that can only tell us after the fact is not a cap.

The version is a constant rather than an environment value for the same reason. The whole failure this spec exists to fix is a value that was correct when written and wrong eighteen months later, and a value that two files and an operator can each change is a value that will be changed in one place. The cost is a manual bump every few months, which I have put in Follow-up as a check that warns us, rather than a silent knob.

Refusing at our edge instead of sending a template is a deliberate product choice with a real cost. Outside the window we say nothing, so someone who writes, waits a day and writes nothing back gets no closing answer. The alternative is an approved template, which costs approval time and a billed message to deliver a link to a page they did not ask for. For a scam alert, silence is the more honest answer, and the counter of window refusals (which AC-3 records) gives us the data to revisit this with evidence rather than a feeling.

I count attempts rather than deliveries, which makes our number drift above Meta's bill. That is the safe direction to be wrong in: we stop slightly early rather than slightly late. Two things make the drift explicit rather than hidden. A step retry can count one attempt twice, because a counter write that committed before the process died is re-run, so the counter is monotonic but never exact. And the cap note is a real send, so it is counted against the same cap and limited to one per thread per month, otherwise a wave of messages after the cap is reached would produce unbounded billed sends through the very path meant to stop them. Reconciling against real deliveries belongs with row 27, which is already reading the send response and the status webhook.

The reply ceiling is 1,600 characters rather than the 1,200 I first proposed, because the existing French safety paragraphs run to 980 characters on their own and a ceiling below the real content either truncates the advice that stops someone losing money or is exceeded on every high risk alert. The fix is not a bigger number alone, it is a stated drop order, so what disappears when a reply runs long is a deliberate choice rather than whatever the string library does. The French safety paragraphs are also the obvious candidate for a copy edit in a later pass, and that is in Follow-up.

## References

**Project sources** (verifiable, in this repo):
- `AGENTS.md`, the rules that the rules engine issues every verdict and that all user facing text ships in French and English
- `src/inngest/AGENTS.md`, the convention that jobs fail safely or log rather than pretend to have sent, and that the WhatsApp path stays aligned with the web path
- `prisma/AGENTS.md`, the requirement that a new table ships with an explicit spec and a migration
- spec `0001` umbrella, the cross child contract that all user strings ship in both languages
- `src/lib/rules/engine.ts:491` (`renderAlert`) and its French literals at `:359`, `:363` and `:368`, `src/inngest/functions/process-whatsapp-message.ts:59` and `:108`, `src/app/api/public/whatsapp/webhook/route.ts:125` (the current shape of the thing being changed)
- `src/lib/agent/tools.ts:135` (the existing budget parse this cap deliberately differs from) and `src/lib/chat/day.ts` (the day helper this spec does not reuse for the account timezone)
- `src/tests/rules.test.ts`, which pins no accented string, so the accent fix should not require changing it
- `src/app/(site)/whatsapp/page.tsx:14`, the guide's hardcoded French replies, which contradict the format decided here
- `docs/WHATSAPP.md`, the operational document this spec updates

**Practices & standards**:
- Idempotency and monotonic counters for anything that spends money
- Conditional write for quota enforcement, so the check and the increment are one statement and cannot race
- Fail loud rather than report a fake success
- Additive, nullable first migrations in a running system
- Meta's 24 hour customer service window and its per message pricing model

**Links** (web verified during this design conversation):
- Graph API versions and expiry dates: https://developers.facebook.com/docs/graph-api/changelog/versions/
- Graph API v26 release: https://developers.facebook.com/blog/post/2026/07/29/introducing-graph-api-v26-and-marketing-api-v26/
- WhatsApp pricing, including the 1 October 2026 change and the free monthly tier: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- Non template messages and the customer service window: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages/
- Messaging limits and tiers: https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits
- Error codes, including 131047: https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes
- Status webhook payload reference: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status
- Policy enforcement and quality rating: https://developers.facebook.com/documentation/business-messaging/whatsapp/policy-enforcement/

Two Meta documentation pages returned a blocked response when fetched directly, so the pricing and billing figures above were read from search results rather than from the page body. Confirm them in WhatsApp Manager before relying on a specific rate. The Cameroon rate card, the payment method and spend cap behaviour, and the non Meta country verification rules were not confirmed at all and are flagged as unverified in this spec.
