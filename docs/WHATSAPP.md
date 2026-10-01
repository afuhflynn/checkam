# WhatsApp integration

The WhatsApp flow is implemented as a webhook receiver plus an async worker pipeline. The webhook acknowledges the request quickly and then passes the event to Inngest for the heavy verification work.

## What the app does

- `GET /api/public/whatsapp/webhook` verifies Meta subscription requests using the configured verify token.
- `POST /api/public/whatsapp/webhook` validates the HMAC signature, parses the payload, and stores a deduplicated event by `messageId`.
- The worker pipeline fetches media if needed, runs fact extraction, and evaluates the verdict with the same rules engine used elsewhere.
- The response message is sent back through the WhatsApp Cloud API and marked complete in the database.

## Go-live checklist

1. Create a Meta app and connect the WhatsApp Business product.
2. Set the production environment values for the webhook token, API token, phone number id, and app secret.
3. Subscribe the callback URL to the `messages` field.
4. Verify text and flyer flows in a real channel before turning on broader traffic.
5. Point Inngest production to `/api/inngest` so background jobs execute outside local development.

## Operational notes

- Unsupported message types are ignored cleanly.
- Delivery receipts are treated as informational and do not trigger a verification path.
- If the AI layer is unavailable or credits are exhausted, the app falls back to heuristics while the rules engine still decides the verdict.
- Keep the verification logic aligned with the web verification flow so both surfaces behave consistently.

## Safety

The WhatsApp path should never silently trust inbound content. The system should validate the payload, deduplicate duplicates, and keep the same evidence and verdict rules as the public web flow.
