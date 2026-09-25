# Inngest background jobs

## Overview

`checkam-engine` runs async work outside the request: the WhatsApp inbound pipeline and the threat feed sync. Webhook receivers reply fast (200) then `inngest.send`; functions do the heavy steps with retries. Mail jobs (Nodemailer) are planned here, not yet wired.

## Key files

| File | Owns |
|---|---|
| `src/inngest/client.ts` | Client id `checkam-engine` |
| `src/inngest/functions/process-whatsapp-message.ts` | Dedupe, fact extraction, rules, reply, mark `COMPLETED` |
| `src/inngest/functions/sync-threat-feed.ts` | Threat feed cache sync after admin `APPROVE` |
| `src/app/api/inngest/route.ts` | Serve endpoint (`GET,POST,PUT`) |
| `src/app/api/public/whatsapp/webhook/route.ts` | Verifier + idempotent inbox + `inngest.send` |

## Conventions

- Events: `whatsapp/message.received` and `threat-feed/sync.requested`; keep payloads small (ids + bodies, never secrets).
- Idempotency key is `WhatsAppWebhookEvent.messageId` (`@unique`); duplicate delivery (`P2002`) means acknowledge without re send.
- WhatsApp function uses per sender concurrency (limit 10, key `fromNumber`) and 2 retries.
- Media fetch goes through Meta Graph v19 with `WHATSAPP_API_TOKEN`; placeholder secrets mean mock log dispatch, never real send.

## Gotchas

- Rules run without the flagged DB check on the WhatsApp path (unlike web `/api/verify`); keep parity in mind when changing the engine.
- Inngest needs its production serve URL pointed at `/api/inngest` outside dev, or background events never execute.
- No mail transport exists yet; `emailAndPassword` is on but verification/reset mails cannot send until Nodemailer + jobs land via spec.

_Drafted by /codebase-audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
