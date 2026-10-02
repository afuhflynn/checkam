# WhatsApp integration

The WhatsApp flow is a webhook receiver plus an async worker pipeline. The webhook acknowledges the request quickly, opens the reply window, then passes the event to Inngest for the heavy verification work.

## What the app does

- `GET /api/public/whatsapp/webhook` verifies Meta subscription requests using the configured verify token.
- `POST /api/public/whatsapp/webhook` validates the HMAC signature, stores a deduplicated event by `messageId`, and opens the 24 hour reply window for that sender in the same transaction.
- The worker pipeline fetches media if needed, runs fact extraction, and evaluates the verdict with the same rules engine used elsewhere.
- Before anything is sent, the worker checks the window, the credentials and the monthly cap, in that order, and records the outcome on the event row.
- A reply is rendered in the `whatsappReply` format: a real bullet character, one blank line between sections, the whole body sanitised, and a 1,600 character ceiling with a stated drop order.

## The pinned API version

Every Meta call goes through `src/lib/whatsapp`, and the version is a constant in `src/lib/whatsapp/graph.ts`:

```
GRAPH_API_VERSION = "v26.0"
```

It is deliberately not an environment value. Meta retires a version on a published date and every call against a retired version fails rather than degrades: v19.0 expired on 2026-05-21, which is why this was pinned. To move versions, edit that one constant and deploy. Nothing warns you when the pinned version nears its sunset, so check the Meta changelog before each release.

## The monthly cap and what it costs

Meta prices the Cloud API per message, not per conversation, and from 1 October 2026 free form replies inside the customer service window are billable too. The free allowance is **1,000 service messages per business phone number per month**, resetting at midnight in the account timezone, and message 1,001 is charged at the market rate.

We do not model money, because no Cameroon rate is published that we could trust. The cap is a count of replies:

- `WHATSAPP_MONTHLY_REPLY_CAP` defaults to `1000`, which is exactly the free allowance, so **the default configuration cannot be billed**. A value above 1,000 opts in to paid messages, and `0` silences the bot entirely.
- The counter counts attempts, not deliveries, and it is our own ledger. It will sit slightly above Meta's real bill, which is the safe direction: we stop a little early rather than a little late.
- A slice of the cap (25 replies, or a quarter of the cap if the cap is smaller) is held back so a person who writes after the cap is reached gets one short notice in their own language instead of silence. Both the replies and the notices stay inside the cap, so the total never exceeds it.
- The notice is allowed once per thread per month, so a sender who messages hourly cannot drain the month.

## The 24 hour customer service window

Any inbound message of any type opens a 24 hour window, and each later inbound message resets it. Outside the window Meta refuses free form text outright with error **131047**, so we refuse at our own edge before spending an attempt.

The window starts at the **earlier** of Meta's own message timestamp and our receive time. That means our expiry is never later than Meta's under either direction of clock skew, so we never attempt a send Meta would reject. A window refusal is silent to the person, because nothing may be sent outside the window anyway. The event row records `REFUSED_WINDOW` with the reason and the expiry we saw.

## Error codes we handle

| Code | Meaning | What we do |
| --- | --- | --- |
| `131047` | Sent outside the 24 hour window | Recorded as `REFUSED_WINDOW` with the Meta code, never as a send |
| `131048` | Spam rate limit hit (blocks or reports) | Send fails, the event stays unfinished, visible in the run history |
| `131026` | Undeliverable, the number is not on WhatsApp | Send fails, the event stays unfinished |
| `131052` | Media download failed | Logged, the message is answered from whatever text we have |
| `130429` | Throughput reached | Send fails, Inngest retries the run |
| `4` / `80007` | Rate limit on the API call or the business account | Send fails, Inngest retries the run |

A Meta error we did not predict is recorded on the event as `META_REFUSED_<code>` and the event is deliberately left unfinished, which is where the failure state belongs (scope row 27).

## Go-live checklist

1. Create a Meta app and connect the WhatsApp Business product.
2. Set the production environment values for the webhook token, API token, phone number id, and app secret.
3. **Confirm a payment method is on file on the WhatsApp Business Account.** Without one, paid messages are not delivered. The Cloud API does not reliably expose this, so it is a manual check in WhatsApp Manager, and a credential health check is scope row 29.
4. Confirm the monthly spend cap and the spend cap in WhatsApp Manager are what you intend. We cap replies in our own code, Meta caps spend on its side.
5. Subscribe the callback URL to the `messages` field.
6. Verify text and flyer flows in a real channel before turning on broader traffic.
7. Point Inngest production to `/api/inngest` so background jobs execute outside local development.

## Operational notes

- Unsupported message types are ignored cleanly.
- One message is processed at a time per sender, so a person never receives two overlapping replies.
- Delivery receipts are treated as informational and do not trigger a verification path. Reading them properly is scope row 27.
- If `WHATSAPP_API_TOKEN` or `WHATSAPP_PHONE_NUMBER_ID` is missing or still a placeholder, the worker counts nothing, records `MISSING_CREDENTIALS`, leaves the event unfinished and says so in the log. In development it also prints the body it would have sent, so local work is still possible. That log path cannot run in production.
- If the AI layer is unavailable or credits are exhausted, the app falls back to heuristics while the rules engine still decides the verdict.
- Keep the verification logic aligned with the web verification flow so both surfaces behave consistently.

## Safety

The WhatsApp path should never silently trust inbound content. The system should validate the payload, deduplicate duplicates, and keep the same evidence and verdict rules as the public web flow.

Two gaps are known and owned elsewhere, not by this document: signature verification is still skipped when the app secret is a placeholder (scope rows 20 and 23), and every WhatsApp message is attacker controlled text or an image reaching a fully public endpoint (scope row 20).
