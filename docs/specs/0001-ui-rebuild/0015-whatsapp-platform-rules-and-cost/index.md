# 0015. Pin the WhatsApp platform version, cap the reply spend, and render replies for a phone

**Date**: 2026-10-01
**Scope feature**: 19 (WhatsApp platform rules and cost, Path 7)
**Build approach**: Journey (project default, from `docs/scope/scope.md`)

## Summary

Our WhatsApp integration calls a Meta API version that expired in May 2026, so the whole surface is running on a dead version. Meta also changed its pricing on 1 October 2026: we get 1,000 free replies per phone number per month and every reply after that is billed, and free form text sent more than 24 hours after someone writes to us is refused. This spec moves every Meta call onto one pinned current version, keeps our own record of the 24 hour window and the monthly count so we never send a reply we cannot send or pay for one we did not plan, and gives the reply itself a proper phone format in properly accented French.

## Requirements

**User stories**:
- As someone who writes to the CheckAm number, I want an answer that renders properly on my phone in correct French, so that I trust it and forward it to my family.
- As the operator, I want one pinned current Meta version, so that the surface does not silently die on the next expiry.
- As the operator, I want a hard monthly reply cap that costs nothing by default, so that no configuration of mine can spend money I did not approve.
- As the operator, I want every refusal recorded with its reason, so that I can tell a window refusal from a cap refusal and know which one is silencing people.

**Acceptance criteria** (the contract, each one independently checkable):

- **AC-1**: Every Meta call, media download included, resolves its URL through one exported constant in `src/lib/whatsapp`, set to `v26.0`. The literal host `graph.facebook.com` appears in source files only inside that module, and a test fails the build if it appears anywhere else under `src/`.
- **AC-2**: An inbound message opens a 24 hour window on its thread, measured from the earlier of Meta's own message timestamp and our receive time, and any later inbound message from the same sender resets it.
- **AC-3**: A reply that would be sent at or after `windowExpiresAt` is refused before any Meta call. The event records `REFUSED_WINDOW` with reason `WINDOW_EXPIRED` and the window expiry as it stood at that moment, and nothing is sent to the person.
- **AC-4**: A window refusal is silent to the person, because nothing may be sent outside the window. A cap refusal, when the window is still open, sends the cap note: a short message in the sender's language, taken from the two constants in `src/lib/whatsapp`, saying we are at our monthly limit for now. The note is sent at most once per thread per month, and only when the thread has no `capNoteSentAt` in the current month.
- **AC-5**: A reply is counted by a single conditional write that increments the month's `repliesAttempted` only while it is still below the cap, and a write that updates no rows is the cap refusal. The check and the increment are therefore one statement, so two concurrent replies cannot both pass. The month key is derived in the account timezone.
- **AC-6**: Once the current month's count has reached the configured cap, no further reply is attempted. The event records `REFUSED_CAP` with reason `MONTHLY_CAP_REACHED`, and the cap note of AC-4 is sent instead when the window is open and the thread has not already had one this month.
- **AC-7**: The default cap is the 1,000 free replies with zero paid messages, so no configuration and no refusal path can produce a charge without an explicit change to one environment value. The cap note is itself counted against the same cap, so a wave of messages after the cap is reached cannot send without limit.
- **AC-8**: A reply rendered in the new `whatsappReply` field carries the same verdict, evidence and next step as the web answer, uses a real bullet character, never has more than one blank line between sections, is sanitised as a whole so no emoji and no em dash survive anywhere in it, and is at most 1,600 characters. The action block, meaning the next step plus the hotline and forwarding lines a high risk alert carries, is the final block and is never dropped or truncated. On overflow the renderer drops, in this order: the contact lines (number, entity, amount, payment method), then the oldest evidence bullets, then the safety paragraph truncated at a sentence boundary. Only after all three is the ceiling allowed to cut the body, and never the verdict line or the action block.
- **AC-9**: French replies and labels are properly accented everywhere they appear (WhatsApp, web chat, verify response, public dossier page, share text), and English stays unaccented.
- **AC-10**: Missing credentials move no counter, record reason `MISSING_CREDENTIALS`, and leave the event not marked complete, so the failure stays visible instead of becoming a fake success. The step returns normally rather than throwing, because a missing credential is an operator problem that a retry cannot fix; row 27 owns turning the unfinished event into a loud failure.
- **AC-11**: The worker runs at most one message at a time per sender, so one person never receives two overlapping replies and their thread reads in order.
- **AC-12**: `.env.example` documents every new value with a comment and a safe default, and the account timezone defaults to `Africa/Douala`.
- **AC-13**: `docs/WHATSAPP.md` records the pinned version, the cap, the free allowance, the error codes we handle, and a payment method on file as a launch precondition.

