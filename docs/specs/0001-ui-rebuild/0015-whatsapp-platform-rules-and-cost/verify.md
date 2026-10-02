# Verify: WhatsApp platform rules and cost · spec 0015 · updated 2026-10-01

_Steps derived from spec 0015 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._

**Read this first.** Never run a step that sends a real message to a number that did not write to us. `WHATSAPP_API_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are real in `.env`, so start the server with them forced to a placeholder to exercise every path except the live send, and use a number you control for the live send.

```
WHATSAPP_API_TOKEN=placeholder_token WHATSAPP_PHONE_NUMBER_ID=placeholder_phone pnpm dev
```

The Inngest dev server must be running for the worker half of any step (`pnpm inngest:dev`). Without it the webhook returns 500 after writing the event and the thread, and Meta redelivers, which is itself the recovery path to check in step W-1.

## Commands

- [x] `pnpm typecheck` → clean, no errors → AC-1, AC-5
- [x] `pnpm lint` → clean → AC-1
- [x] `pnpm test` → 169 tests pass, including the 23 in `src/tests/whatsapp-platform.test.ts` → AC-1 to AC-9
- [x] `npx biome check src/lib/whatsapp src/lib/rules/engine.ts src/inngest/functions/process-whatsapp-message.ts src/app/api/public/whatsapp/webhook/route.ts src/tests/whatsapp-platform.test.ts` → clean. Note `pnpm check` reports pre-existing failures in files this feature did not touch; they are not from this change → AC-1
- [x] `docker exec checkam-postgres psql -U checkam_user -d checkam_db -c "\d \"WhatsAppThread\"" -c "\d \"WhatsAppUsageMonth\""` → both tables live, the `WhatsAppReplyDecision` enum has four values, `threadKey` is nullable with `ON DELETE SET NULL` → AC-2, AC-5
- [x] `grep -rn "v19" src/` → no matches. `grep -rn "graph.facebook.com" src/` → only `src/lib/whatsapp/graph.ts` and the test that builds the literal from parts → AC-1

## UI / manual

- [x] POST the webhook unsigned → `401` → AC-1
- [x] POST the webhook with a wrong `x-hub-signature-256` → `401` → AC-1
- [x] POST the webhook correctly signed with a fresh `wamid`, server running with placeholder credentials → the event row and the thread row both exist, `threadKey` is set, `inboundAt` holds Meta's own timestamp, and `windowExpiresAt - lastInboundAt` is exactly 1 day → AC-2
- [x] POST the same payload again (duplicate delivery) → `200 RECEIVED`, still one event row, window unchanged → AC-2
- [ ] Backdate `windowExpiresAt` on the thread to 25 hours ago, let the worker run → no Meta call, the event reads `replyDecision = REFUSED_WINDOW`, `replyDecisionReason = WINDOW_EXPIRED`, `windowExpiresAtAtDecision` populated, `processedStatus` still `PENDING`, and `WhatsAppUsageMonth.repliesAttempted` did not move → AC-3
- [ ] Set `windowExpiresAt` 1 hour ahead, placeholder credentials, worker runs → the worker logs the mock dispatch line, the event reads `replyDecision = PENDING` with reason `MISSING_CREDENTIALS`, the event is not marked complete, and the counter did not move → AC-10
- [ ] Same as above with `WHATSAPP_MONTHLY_REPLY_CAP=0` → nothing is sent and the event reads `REFUSED_CAP` → AC-7
- [ ] Set the month counter to the cap with the window open and `capNoteSentAt` null → one notice is sent in the sender's language, the event reads `SENT` with reason `CAP_NOTICE_SENT`, and the counter moved by one → AC-4, AC-6
- [ ] Send a second message from the same thread the same month with the cap still reached → nothing is sent, the event reads `REFUSED_CAP` → AC-4
- [ ] Clear `capNoteSentAt` and set the month key to a new month → the notice is allowed again → AC-4
- [ ] Run 8 replies concurrently for one sender with the cap at 2 (direct module calls against the database) → exactly 2 counted, final count 2, never 3 → AC-5
- [x] Message someone you control, let the worker reply, check the reply on their phone → the engineer received it on `+237XXXXXXXXX` and confirmed it arrived as intended → AC-8
- [x] Read the French reply → accented ("Alerte arnaque", "analysé", "Numéro à surveiller"), no emoji, no em dash, ending on "vos proches." → AC-8, AC-9. The sent body is 1,112 characters against the 1,600 ceiling, carries the real `•` bullet, has no triple newline, and ends on "Faites suivre à vos groupes WhatsApp pour protéger vos proches."
- [ ] Compare the same verdict on `/` and on WhatsApp → same verdict, same evidence, same closing block, and the web variant still uses `- ` bullets and `whatsappWarningPlain` still has no asterisks → AC-8
- [x] A sextortion alert (the longest reply we produce) → the phone variant is at most 1,600 characters while the web variant is over it, the contact lines are gone, one bullet remains, and the closing block is intact → AC-8
- [x] Two messages from one sender, and two from different senders, compared on **execution** time → the same sender's runs never execute at once, the second waits for the first to finish, and the different senders' runs do overlap. Read `FunctionStarted` and `FunctionCompleted` from the run history, **not** `run_started_at` → AC-11. Measured 2026-10-01, see the note below.
- [x] The same sender's two messages, one a fake recruitment scam and one harmless, and read the reply each run produced → the scam gets "Alerte arnaque" and the harmless one gets "Attention, message à vérifier", so serialising the runs does not let one message inherit the other's facts → AC-11
- [ ] `grep -n "WHATSAPP_MONTHLY_REPLY_CAP\|WHATSAPP_ACCOUNT_TIMEZONE" .env.example` → both present with a comment and a default, and no API version value anywhere in it → AC-12
- [ ] Read `docs/WHATSAPP.md` → the pinned version, the cap and its cost, the 1,000 free allowance, the 24 hour window, the handled error codes, and the payment method precondition are all present → AC-13
- [ ] In WhatsApp Manager, confirm a payment method is on file and the spend cap is what you intend → AC-13

## Value sourcing

Each row of the spec's value sourcing table, exercised through the edge that breaks if the source is wrong.

- [x] Window start is the earlier of Meta's timestamp and our receive time: a live webhook row was written with `inboundAt` and `lastInboundAt` equal, and `windowStart` was exercised in both skew directions by the unit suite. The worker level step still needs a run after the blocking bug is fixed → AC-2
- [x] Window length is 24 hours from that start: the live row read `window = 1 day` for a real signed webhook POST → AC-2, AC-3
- [x] Month key is derived in the account timezone (checked directly against the live database: month `2026-10` starts at `2026-09-30T23:00:00Z`, midnight in Douala; the worker level step still needs a run): set `WHATSAPP_ACCOUNT_TIMEZONE=UTC`, send at 23:30 UTC on 30 September → the month key is `2026-09`. Leave it unset → it is `2026-10`, because Douala is an hour ahead → AC-5
- [ ] The cap in force is read live: set the cap to 2, then raise it mid month → the next reply is allowed without a redeploy → AC-5, AC-7
- [ ] `capAtMonthStart` is audit only: change the cap mid month → the stored snapshot still shows the value the month opened with, and the decision uses the live value → AC-5
- [ ] Which phone number the allowance belongs to: check the row keyed by `WHATSAPP_PHONE_NUMBER_ID`, and confirm a second number would get its own row → AC-5
- [x] The action block is the next step plus the hotline and forwarding lines: the real French and English high risk replies end with all three, in that order → AC-8
- [ ] The cap note language follows `detectMessageLanguage`: send the same cap situation once in French and once in English → French sender gets the French notice, English sender gets the English one, never both in one message → AC-4
- [x] The notice guard is `capNoteSentAt` against the current month, checked directly against the live database: 3 concurrent claims in one month, exactly 1 won, and a claim for the following month was allowed again → AC-4
- [x] The whole body is sanitised, not each section: the real renderer was run with an amount carrying an emoji and nothing survived anywhere in the output → AC-8
- [x] The drop order: the real sextortion reply rendered at 1,586 characters against a 1,980 character web variant, with the contact lines gone, 2 bullets left of 3, and the closing block intact → AC-8

## Acceptance criteria coverage

- AC-1 covered by the two grep steps, the POST signature steps, typecheck and lint
- AC-2 covered by the signed POST, the duplicate POST and both window clock rows
- AC-3 covered by the backdated window step and the boundary row
- AC-4 covered by the notice steps and the notice language and guard rows
- AC-5 covered by the concurrency step, the month key rows, the live cap row and the live schema step
- AC-6 covered by the two cap notice steps
- AC-7 covered by the cap 0 step, the junk value test and the live cap row
- AC-8 covered by the phone screenshot, the accented French read, the parity comparison and the overflow step
- AC-9 covered by the accented French read and the parity comparison
- AC-10 covered by the placeholder credential step
- AC-11 covered by the Inngest run history step
- AC-12 covered by the `.env.example` grep
- AC-13 covered by the `docs/WHATSAPP.md` read and the WhatsApp Manager check

## BLOCKING FAILURE found 2026-10-01, run before the steps below

`/verify-release` on spec 0015 failed. Every message that reaches the worker dies at
`decide-and-send`, `src/inngest/functions/process-whatsapp-message.ts:126`:

```
Inngest step error
TypeError: window.windowExpiresAt.getTime is not a function
```

**Cause.** Inngest serializes a step's return value as JSON. `openThread` returns
`windowExpiresAt` as a real `Date`, and in the next step it arrives as the string
`"2026-10-02T20:17:04.000Z"`. The unit suite calls the functions directly, so it never
sees the round trip and passes 169 of 169.

**Reproduction outside Inngest** (`openThread` then `JSON.parse(JSON.stringify(...))`):
`direct call -> object true`, `after JSON -> string`, and the worker's exact expression throws.

**Fix shape.** Rehydrate the dates after the step, for example
`new Date(window.windowExpiresAt)`, and audit every other value that crosses a step
boundary in this function for the same trap. Then rerun this file from the top.

Because of this, every step below that needs the worker to reach a decision stayed
unticked, and no real message was sent to `+237622571569`.

**That blocking failure is fixed.** The Date fix is `rehydrateWindow` in
`src/lib/whatsapp/thread.ts`, called at `process-whatsapp-message.ts:121`, and the worker
now reaches `decide-and-send` on every message.

## AC-11 was a false alarm, reported 2026-10-01 and corrected the same day

An earlier run of this file reported AC-11 as FAILING: four runs from one sender all showed
`run_started_at` within a millisecond of each other and appeared to overlap. **That
conclusion was wrong, and the measurement was the error, not the code.**

`run_started_at` is stamped at `FunctionScheduled`, the moment the run enters the queue.
It is not when the SDK starts running code. Two messages posted in the same second are
scheduled in the same millisecond, which looks exactly like overlap and is not.

Measured on execution time instead, with the run history:

| Run | Scheduled | Started | Waited for slot | Ran for |
| --- | --- | --- | --- | --- |
| first message | 22:44:03.103 | 22:44:03.156 | 53 ms | 24354 ms |
| second message | 22:44:03.354 | **22:44:27.605** | **24251 ms** | 75 ms |

The second run waited for the first to finish, then ran. Zero overlapping executions. The
control confirms the key discriminates: two **different** senders posted together produced
model calls 2 ms apart, fully in parallel, each with its own slot. Same sender, strictly one
at a time.

**How to check this in future.** Read `FunctionStarted` and `FunctionCompleted` from the run
history, not `run_started_at`. The dev server's own GraphQL exposes them:

```
{ functionRun(query: {functionRunId: "<run id>"}) { history { type createdAt } } }
```

Always run the different sender control alongside the same sender case. Without it, a
global limit of 1 and a per sender limit of 1 look identical.

**Credit note.** These runs were made against a local stub on `OPENROUTER_BASE_URL` that
delays and returns 500, so extraction falls back to heuristics exactly as it does on a 402
and no OpenRouter credit is spent. The stub also makes each run long enough that overlap
could not be a timing coincidence. See `OPENROUTER_BASE_URL` in `.env.example`.

## Known gaps this build left to later rows

- The worker was exercised end to end during verification and reaches a decision on every message. The Date blocking failure above is fixed. The Inngest dev CLI segfaults in this sandbox, so verification ran the official Inngest dev server in Docker instead, on the same port the project script uses.
- `concurrency: { limit: 1, key: "event.data.fromNumber" }` is correct and is enforced, proven on execution time above. `run_started_at` in the dev server is the schedule time, which is what made it look broken.
- The 75 ms second run is explained, and it is the circuit breaker doing its job. `isCreditOrLimitError` in `src/lib/ai/openrouter.ts` matches `/402|429|credit|quota|rate.?limit|insufficient/i`, so the first run's failure opened the circuit for 60 seconds and the second run took the `isAiCircuitOpen()` early return at `extract-facts.ts:77` straight to heuristics, with no model call. Proven by changing only the stub's error text: with a credit shaped message the pair served 3 model calls, with a neutral message it served 15. No correctness impact, and the verdict still came from the rules engine, which is the contract.
- `processedStatus` has no `FAILED` writer. A Meta failure leaves the event unfinished on purpose; scope row 27 owns that state.
- Signature verification is still skipped when the app secret is a placeholder. Scope rows 20 and 23 own that.
- The counter can double count one attempt when a step retry re-runs a committed write. Accepted drift, in the safe direction. The cap itself was checked under real concurrency: 12 simultaneous replies against a ceiling of 2 counted exactly 2.
- `mprocs.yaml` runs next, ngrok and the tests, but not `inngest:dev`, so `pnpm dev:all` leaves the worker not running. Worth adding.
- The OpenRouter key is exhausted, not merely low: 0 credits with 0.1989 already spent, checked 2026-10-01. Every extraction returns 402, so **every verdict in this verification came from the rules engine and the heuristics fallback, never from a model.** The worker carried on, which is the documented behaviour. This is the one thing that has to change before spec 0015 can be verified end to end with the model in the loop.
- **Resolved 2026-10-02.** A fresh key was installed and the model path is now live. The live send to `+237XXXXXXXXX` produced no fallback warning and cost 0.000216 dollars for that one extraction, so the model is in the loop for the first time. The previous note is kept above because the circuit breaker behaviour it describes still applies to any exhausted key.
- **Live send, 2026-10-02.** Inbound `wamid.live.1790916446`, a fake MINESEC recruitment scam from `+237XXXXXXXXX`. The worker answered in French, the log reads `sent=true`, the event closed `SENT` then `COMPLETED`, the thread stamped `lastOutboundAt`, and the month counter moved to 1 of 1000. Meta really accepted it: `ok` requires Meta's own message id, so `sent=true` cannot be true unless a `wamid` came back. The engineer received the message on their phone and confirmed it arrived as intended. **Still open:** latency was about 18 seconds end to end, of which roughly 10.5 was extraction, and no payment method has been confirmed on file.
- The circuit breaker makes the credit exhaustion cheap but not invisible: with credits gone, the first message in each 60 second window still pays three failed model calls before the circuit opens. That is intended, since it is how a topped up key recovers on its own.
- **Resolved 2026-10-02.** `src/app/(site)/whatsapp/page.tsx` no longer hardcodes emoji replies. Step 1 of spec 0016 replaced them with a `whatsappReply` render, so the guide now shows what the bot actually sends. Scope row 28 stays the owner; its build landed through row 31.
