# Inngest jobs

## Overview

Inngest handles background work that should not block the request lifecycle. This includes WhatsApp processing, threat-feed updates, and other async follow-up work.

## Key files

| File | Owns |
| --- | --- |
| `src/inngest/client.ts` | Client configuration |
| `src/inngest/functions/process-whatsapp-message.ts` | WhatsApp processing flow |
| `src/inngest/functions/sync-threat-feed.ts` | Threat-feed sync after moderation actions |
| `src/app/api/inngest/route.ts` | Inngest endpoint |
| `src/app/api/public/whatsapp/webhook/route.ts` | Webhook verification and send-off |

## Conventions

- Keep event payloads small and avoid sending secrets in the event body.
- Treat duplicate webhook deliveries as idempotent events.
- Run heavy verification work outside the HTTP request path.
- Keep production deployment and local dev behavior aligned so jobs actually execute in the intended environment.

## Notes

- The WhatsApp path and the web verification path should stay aligned as the rules engine evolves.
- If the app is missing API credentials, the job should fail safely or log instead of pretending to have sent a message.
- Mail jobs should be introduced with explicit design and operational wiring, not silently as an unreviewed addition.