## Decision

**Chosen option**: Option 1: One module, one version constant, our own window and cap

Every Meta call goes through `src/lib/whatsapp`, which exports a single pinned `GRAPH_API_VERSION` of `v26.0` and refuses to be overridden by an environment value, because an override is exactly how a version silently drifts and expires again. The same module owns the send call, the 24 hour window check, the monthly cap, the cap note text, and the reply text in its new `whatsappReply` field. The cap is a count of replies, never an amount of money, and it is enforced by a conditional write so the check and the increment cannot come apart.

**Implementation skills**: none consulted. The installed skills in this repo (`ai-sdk`, `frontend-design`, `tailwindcss`) shape model work, web pages and styling, and none of them touch this decision.

## Feature design

**Data model sketch**:

`WhatsAppThread` (new, one row per sender, the unit the window belongs to)
| Field | Type | Notes |
| --- | --- | --- |
| `threadKey` | String, primary key | the raw from number exactly as Meta sends it |
| `normalizedNumber` | String, nullable | deliberately empty, row 21 fills it |
| `waId` | String, nullable | deliberately empty, row 21 fills it |
| `lastInboundAt` | DateTime | the earlier of Meta's message timestamp and our receive time |
| `windowExpiresAt` | DateTime | `lastInboundAt` plus 24 hours, never extended by our own sends |
| `lastOutboundAt` | DateTime, nullable | when we last attempted a reply |
| `capNoteSentAt` | DateTime, nullable | when this thread last got the cap note, so at most one goes out per thread per month |
| `createdAt`, `updatedAt` | DateTime | |

`WhatsAppUsageMonth` (new, one row per phone number per month, the unit the cap belongs to)
| Field | Type | Notes |
| --- | --- | --- |
| `phoneNumberId` | String, part of primary key | the business phone number, because the allowance is per number |
| `month` | String, part of primary key | `2026-10` in the account timezone |
| `repliesAttempted` | Int, default 0 | only ever incremented, never decremented |
| `capAtMonthStart` | Int | the cap in force when the month opened, audit only, never read to make a decision |
| `createdAt`, `updatedAt` | DateTime | |

`WhatsAppWebhookEvent` (existing, fields added)
| Field | Type | Notes |
| --- | --- | --- |
| `threadKey` | String, nullable, foreign key to `WhatsAppThread` | one thread to many events. Nullable so the column can be added to a populated table; written in the same transaction as the thread upsert |
| `inboundAt` | DateTime, nullable | Meta's own message timestamp |
| `replyDecision` | enum `PENDING`, `SENT`, `REFUSED_WINDOW`, `REFUSED_CAP` | defaults to `PENDING` |
| `replyDecisionReason` | String, nullable | `WINDOW_EXPIRED`, `MONTHLY_CAP_REACHED`, `MISSING_CREDENTIALS` |
| `windowExpiresAtAtDecision` | DateTime, nullable | the window expiry as it stood when we decided |

`processedStatus` is not touched by this spec. Writing `FAILED` belongs to row 27, and no existing row needs a backfill: existing events keep `PENDING` and are historical. Note that an unfinished event is indistinguishable from one that has not been processed yet, which is exactly what the existing deduplication guard reads; that ambiguity is row 27's to resolve, and it is why this spec leaves the event unfinished rather than inventing a third status.

**State transitions**:

`replyDecision`: `PENDING` to exactly one of `SENT` (window open, cap not reached, credentials present, Meta call made), `REFUSED_WINDOW`, or `REFUSED_CAP`. Terminal, and written for every event that reaches the decision step whether or not a message left. `processedStatus` moves independently and this spec never sets it to `COMPLETED` on a refusal path.

`capNoteSentAt`: null to a timestamp, once per thread per calendar month in the account timezone. It is set in the same conditional write that counts the note, so a second message in the same month from the same thread cannot produce a second note. A new month clears the condition without clearing the column.

The thread window: `lastInboundAt` and `windowExpiresAt` are written by the webhook on every accepted inbound message, before the worker runs, so a backed up queue cannot make us think a window is open when Meta thinks it is closed.

