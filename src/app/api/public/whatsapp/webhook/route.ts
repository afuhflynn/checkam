import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { inngest } from "../../../../../inngest/client";
import { db } from "../../../../../lib/db";
import { isUniqueViolation, openThread } from "../../../../../lib/whatsapp/thread";

interface WhatsAppMessage {
  id: string;
  from: string;
  type: string;
  timestamp?: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
  document?: {
    id?: string;
    mime_type?: string;
    caption?: string;
    filename?: string;
  };
}

interface WhatsAppPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WhatsAppMessage[];
      };
    }>;
  }>;
}

function isSupportedType(t: string): t is "text" | "image" | "document" {
  return t === "text" || t === "image" || t === "document";
}

/** Meta sends the message time as unix seconds. */
function parseTimestamp(raw: string | undefined): Date | null {
  if (!raw) return null;
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000);
}

// GET: Meta Webhook Subscription Verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "checkam_verify_token_secure_cm";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("[WhatsApp Webhook] Verification successful!");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden - Invalid verification token" }, { status: 403 });
}

// POST: Inbound WhatsApp Event Receiver
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    // Verify HMAC-SHA256 Signature if App Secret is configured
    if (
      process.env.WHATSAPP_APP_SECRET &&
      !process.env.WHATSAPP_APP_SECRET.includes("placeholder")
    ) {
      const expectedSignature = `sha256=${crypto
        .createHmac("sha256", process.env.WHATSAPP_APP_SECRET)
        .update(rawBody)
        .digest("hex")}`;

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const parsed: unknown = JSON.parse(rawBody);
    const payload = parsed as WhatsAppPayload;

    // Parse Meta WhatsApp Cloud API event schema
    const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message || typeof message.id !== "string" || typeof message.from !== "string") {
      // Status update or delivery receipt, return 200 OK
      return NextResponse.json({ status: "IGNORED_STATUS_UPDATE" }, { status: 200 });
    }

    const messageId: string = message.id;
    const fromNumber: string = message.from;
    const rawType: string = message.type;
    if (!isSupportedType(rawType)) {
      return NextResponse.json({ status: "IGNORED_UNSUPPORTED_TYPE" }, { status: 200 });
    }
    const messageType = rawType;

    let textBody: string | undefined;
    let mediaId: string | undefined;
    let mimeType: string | undefined;

    if (messageType === "text") {
      textBody = message.text?.body;
    } else if (messageType === "image") {
      mediaId = message.image?.id;
      mimeType = message.image?.mime_type;
      textBody = message.image?.caption;
    } else if (messageType === "document") {
      mediaId = message.document?.id;
      mimeType = message.document?.mime_type;
      textBody = message.document?.caption || message.document?.filename;
    }

    // 1. Single-flight idempotent inbox: create wins, P2002 duplicate = already received
    const metaTimestamp = parseTimestamp(message.timestamp);
    let eventId: string;
    let isFirstSeen = true;
    try {
      const created = await db.whatsAppWebhookEvent.create({
        data: {
          messageId,
          fromNumber,
          messageType,
          rawPayload: JSON.parse(JSON.stringify(parsed)),
          processedStatus: "PENDING",
          inboundAt: metaTimestamp,
        },
        select: { id: true },
      });
      eventId = created.id;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Duplicate delivery. We still open the window below, because a
      // redelivery is how Meta recovers from our own failed write.
      isFirstSeen = false;
      const existing = await db.whatsAppWebhookEvent.findUnique({
        where: { messageId },
        select: { id: true },
      });
      if (!existing) throw error;
      eventId = existing.id;
    }

    // 2. Open the 24 hour window here, at the earliest point we hold the
    // message, so a backed up queue can never make us think the window is open
    // when Meta thinks it is closed.
    await openThread({ eventId, fromNumber });

    if (isFirstSeen) {
      // 3. Dispatch async Inngest background event (bounded: retries=2, one
      // message at a time per sender)
      await inngest.send({
        name: "whatsapp/message.received",
        data: {
          messageId,
          fromNumber,
          messageType,
          textBody,
          mediaId,
          mimeType,
        },
      });
    }

    // Respond fast HTTP 200 OK within Meta's timeout
    return NextResponse.json({ status: "RECEIVED", messageId }, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook Error]:", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
