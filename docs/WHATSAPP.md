# WhatsApp Channel - Meta Cloud API Go-Live

Stage 2 is built and testable without credentials (mock dispatch logs to console).
To go live you need WhatsApp Business credentials from Meta (or a BSP).

## What exists

- `GET /api/public/whatsapp/webhook` - Meta subscription verification
  (`hub.mode` / `hub.verify_token` / `hub.challenge` against `WHATSAPP_WEBHOOK_VERIFY_TOKEN`).
- `POST /api/public/whatsapp/webhook` - HMAC-SHA256 check (`x-hub-signature-256` vs
  `WHATSAPP_APP_SECRET`, skipped while the secret is a placeholder), typed payload parsing,
  single-flight idempotent inbox on `messageId` (Prisma `P2002` = duplicate delivery),
  fast `200` then `inngest.send("whatsapp/message.received")`.
- `src/inngest/functions/process-whatsapp-message.ts` - dedupe → fact extraction
  (text direct; image/document fetched from Graph API with `WHATSAPP_API_TOKEN`) → rules
  engine verdict → reply via `POST /{PHONE_NUMBER_ID}/messages` (sender's language,
  auto-detected FR/EN, French default) →
  event marked `COMPLETED`. Concurrency 10 per sender, retries 2, AI circuit breaker shared
  with the web engine.

## Go-live checklist

1. **Meta app**: create app → add WhatsApp product → test number (or your business number).
2. **Env** (production, never commit):
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (long random),
   `WHATSAPP_API_TOKEN` (permanent system-user token),
   `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`.
3. **Webhook subscription**: callback URL
   `https://<your-domain>/api/public/whatsapp/webhook`, verify token from step 2,
   subscribe to `messages` field.
4. **Test**: send text → expect badge + 3 bullets + 8202 + forwardable warning;
   send flyer image/PDF → same engine reads it.
5. **Inngest**: point production serve URL at `/api/inngest` (see Inngest dashboard)
   so background events actually execute outside `dev`.

## Limits & behavior

- Unsupported message types are acknowledged (`IGNORED_UNSUPPORTED_TYPE`) without error.
- Status/delivery receipts are acknowledged (`IGNORED_STATUS_UPDATE`).
- When AI credits are exhausted the circuit opens for 60s and heuristics answer instead -
  rules still decide the verdict.