**API surface**: no new endpoint. The webhook stays public and unchanged in shape; the worker stays the only consumer of the decision.
| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
| --- | --- | --- | --- | --- | --- |
| `POST /api/public/whatsapp/webhook` | POST | Meta payload, `x-hub-signature-256` | `{status, messageId}` | HMAC signature (row 20 and 23 own the fail closed change) | 401 invalid signature, 200 ignored for statuses and unsupported types |
| `whatsapp/thread.open` (module) | called by webhook | `fromNumber`, Meta `message.timestamp` | upserts `WhatsAppThread` and sets the event's `threadKey` in one transaction, returns `threadKey` and `windowExpiresAt` | none, server only | throws on database failure so the 500 path returns and Meta redelivers |
| `whatsapp/month.ensure` (module) | called by worker | `phoneNumberId`, current month | the usage row, created on the first send of the month | none, server only | concurrent creation handled by a create that skips duplicates followed by a read, never by upsert, which is find then write and can still collide |
| `whatsapp/reply.count` (module) | called by worker | `phoneNumberId`, `month`, cap | `{counted: true, countThisMonth}` when the conditional write updated a row, `{counted: false, countThisMonth}` when it did not | none, server only | throws on database failure so Inngest retries |
| `whatsapp/reply.note` (module) | called by worker | `threadKey`, `month`, cap | whether the cap note may be sent, and the text in the sender's language | none, server only | throws on database failure so Inngest retries |
| `whatsapp/send` (module) | called by worker | `to`, body, `phoneNumberId` | Meta response ok flag | bearer token from env | Meta error codes, row 27 reads the body |
| `whatsapp/capText` (two constants) | read by the worker and the note path | none | the cap note in French and in English | none, server only | none |

