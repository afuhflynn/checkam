import { extractFactsFromTextOrImage } from "../../lib/ai/extract-facts";
import { classifyBenignChat, renderBenignReply } from "../../lib/chat/benign";
import { db } from "../../lib/db";
import { detectMessageLanguageWithSignal } from "../../lib/i18n/detect";
import { translations } from "../../lib/i18n/dictionary";
import { parseAskAnswer, resolveReplyLanguage } from "../../lib/i18n/preference";
import {
  type VerdictStatus,
  renderWhatsAppEmptyAsk,
  renderWhatsAppFollowUp,
  runRulesEngine,
} from "../../lib/rules/engine";
import {
  capNotice,
  capStatus,
  claimCapNotice,
  countCapNoticeAttempt,
  countReplyAttempt,
  ensureMonth,
} from "../../lib/whatsapp/cap";
import { hasSendCredentials, monthKey, phoneNumberId } from "../../lib/whatsapp/config";
import {
  META_WINDOW_REFUSED,
  REPLY_REASON,
  isAlreadySent,
  markEventCompleted,
  markThreadFullReply,
  markThreadOutbound,
  recordDecision,
} from "../../lib/whatsapp/event";
import { downloadMedia } from "../../lib/whatsapp/media";
import { isMockDispatchAllowed, sendText } from "../../lib/whatsapp/send";
import { openThread, rehydrateWindow } from "../../lib/whatsapp/thread";
import { isNewClaimText } from "../../lib/whatsapp/tone";
import { inngest } from "../client";

type Outcome =
  | { kind: "sent"; body: string; isNotice: boolean; language: "en" | "fr" }
  | { kind: "refused"; reason: string }
  | { kind: "failed"; reason: string };

function validThreadLanguage(value: unknown): "en" | "fr" | null {
  return value === "en" || value === "fr" ? value : null;
}

