import { extractFactsFromTextOrImage } from "../../lib/ai/extract-facts";
import { db } from "../../lib/db";
import { detectMessageLanguage } from "../../lib/i18n/detect";
import { runRulesEngine } from "../../lib/rules/engine";
import { inngest } from "../client";

export const processWhatsAppMessage = inngest.createFunction(
  {
    id: "process-whatsapp-inbound-message",
    name: "Process Inbound WhatsApp Message",
    concurrency: {
      limit: 10,
      key: "event.data.fromNumber", // Per-user queue rate limiting
    },
    retries: 2,
    triggers: [{ event: "whatsapp/message.received" }],
  },
  async ({
    event,
    step,
  }: {
    event: {
      data: {
        messageId: string;
        fromNumber: string;
        messageType: "text" | "image" | "document";
        textBody?: string;
        mediaId?: string;
        mimeType?: string;
      };
    };
    step: {
      run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
    };
  }) => {
    const { messageId, fromNumber, messageType, textBody, mediaId, mimeType } = event.data;

    // Step 1: Check database deduplication
    const existingEvent = await step.run("check-deduplication", async () => {
      const record = await db.whatsAppWebhookEvent.findUnique({
        where: { messageId },
      });
      return record;
    });

    if (existingEvent?.processedStatus === "COMPLETED") {
      return { status: "ALREADY_PROCESSED", messageId };
    }

    // Step 2: Extract text or media
    const extractedFacts = await step.run("extract-facts-from-message", async () => {
      if (messageType === "text" && textBody) {
        return extractFactsFromTextOrImage({ text: textBody });
      }

      if (mediaId && process.env.WHATSAPP_API_TOKEN) {
        // Fetch media URL from Meta Graph API
        try {
          const mediaUrlRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
            headers: { Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}` },
          });
          const mediaMeta = (await mediaUrlRes.json()) as { url?: string };
          if (mediaMeta.url) {
            const mediaBinRes = await fetch(mediaMeta.url, {
              headers: { Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}` },
            });
            const buffer = Buffer.from(await mediaBinRes.arrayBuffer());
            const imageBase64 = buffer.toString("base64");
            return extractFactsFromTextOrImage({
              imageBase64,
              mimeType: mimeType || "image/jpeg",
            });
          }
        } catch (err) {
          console.error("Failed to fetch WhatsApp media:", err);
        }
      }

      return extractFactsFromTextOrImage({ text: textBody || "" });
    });

    // Step 3: Run Deterministic Rules Engine
    const verification = await step.run("evaluate-rules", async () => {
      return runRulesEngine({
        text: textBody || extractedFacts.summaryClaim,
        claimedEntity: extractedFacts.claimedEntity,
        phoneNumbers: extractedFacts.phoneNumbers,
        emails: extractedFacts.emails,
        amount: extractedFacts.amount,
        paymentMethod: extractedFacts.paymentMethod,
      });
    });

    // Reply in the sender's language (detected from the inbound text/caption)
    const replyLang = detectMessageLanguage(textBody);
    const replyMessage =
      replyLang === "fr" ? verification.whatsappWarning.fr : verification.whatsappWarning.en;

    // Step 4: Dispatch WhatsApp reply back to user, in the sender's language
    const replySent = await step.run("send-whatsapp-reply", async () => {
      if (
        process.env.WHATSAPP_API_TOKEN &&
        process.env.WHATSAPP_PHONE_NUMBER_ID &&
        !process.env.WHATSAPP_API_TOKEN.includes("placeholder")
      ) {
        try {
          const sendRes = await fetch(
            `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: fromNumber,
                type: "text",
                text: { body: replyMessage },
              }),
            },
          );
          return sendRes.ok;
        } catch (err) {
          console.error("Failed to send WhatsApp reply:", err);
          return false;
        }
      }

      console.log(`[WhatsApp Mock Dispatch] To: ${fromNumber}\nMessage:\n${replyMessage}`);
      return true;
    });

    // Step 5: Mark Event as Completed in Database
    await step.run("mark-event-completed", async () => {
      await db.whatsAppWebhookEvent.upsert({
        where: { messageId },
        update: {
          processedStatus: "COMPLETED",
          replyText: replyMessage,
        },
        create: {
          messageId,
          fromNumber,
          messageType,
          rawPayload: JSON.parse(JSON.stringify(event.data)),
          processedStatus: "COMPLETED",
          replyText: replyMessage,
        },
      });
    });

    return {
      status: "SUCCESS",
      messageId,
      verdict: verification.verdict,
      replySent,
    };
  },
);