**Value sourcing**:
| Action | Value produced or displayed | Source |
| --- | --- | --- |
| Open the window | window start | the earlier of `WhatsAppWebhookEvent.inboundAt` (Meta's message timestamp) and `WhatsAppWebhookEvent.createdAt` (our receive time) |
| Open the window | window length | the constant 24 hours in `src/lib/whatsapp`, from Meta's documented customer service window |
| Count a reply | current month key | derived from now in `WHATSAPP_ACCOUNT_TIMEZONE`, validated with `Intl`, not UTC and not the existing `doualaDayStart` helper in `src/lib/chat/day.ts`, which is a hardcoded offset with no daylight saving handling |
| Count a reply | the cap in force | `WHATSAPP_MONTHLY_REPLY_CAP`, read live on every decision so a mid month change takes effect at once. `capAtMonthStart` is audit only |
| Count a reply | the free allowance behind the default | the constant `META_FREE_SERVICE_MESSAGES_PER_MONTH` (1,000) in `src/lib/whatsapp`, documented as Meta's per number monthly free tier |
| Count a reply | which phone number the allowance belongs to | `WHATSAPP_PHONE_NUMBER_ID` |
| Decide a reply | the window state | the `WhatsAppThread` row for the event's `threadKey` |
| Decide a reply | the action block | the existing `nextStep` plus, for `HIGH_RISK`, the ANTIC hotline line and the forwarding line, so "the action block" means that whole closing unit |
| Send the cap note | the text | the two `CAP_NOTE` constants in `src/lib/whatsapp`, one per language, written in the brand voice, not invented at the call site |
| Send the cap note | the language | `detectMessageLanguage` on the inbound text, the same function the main reply uses, so "bilingual" means one language chosen per sender, never both languages in one message |
| Send the cap note | whether one has already gone out this month | `WhatsAppThread.capNoteSentAt` compared against the current month key |
| Render a reply | the body | the new `whatsappReply` field on `VerificationResult`, produced by `renderAlert` in `src/lib/rules/engine.ts` in a new `whatsapp` format, fed by `runRulesEngine` |
| Render a reply | the language | `detectMessageLanguage` on the inbound text, existing |
| Render a reply | bullet character, blank line rule, length ceiling, drop order | constants in the renderer, decided here: bullet `•`, at most one blank line between sections, 1,600 characters, drop order contact lines then oldest bullets then the safety paragraph at a sentence boundary |
| Render a reply | the sanitiser | applied to the whole assembled body in the `whatsapp` format, not per section, because the amount is AI extracted free text interpolated without cleaning today |
| Launch readiness | payment method on file | a documented operator step in `docs/WHATSAPP.md`; the Cloud API does not reliably expose it, row 29 surfaces it |

**Key invariants**:
- The literal host `graph.facebook.com` appears in source files only inside `src/lib/whatsapp`, and the version is a constant, not configuration. A URL assembled from parts or from an environment value cannot be caught by the test, so this is a convention the test mostly enforces, not a proof.
- A reply is counted only when the window is open, the cap is not reached, and credentials are present, and the count happens before the Meta call, never after.
- The check and the increment are one conditional write. A plain read followed by a plain increment is a race and is not acceptable here.
- The counter only ever increments. It is accepted that a step retry can count one attempt twice, because a committed write whose result was never recorded is re-run; this drift is in the safe direction, it makes us stop slightly early rather than slightly late, and it is why the counter is never described as exact.
- `windowExpiresAt` is always `lastInboundAt` plus 24 hours. Our own replies never extend it.
- Every event that reaches the decision step gets a `replyDecision`, including every refusal.
- A window refusal never produces an outbound message, whatever the credentials or the cap say.
- The cap note is counted against the same cap and is limited to one per thread per month, so no refusal path can send without limit.
- No secret is ever placed in the Inngest event payload. The new fields are identifiers and timestamps only.

**Security model**:
No new authorization surface. The webhook remains fully public, and signature verification, replay protection and the per sender daily cap stay exactly where they are today, owned by rows 20 and 23. This spec adds no endpoint, no admin page and no role. What it does add is a new store of personal data: `WhatsAppThread` holds phone numbers and timestamps, alongside the full Meta payload already stored in `rawPayload`. No card or payment data is handled, so no payment compliance scope applies, but phone numbers are personal data and the retention rule for them is currently unowned (see Follow-up). Secrets stay in environment values read inside `src/lib/whatsapp` and never travel in an event payload.

**Configuration required**:
- `WHATSAPP_MONTHLY_REPLY_CAP`: total replies allowed per phone number per month. Default `1000`, which is exactly Meta's free allowance, so the default costs nothing. A value above 1,000 opts in to billed messages. `0` is a valid value meaning no replies at all. Only a value that is not a usable whole number (empty, not a number, negative, fractional) falls back to the default, so an operator can always silence the bot. This deliberately differs from the `TAVILY_DAILY_BUDGET` parser at `src/lib/agent/tools.ts:135`, which treats `0` as junk.
- `WHATSAPP_ACCOUNT_TIMEZONE`: the timezone Meta resets the allowance in. Default `Africa/Douala`, validated through `Intl` so an unusable value falls back rather than throwing at request time.
- Deliberately **not** configured: the API version, which is a constant in `src/lib/whatsapp/graph.ts`, and a per message rate. A rate value was considered for reporting and dropped, because nothing in this spec stores or displays a cost and a dead environment value is worse than none. Row 29 can add one when there is a run history to show it on.

**Critical test scenarios**:
- Happy path: an inbound text at time T, a reply inside 24 hours. The event reads `SENT`, the month counter reads 1, the body renders in the sender's language. Verifies **AC-2**, **AC-5**.
- Window boundary: an inbound message at T, a reply attempt at exactly T plus 24 hours is refused, an attempt one minute earlier is sent. Verifies **AC-2**, **AC-3**.
- Clock skew: Meta's message timestamp is six hours older than our receive time. The window is computed from the earlier of the two, so we never send what Meta would reject. Verifies **AC-2**, **AC-3**.
- Cap boundary under concurrency: the counter sits at 999 with a cap of 1,000, and two replies race. Exactly one conditional write updates a row, so exactly one reply is sent and the counter ends at 1,000. Verifies **AC-5**, **AC-6**.
- Cap reached: the counter is at the cap and the window is open. The event reads `REFUSED_CAP` with `MONTHLY_CAP_REACHED`, the cap note goes out in the sender's language, and the note is itself counted. Verifies **AC-4**, **AC-6**, **AC-7**.
- Cap note once a month: the same thread sends three more messages after the cap is reached. One note goes out in the first month, none in the others' first message, and the note is counted against the cap each time. Verifies **AC-4**, **AC-7**.
- Cap silent path: the counter is at the cap and the window is closed. Nothing is sent at all, not even a note. Verifies **AC-4**, **AC-6**.
- Cap configuration: no value set gives 1,000, a value of `0` gives silence, a value above 1,000 is honoured, and an unusable value falls back to 1,000. Verifies **AC-7**.
- Missing credentials: the API token is absent. The counter does not move, the reason is `MISSING_CREDENTIALS`, the event is not marked complete, and the step returns rather than throwing, so the run is not retried. Verifies **AC-10**.
- Month rollover: a send at 23:30 in `Africa/Douala` on the last day of the month opens the next month's row, and the cap note becomes available again for a thread that already had one. Verifies **AC-5**, **AC-4**.
- Month creation race: two senders in different threads are the first of the month. Both get the same usage row, with no unique constraint error escaping. Verifies **AC-5**.
- Timezone junk: `WHATSAPP_ACCOUNT_TIMEZONE` set to a value `Intl` rejects falls back to `Africa/Douala` instead of throwing. Verifies **AC-12**.
- Per sender limit: a test asserts the worker function is configured with a concurrency of 1 keyed on the sender, rather than trying to observe queue behaviour in a unit test. Verifies **AC-11**.
- Version pin: a test scans `src/**` for the literal `graph.facebook.com` and fails if it appears outside `src/lib/whatsapp`. It matches the host only, not version strings, so a model name in the AI module cannot trip it. Verifies **AC-1**.
- Renderer: golden strings for FR and EN across all three verdicts. Assert accented French, the bullet character, at most one blank line between sections, the action block last, no emoji and no em dash anywhere in the body including inside an amount containing an emoji, at most 1,600 characters, and the same verdict as the web format. Verifies **AC-8**, **AC-9**.
- Renderer overflow: a verdict with the longest French safety paragraphs and four evidence bullets. The contact lines go first, then the oldest bullets, then the safety paragraph at a sentence boundary, and the verdict line and action block survive intact. Verifies **AC-8**.
- Real device: one screenshot of the rendered reply on a small Android phone, confirming WhatsApp shows the bold header and the bullets as intended. Verifies **AC-8**. This needs real credentials and a real number, so it is a verification step for the engineer, not an automated test.
- Configuration recorded: each of the two new values appears in the WhatsApp block of `.env.example` with a comment and its default, and `docs/WHATSAPP.md` names the pinned version, the cap, the free allowance and the payment method precondition. Checked by reading both files during verification. Verifies **AC-12**, **AC-13**.

## Build plan

Ordered by the project's Journey approach, and each step leaves WhatsApp usable on its own. Step 1 alone restores a surface that is currently calling a dead version.

1. [x] Pin the version and open the module. Create `src/lib/whatsapp/graph.ts` with the `GRAPH_API_VERSION` constant set to `v26.0` and a URL helper. Move the media fetch and the send call onto it, deleting both inline `v19.0` strings. Add the host scanning test so a third call site cannot appear. Satisfies **AC-1**.
2. [x] Create the migration for the confirmed data model: `WhatsAppThread` with `capNoteSentAt`, `WhatsAppUsageMonth`, the five fields and the `replyDecision` enum on `WhatsAppWebhookEvent` with a nullable `threadKey` foreign key, and an index on `threadKey`. Additive and nullable first, no backfill, per `prisma/AGENTS.md`. Satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**.
3. [x] Open the window in the webhook. Store `inboundAt` from Meta's message timestamp, and in one transaction upsert the thread with `lastInboundAt` as the earlier of the two clocks, set `windowExpiresAt` to plus 24 hours, and write the event's `threadKey`. Then in the worker, read the thread and refuse at the edge when the window is closed, writing `REFUSED_WINDOW` and the window expiry. Satisfies **AC-2**, **AC-3**.
4. [x] Add the cap. Derive the month key in the account timezone, create the month row with a create that skips duplicates, then count the reply with one conditional write that increments only while under the cap and treats no rows updated as the refusal. Write `REFUSED_CAP` and, when the window is open, send the cap note once per thread per month through the same counted write, with both language constants in the module. Satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**.
5. [x] Remove the fake success. Missing credentials move no counter, record `MISSING_CREDENTIALS`, leave the event unfinished, and return without throwing. Keep a log only dispatch in development so local work still works without credentials, and make it impossible in production. Drop the per sender concurrency to 1. Satisfies **AC-10**, **AC-11**.
6. [x] Give the reply a phone format. Add a `whatsapp` format to `renderAlert` exposed as `whatsappReply` on the verdict result, with the whole body sanitised as one string, the bullet character, the one blank line rule, the 1,600 character ceiling and the stated drop order. Restore accents across the French literals in the engine. The existing rules tests pin no accented string, so they should pass unchanged; add the golden renderer tests instead. Satisfies **AC-8**, **AC-9**.
7. [x] Wire configuration and documentation. Add the two environment values to the WhatsApp block in `.env.example` with comments and defaults, and rewrite the operational sections of `docs/WHATSAPP.md` to carry the pinned version, the cap, the free allowance, the handled error codes and the payment method precondition. Satisfies **AC-12**, **AC-13**.

## Consequences

**Positive**:
- The WhatsApp surface stops depending on an API version Meta has already retired.
- No reply is attempted that Meta would reject, and no reply is sent that we did not budget for.
- Every silence is explainable: the event says whether the window or the cap caused it.
- The French we send is French a person can trust, on WhatsApp and on the web, from one source.
- Row 29 gets a run history almost free, because the decision and the reason are already columns.

**Negative / tradeoffs**:
- After 1,000 replies in a month the bot goes quiet, and a quiet month is often exactly a scam wave month. This is a deliberate money decision with a real product cost, reversible by changing one environment value, which takes effect on the next reply because the cap is read live.
- Our count is attempts, not deliveries, and a step retry can count one attempt twice, so the number will sit above Meta's real bill and we will occasionally stop a little early. That is the intended direction of the error, not an oversight.
- Once the cap is reached, the cap note is itself a send. A thread that messages us hourly burns its own monthly allowance on notes, and the first thread to do that can consume a meaningful slice of the month's replies. The once per thread per month limit bounds it; it does not make it free.
- The accent fix is a content change, not just a technical one. Someone has to read the French carefully, and the same literals feed seven surfaces, so the diff is wider than the WhatsApp work suggests.
- The reply shape is now decided here, so scope row 22 keeps only content parity. A later change to how a reply reads needs this spec updated first, which is friction on purpose. Row 22 also mentions a polite reply at the cap; the text of that reply is owned here, and row 23 adds only the per sender daily cap beside it.
- The version constant must be bumped by hand every year or so, and nothing warns us. That is the price of refusing an environment override, and the check in Follow-up is the mitigation.
- Two new tables and a new module is more surface for a product that has not launched. The alternative was relying on Meta's rejections, which is worse.
- The WhatsApp guide page still hardcodes its own French replies with emoji bullets at `src/app/(site)/whatsapp/page.tsx:14`, so the guide advertises a shape this spec forbids. Row 28 owns the fix; until then the public guide and the bot disagree.

**Neutral**:
- The migration is additive and nullable first, so existing events stay as they are, no backfill runs, and the new columns can be added to a populated table in one step.
- An event left unfinished is indistinguishable from one not yet processed, which is what the existing deduplication guard reads. Row 27 resolves that.
- `processedStatus` still has no `FAILED` writer. That stays with row 27.
- Signature verification is still skipped when the app secret is a placeholder. Rows 20 and 23 change that, not this spec.
- Status webhooks are still ignored. Row 27 and row 29 own them.
- Delivery receipts remain informational, as `docs/WHATSAPP.md` already states.
- Development keeps a log only dispatch, so local work runs without credentials. Production cannot take that path.

## Follow-up

- [ ] Retention and deletion for `WhatsAppThread` and for `rawPayload` is unowned. Row 24 (thread memory) is the right home, since that is where durable per number data lands. Raise it there rather than bolting a job onto this spec.
- [ ] A version expiry check: a scheduled job or a CI step that fails when `GRAPH_API_VERSION` is within 90 days of a published sunset date. Until it exists, the pin has to be remembered by a human.
- [ ] Point row 28 (WhatsApp guide truth) at `src/app/(site)/whatsapp/page.tsx:14`, whose hardcoded French replies use emoji bullets and now contradict this spec. The simulator should render from `whatsappReply`.
- [ ] A copy pass on the long French safety paragraphs in `src/lib/rules/engine.ts` (up to 980 characters each). They are what forces the 1,600 ceiling, and a tighter version would let a scam alert fit on one phone screen without dropping evidence.
- [ ] A per message rate can be added when there is a run history to show it on. Row 29 is the place. The Cameroon rate card is unconfirmed, so do not guess a number before the first real Meta invoice.
- [ ] A payment method on file cannot be confirmed through the Cloud API as far as we could verify, so it stays a documented launch step here and a health check in row 29.
- [ ] Confirm the bullet rendering and the blank line behaviour on a small Android phone during verification, since neither is something a unit test can prove. This needs real credentials.
- [ ] The umbrella `index.md` needs a line for this child (done in the same change).
- [ ] Root `AGENTS.md` has no `## Agent skills` section. Not load bearing for this spec, but it is already tracked in the scope's Deferred list.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