export const processWhatsAppMessage = inngest.createFunction(
  {
    id: "process-whatsapp-inbound-message",
    name: "Process Inbound WhatsApp Message",
    concurrency: {
      // One message at a time per sender, so a person never receives two
      // overlapping replies and their thread reads in order (spec 0015, AC-11).
      limit: 1,
      key: "event.data.fromNumber",
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
    const eventRow = await step.run("check-deduplication", async () => {
      return db.whatsAppWebhookEvent.findUnique({ where: { messageId } });
    });

    if (!eventRow) {
      throw new Error(`Webhook event for ${messageId} is missing, the worker ran before the inbox`);
    }
    if (eventRow.processedStatus === "COMPLETED") {
      return { status: "ALREADY_PROCESSED", messageId };
    }
    const eventRowId = eventRow.id;

    // Warm chat tone (spec 0017) plus language respect (spec 0018): the tone
    // gate runs before any model call. A pure reaction in a thread that
    // already got its full verdict skips extraction and the rules entirely
    // and reuses the stored verdict. The fixed preferred triple wins over the
    // heuristic thread language on every path below.
    const toneGate = await step.run("check-tone-gate", async () => {
      const row = await db.whatsAppThread.findUnique({
        where: { threadKey: fromNumber },
        select: {
          windowExpiresAt: true,
          windowFirstReplyAt: true,
          lastVerdict: true,
          threadLanguage: true,
          preferredLanguage: true,
          preferredLanguageSource: true,
          askSentAt: true,
        },
      });
      const verdict =
        row?.lastVerdict === "HIGH_RISK" ||
        row?.lastVerdict === "CAUTION" ||
        row?.lastVerdict === "VERIFIED_OFFICIAL"
          ? (row.lastVerdict as VerdictStatus)
          : null;
      const markerAlive =
        verdict !== null &&
        row?.windowFirstReplyAt !== null &&
        row !== null &&
        row.windowExpiresAt.getTime() > Date.now();
      const fixed = validThreadLanguage(row?.preferredLanguage);
      const heuristic = validThreadLanguage(row?.threadLanguage);
      const replyLanguage = fixed ?? heuristic ?? "fr";
      const stored = markerAlive && verdict !== null ? { verdict, language: replyLanguage } : null;
      // Calm benign gate (spec 0019): small talk and product questions skip
      // extraction and rules and get fixed copy with no verdict. Small talk
      // with a live full marker keeps the 0017 short reminder path, so an
      // established thread never loses its context.
      const benignKind = messageType === "text" ? classifyBenignChat(textBody) : "check";
      const benign =
        benignKind === "product"
          ? { kind: "product" as const }
          : benignKind === "smalltalk" && stored === null
            ? { kind: "smalltalk" as const }
            : null;
      if (benign) {
        return { reaction: null, benign, stored, fixed, askSentAt: row?.askSentAt ?? null, heuristic };
      }
      if (messageType !== "text" || isNewClaimText(textBody) || stored === null) {
        return { reaction: null, benign: null, stored, fixed, askSentAt: row?.askSentAt ?? null, heuristic };
      }
      return {
        reaction: { verdict: stored.verdict, language: stored.language },
        benign: null,
        stored,
        fixed,
        askSentAt: row?.askSentAt ?? null,
        heuristic,
      };
    });

    // Step 2: Extract text or media, skipped for a pure reaction which has no
    // new claim to extract from, and for a benign turn which needs no facts.
    const extractedFacts = toneGate.reaction || toneGate.benign
      ? null
      : await step.run("extract-facts-from-message", async () => {
          if (messageType === "text" && textBody) {
            return extractFactsFromTextOrImage({ text: textBody });
          }

          if (mediaId) {
            const downloaded = await downloadMedia(mediaId);
            if (downloaded.ok) {
              return extractFactsFromTextOrImage({
                imageBase64: downloaded.media.buffer.toString("base64"),
                mimeType: downloaded.media.mimeType || mimeType || "image/jpeg",
              });
            }
            console.error(
              `[WhatsApp Media] ${downloaded.errorCode}: ${downloaded.message} for ${mediaId}`,
            );
          }

          return extractFactsFromTextOrImage({ text: textBody || "" });
        });

    // Step 3: Run Deterministic Rules Engine, skipped for a pure reaction
    // which reuses the stored verdict instead of judging again, and for a
    // benign turn which carries no verdict at all.
    const verification = toneGate.reaction || toneGate.benign
      ? null
      : await step.run("evaluate-rules", async () => {
          if (!extractedFacts) throw new Error("extracted facts are missing for a full check");
          return runRulesEngine({
            text: textBody || extractedFacts.summaryClaim,
            claimedEntity: extractedFacts.claimedEntity,
            phoneNumbers: extractedFacts.phoneNumbers,
            emails: extractedFacts.emails,
            amount: extractedFacts.amount,
            paymentMethod: extractedFacts.paymentMethod,
          });
        });

    // Step 4: Open the window. The webhook already did this, and because both
    // clocks are read from the stored event the call is idempotent, so a worker
    // run can never face a message with no window.
    const opened = await step.run("open-thread-window", async () => {
      return openThread({ eventId: eventRowId, fromNumber });
    });

    // Inngest serialized that return value as JSON, so the Dates inside the
    // window arrived as ISO strings. Rehydrate before any call site treats one
    // as a date (spec 0015, AC-3).
    const { windowExpiresAt } = rehydrateWindow(opened);

    // Step 5: Decide, count and send. The window comes first, so a reply we are
    // not allowed to send never touches the cap.
    const outcome = await step.run("decide-and-send", async (): Promise<Outcome> => {
      const now = new Date();

      // Warm chat tone (spec 0017) plus language respect (spec 0018): pick the
      // reply shape before the window and cap checks, so those paths behave
      // the same for every shape. A reaction reuses the stored verdict with
      // no fresh judging. Fixed choice wins over detection on every path, a
      // signal free turn earns the one time ask, and an unreadable new check
      // gets a warm ask with no verdict. Everything else gets the full
      // verdict. Asks never set the full marker below.
      let language: "en" | "fr";
      let replyBody: string;
      let isFull = false;
      let fullVerdict: VerdictStatus | null = null;
      if (toneGate.benign) {
        // Calm reply (spec 0019): fixed copy with no verdict, never setting
        // the full marker. A signal free first turn still earns the one time
        // language ask per spec 0018 before any calm reply.
        const detected = detectMessageLanguageWithSignal(textBody ?? "");
        if (!toneGate.fixed && !toneGate.heuristic && !toneGate.askSentAt) {
          language = detected.language;
          replyBody = translations.en.fixLanguageAsk;
          await db.whatsAppThread.update({
            where: { threadKey: fromNumber },
            data: { askSentAt: new Date() },
          });
        } else {
          language =
            toneGate.fixed ??
            toneGate.heuristic ??
            (detected.hasSignal ? detected.language : "en");
          replyBody = renderBenignReply(toneGate.benign.kind, language);
        }
        console.log(
          `[check.kind] benign=${toneGate.benign.kind} lang=${language} from=${fromNumber}`,
        );
      } else if (toneGate.reaction) {
        language = toneGate.reaction.language;
        replyBody = renderWhatsAppFollowUp({
          language,
          verdict: toneGate.reaction.verdict,
        });
      } else if (!verification || !extractedFacts) {
        throw new Error("fresh verification is missing for a full check");
      } else {
        const summary = extractedFacts.summaryClaim?.trim() ?? "";
        const readable = Boolean(textBody?.trim()) || summary.length > 0;
        let fixed = toneGate.fixed;
        if (!fixed && toneGate.askSentAt && textBody) {
          const answered = parseAskAnswer(textBody);
          if (answered) {
            fixed = answered;
            await db.whatsAppThread.update({
              where: { threadKey: fromNumber },
              data: {
                preferredLanguage: answered,
                preferredLanguageSource: "ask",
                preferredLanguageUpdatedAt: new Date(),
              },
            });
          }
        }
        const rawText = textBody?.trim() ? (textBody as string) : summary;
        const detected = rawText
          ? detectMessageLanguageWithSignal(rawText)
          : {
              language: (toneGate.heuristic ?? "fr") as "en" | "fr",
              hasSignal: toneGate.heuristic !== null,
            };
        const resolution = resolveReplyLanguage({
          fixed,
          text: textBody ?? "",
          shortTurn: messageType === "text" && !isNewClaimText(textBody),
          storedHeuristic: toneGate.heuristic,
          askSent: toneGate.askSentAt !== null,
          detected,
        });
        if (resolution.fixedByPhrase) {
          await db.whatsAppThread.update({
            where: { threadKey: fromNumber },
            data: {
              preferredLanguage: resolution.fixedByPhrase,
              preferredLanguageSource: "phrase",
              preferredLanguageUpdatedAt: new Date(),
            },
          });
        }
        language = resolution.language;
        if (!readable) {
          replyBody = renderWhatsAppEmptyAsk(language);
        } else if (resolution.shouldAsk) {
          replyBody = translations.en.fixLanguageAsk;
          await db.whatsAppThread.update({
            where: { threadKey: fromNumber },
            data: { askSentAt: new Date() },
          });
        } else {
          replyBody =
            language === "fr" ? verification.whatsappReply.fr : verification.whatsappReply.en;
          isFull = true;
          fullVerdict = verification.verdict;
        }
      }

      if (now.getTime() >= windowExpiresAt.getTime()) {
        await recordDecision({
          eventId: eventRowId,
          decision: "REFUSED_WINDOW",
          reason: REPLY_REASON.windowExpired,
          windowExpiresAt: windowExpiresAt,
        });
        console.log(
          `[WhatsApp] window closed for ${fromNumber}, expired ${windowExpiresAt.toISOString()}, nothing sent`,
        );
        return { kind: "refused", reason: REPLY_REASON.windowExpired };
      }

      // No credentials means no send and no count. The step returns rather than
      // throws, because a missing credential is an operator problem a retry
      // cannot fix. The event stays unfinished so row 27 makes it loud.
      if (!hasSendCredentials()) {
        if (isMockDispatchAllowed()) {
          console.log(
            `[WhatsApp Mock Dispatch] To: ${fromNumber}\nNot sent: no credentials in development\nMessage:\n${replyBody}`,
          );
        } else {
          console.error(
            "[WhatsApp] WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured, nothing sent",
          );
        }
        await recordDecision({
          eventId: eventRowId,
          decision: "PENDING",
          reason: REPLY_REASON.missingCredentials,
          windowExpiresAt: windowExpiresAt,
        });
        return { kind: "refused", reason: REPLY_REASON.missingCredentials };
      }

      const id = phoneNumberId();
      if (!id) throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured");
      const month = monthKey(now);
      await ensureMonth(id, month);

      // Retry guard: this step recounts and resends on every run, so a retry
      // after a successful send would bill a duplicate message. A prior SENT
      // with a success reason skips straight to the sent outcome with the
      // same deterministic body. Refusals still retry, as today.
      const prior = await db.whatsAppWebhookEvent.findUnique({
        where: { id: eventRowId },
        select: { replyDecision: true, replyDecisionReason: true },
      });
      if (
        prior &&
        isAlreadySent({ decision: prior.replyDecision, reason: prior.replyDecisionReason })
      ) {
        return {
          kind: "sent",
          body: replyBody,
          isNotice: prior.replyDecisionReason === "CAP_NOTICE_SENT",
          language,
        };
      }

      const counted = await countReplyAttempt(id, month);
      if (!counted.counted) {
        return sendCapNotice({
          eventRowId,
          fromNumber,
          language,
          month,
          nowCount: counted.countThisMonth,
          windowExpiresAt: windowExpiresAt,
        });
      }

      const sent = await sendText(fromNumber, replyBody);

      if (sent.errorCode === META_WINDOW_REFUSED) {
        // Meta disagreed with our window arithmetic. Record what actually
        // happened rather than a send.
        await recordDecision({
          eventId: eventRowId,
          decision: "REFUSED_WINDOW",
          reason: `META_${META_WINDOW_REFUSED}`,
          windowExpiresAt: windowExpiresAt,
        });
        console.error(
          `[WhatsApp] Meta refused the reply for ${fromNumber} with 131047, our window said open until ${windowExpiresAt.toISOString()}`,
        );
        return { kind: "failed", reason: `META_${META_WINDOW_REFUSED}` };
      }

      await recordDecision({
        eventId: eventRowId,
        // An unexpected refusal is recorded as the attempt it was, with its
        // code. The event stays unfinished; row 27 owns the failure state.
        decision: "SENT",
        reason: sent.ok ? null : `META_REFUSED_${sent.errorCode ?? sent.status}`,
        windowExpiresAt: windowExpiresAt,
      });
      // Warm chat tone (spec 0017): only a sent full sets the tone marker.
      // Short notes ride the existing outbound stamp and leave it untouched.
      if (sent.ok) {
        if (isFull && fullVerdict) {
          await markThreadFullReply({
            threadKey: fromNumber,
            verdict: fullVerdict,
            language,
          });
        } else {
          await markThreadOutbound(fromNumber);
        }
      }

      console.log(
        `[WhatsApp] reply to ${fromNumber} in ${language}, month ${month} at ${counted.countThisMonth}/${capStatus(month).cap}, sent=${sent.ok}`,
      );
      return sent.ok
        ? { kind: "sent", body: replyBody, isNotice: false, language }
        : { kind: "failed", reason: `META_REFUSED_${sent.errorCode ?? sent.status}` };
    });

    // Step 6: Only a send Meta accepted is a done event. A refusal, a missing
    // credential or a cap leaves the event unfinished on purpose.
    if (outcome.kind === "sent") {
      await step.run("mark-event-completed", async () => {
        await markEventCompleted({
          eventId: eventRowId,
          replyText: outcome.isNotice ? null : outcome.body,
          replyLanguage: outcome.language,
        });
      });
    }

    return {
      status: outcome.kind === "sent" ? "SENT" : outcome.kind.toUpperCase(),
      messageId,
      verdict: verification?.verdict ?? toneGate.reaction?.verdict ?? null,
      reason: outcome.kind === "sent" ? null : outcome.reason,
    };
  },
);

/**
 * The cap is reached. One notice per thread per month, and the notice is
 * counted against the same cap, so a wave of messages after the cap cannot
 * send without limit (spec 0015, AC-4, AC-6, AC-7).
 */
async function sendCapNotice(params: {
  eventRowId: string;
  fromNumber: string;
  language: "en" | "fr";
  month: string;
  nowCount: number;
  windowExpiresAt: Date;
}): Promise<Outcome> {
  const { eventRowId, fromNumber, language, month, nowCount, windowExpiresAt } = params;
  const refuse = async (logLine: string): Promise<Outcome> => {
    await recordDecision({
      eventId: eventRowId,
      decision: "REFUSED_CAP",
      reason: REPLY_REASON.capReached,
      windowExpiresAt,
    });
    console.log(logLine);
    return { kind: "refused", reason: REPLY_REASON.capReached };
  };

  const id = phoneNumberId();
  if (!id) throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured");

  if (!(await claimCapNotice(fromNumber, month))) {
    return refuse(
      `[WhatsApp] cap reached for ${fromNumber} at ${nowCount}, this thread already had its notice this month, nothing sent`,
    );
  }

  const noticeCount = await countCapNoticeAttempt(id, month);
  if (!noticeCount.counted) {
    return refuse(
      `[WhatsApp] cap reached for ${fromNumber} at ${nowCount} and the notice allowance is spent, nothing sent`,
    );
  }

  const notice = capNotice(language);
  const sent = await sendText(fromNumber, notice);
  await recordDecision({
    eventId: eventRowId,
    decision: sent.ok ? "SENT" : "REFUSED_CAP",
    reason: sent.ok ? "CAP_NOTICE_SENT" : `CAP_NOTICE_REFUSED_${sent.errorCode ?? sent.status}`,
    windowExpiresAt,
  });
  if (sent.ok) await markThreadOutbound(fromNumber);
  console.log(
    `[WhatsApp] cap notice to ${fromNumber} in ${language}, month ${month} at ${noticeCount.countThisMonth}/${capStatus(month).cap}, sent=${sent.ok}`,
  );
  return sent.ok
    ? { kind: "sent", body: notice, isNotice: true, language }
    : { kind: "failed", reason: `CAP_NOTICE_REFUSED_${sent.errorCode ?? sent.status}` };
}
