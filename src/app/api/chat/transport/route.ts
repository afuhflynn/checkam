import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import type { VerdictPayload } from "../../../../lib/chat/verdict-payload";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { draftTitle, runAgentTurn } from "../../../../lib/agent/runner";
import type { ExtractedFacts } from "../../../../lib/ai/extract-facts";
import { withTimeout } from "../../../../lib/agent/tools";
import { authLimiter } from "../../../../lib/arcjet";
import { hashContent } from "../../../../lib/ai/extract-facts";
import { detectMessageLanguage } from "../../../../lib/i18n/detect";
import { clientIp, hashIp, resolveActor } from "../../../../lib/chat/actor";
import { doualaDayStart } from "../../../../lib/chat/day";
import { guestTriesUsed } from "../../../../lib/chat/counter";
import { sessionScope, refuseUnverifiedWrite } from "../../../../lib/chat/scope";
import { db } from "../../../../lib/db";
import { runRulesEngine } from "../../../../lib/rules/engine";
import { buildVerdictPayload } from "../../../../lib/chat/verdict-payload";

type ChatStreamMessage = UIMessage<{ verdict: VerdictPayload }>;

const TransportSchema = z.object({
  sessionId: z.string().cuid(),
  // Sequence of the already persisted user turn, so the wall recount
  // excludes the current turn instead of charging it twice.
  userSeq: z.number().int().nonnegative().optional(),
  locale: z.enum(["en", "fr"]).optional(),
  // Re ask (spec 0014): the assistant row this turn replaces. Blank means an
  // ordinary turn. Validated against the latest live answer below.
  supersedeId: z.string().cuid().optional(),
  messages: z
    .array(
      z.object({
        role: z.string(),
        parts: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
      }),
    )
    .min(1),
});

// Last resort when the analyst prose is unavailable: the model was cut off,
// the circuit was open, or it tried to voice a verdict and was dropped. This
// must read like a person, because the previous version of this path dumped
// the numbered evidence list straight into the chat.
function buildFallbackProse(
  verdict: string,
  bullets: string[],
  safetyNote: { en: string; fr: string },
  locale: "en" | "fr",
): string {
  const fr = locale === "fr";
  const lead =
    verdict === "HIGH_RISK"
      ? fr
        ? "Celui-ci porte les marques d'une arnaque."
        : "This one carries the marks of a scam."
      : verdict === "VERIFIED_OFFICIAL"
        ? fr
          ? "Ceci renvoie vers un canal officiel."
          : "This points at an official channel."
        : fr
          ? "Je ne peux pas confirmer ce message d'un bout à l'autre."
          : "I could not confirm this one either way.";
  const strongest = bullets[0];
  const middle = strongest
    ? strongest.endsWith(".")
      ? strongest
      : `${strongest}.`
    : fr
      ? "Rien de concluant n'est ressorti des détails fournis."
      : "Nothing conclusive came out of the details you shared.";
  return `${lead} ${middle}\n\n${fr ? safetyNote.fr : safetyNote.en}`;
}

function lastUserText(
  messages: { role: string; parts?: { type: string; text?: string }[] }[],
): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!message || message.role !== "user") continue;
    const text = (message.parts ?? [])
      .filter((part) => part.type === "text" && part.text)
      .map((part) => part.text as string)
      .join("\n");
    if (text.trim()) return text;
  }
  return "";
}

// Chat transport (spec 0005): streams the thin thread from the live verify
// engine as text deltas plus one verdict data part, then persists the
// assistant row. The 0006 agent enriches the prose later; rules decide now.
export async function POST(req: NextRequest) {
  const actor = await resolveActor();
  const refused = refuseUnverifiedWrite(actor);
  if (refused) return refused;

  const body: unknown = await req.json().catch(() => null);
  const parsed = TransportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_transport" }, { status: 422 });
  const { sessionId, userSeq, supersedeId } = parsed.data;

  const session = await db.chatSession.findFirst({
    where: { id: sessionId, ...sessionScope(actor) },
  });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (actor.kind === "guest") {
    const decision = await authLimiter.protect(req);
    if (decision.isDenied()) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    // Same counter owner as the append wall (spec 0004 AC-4). Turns are user
    // rows plus the answers a re ask superseded (spec 0014 AC-9), because a re
    // ask adds no user row and would otherwise cost nothing. An ordinary turn
    // already persisted through messages-POST, so it stops the count before
    // its own row: single enforcement, no double charge. A re ask has no row of
    // its own to skip, so it counts the whole thread and the answer it is
    // about to replace is charged by the next turn.
    const ipHash = hashIp(clientIp(req.headers));
    const used =
      userSeq === undefined
        ? await guestTriesUsed(actor.guestKey, ipHash)
        : await db.chatMessage.count({
            where: {
              ipHash,
              createdAt: { gte: doualaDayStart() },
              session: { guestKey: actor.guestKey, ownerId: null, deletedAt: null },
              OR: [
                supersedeId === undefined
                  ? { role: "user", seq: { lt: userSeq } }
                  : { role: "user" },
                { role: "assistant", supersededAt: { not: null } },
              ],
            },
          });
    if (used >= 2) return NextResponse.json({ error: "guest_wall", triesLeft: 0 }, { status: 403 });
  }

  // A re ask may only replace the latest live answer of the caller's own
  // session (spec 0014 AC-15). Matching on the session we already scoped above
  // is what stops one reader or one tab from superseding another's answer, and
  // the latest-only match is what stops two live answers to one question.
  if (supersedeId) {
    const latest = await db.chatMessage.findFirst({
      where: { sessionId, role: "assistant", supersededAt: null },
      orderBy: { seq: "desc" },
      select: { id: true },
    });
    if (latest?.id !== supersedeId) {
      return NextResponse.json({ error: "stale_supersede" }, { status: 409 });
    }
  }

  const text = lastUserText(parsed.data.messages);
  if (!text) return NextResponse.json({ error: "empty_turn" }, { status: 422 });
  const locale = parsed.data.locale ?? detectMessageLanguage(text);
  const ip = clientIp(req.headers);

  const stream = createUIMessageStream<ChatStreamMessage>({
    execute: async ({ writer }) => {
      const partId = "answer-0";
      writer.write({ type: "text-start", id: partId });
      try {
        const fileHash = hashContent(text);
        // Extraction cache (repo rule): a repeat text reuses the stored facts
        // instead of re-running the extractor, but still gets fresh research
        // and a fresh written answer. The old path short circuited the whole
        // turn on a hit, so a message checked twice came back as a bare
        // fallback with no evidence and no sources.
        const cached = await db.scamVerification.findFirst({
          where: { fileHash },
          orderBy: { createdAt: "desc" },
          select: { extractedFacts: true },
        });
        const turn = await runAgentTurn({
          text,
          locale,
          preExtractedFacts: (cached?.extractedFacts as unknown as ExtractedFacts) ?? null,
        });
        const facts = turn.facts;
        if (!facts) {
          writer.write({ type: "error", errorText: "extraction_failed" });
          return;
        }
        const result = runRulesEngine({
          text,
          claimedEntity: facts.claimedEntity,
          phoneNumbers: facts.phoneNumbers,
          emails: facts.emails,
          amount: facts.amount,
          paymentMethod: facts.paymentMethod,
          isKnownFlaggedInDb: turn.flagged,
          webCorroboration: { foundOfficialSource: turn.corroborated, sources: turn.sources },
        });
        const bullets = locale === "fr" ? result.evidenceBullets.fr : result.evidenceBullets.en;
        // The chat text is the analyst's prose. Evidence lives in the dossier
        // card, where it is colour coded and expandable, so the two are no
        // longer concatenated. That concatenation is what made every answer
        // end in the same numbered boilerplate.
        const grounded = turn.answer?.trim();
        const answer =
          grounded || buildFallbackProse(result.verdict, bullets, result.safetyNote, locale);

        for (const slice of answer.match(/.{1,24}/gsu) ?? [answer]) {
          writer.write({ type: "text-delta", id: partId, delta: slice });
        }
        writer.write({ type: "text-end", id: partId });

        // Stored rows keep structured identifiers (needed for flagged and
        // dossier function) while free text is redacted at rest.
        const redacted = text
          .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[mail]")
          .replace(/\+?\d[\d\s./-]{7,}\d/g, "[phone]")
          .slice(0, 1000);
        const verification = await db.scamVerification.create({
          data: {
            inputType: "TEXT",
            queryContent: redacted,
            fileHash,
            extractedFacts: facts as unknown as object,
            verdict: result.verdict,
            score: result.score,
            evidenceBullets: result.evidenceBullets as unknown as object,
            dossier: {
              // The turn may have been answered in French from a French message
              // on an English page. Recording it lets a reload hand back the
              // card in the same language as the thread it sits beside.
              answeredIn: locale,
              en: buildVerdictPayload({ result, locale: "en" }),
              fr: buildVerdictPayload({ result, locale: "fr" }),
            } as unknown as object,
            whatsappWarning:
              locale === "fr" ? result.whatsappWarning.fr : result.whatsappWarning.en,
            clientIpHash: hashIp(ip),
          },
          select: { id: true },
        });
        writer.write({
          type: "data-verdict",
          id: "verdict-0",
          data: {
            ...buildVerdictPayload({ result, locale }),
            verificationId: verification.id,
          },
        });

        let persisted = false;
        for (let attempt = 0; attempt < 3 && !persisted; attempt += 1) {
          try {
            await db.$transaction(async (tx) => {
              const last = await tx.chatMessage.findFirst({
                where: { sessionId },
                orderBy: { seq: "desc" },
                select: { seq: true },
              });
              // Stamp and insert in one transaction so a session can never hold
              // two live answers to one question, even if the seq insert below
              // loses its race and retries. Stamping keeps the row: its
              // toolCalls still count against the Tavily budget and its
              // verificationId still resolves a link already shared.
              if (supersedeId) {
                await tx.chatMessage.update({
                  where: { id: supersedeId },
                  data: { supersededAt: new Date() },
                });
              }
              await tx.chatMessage.create({
                data: {
                  sessionId,
                  // Unfiltered on purpose: the sequence only ever grows and a
                  // superseded row keeps its place in it.
                  seq: (last?.seq ?? -1) + 1,
                  role: "assistant",
                  text: answer,
                  attachments: [],
                  toolCalls: turn.traces as unknown as object,
                  ipHash: hashIp(ip),
                  verificationId: verification.id,
                },
              });
              await tx.chatSession.update({
                where: { id: sessionId },
                data: { updatedAt: new Date() },
              });
            });
            persisted = true;
          } catch (err: unknown) {
            if ((err as { code?: string })?.code === "P2002" && attempt < 2) continue;
            // Never orphan the verification row on a failed persist.
            await db.scamVerification.delete({ where: { id: verification.id } }).catch(() => {});
            throw err;
          }
        }

        if (session.title === "New check") {
          const fallback =
            `${new Date().toLocaleDateString(locale === "fr" ? "fr-CM" : "en-CM")} · ${text.split(/\s+/).slice(0, 6).join(" ")}`.slice(
              0,
              60,
            );
          await db.chatSession.update({ where: { id: sessionId }, data: { title: fallback } });
          try {
            const title = await withTimeout(
              draftTitle({ userText: text, assistantText: answer, locale }),
              12_000,
            );
            if (title) await db.chatSession.update({ where: { id: sessionId }, data: { title } });
          } catch {
            // Fallback title stands.
          }
        }
      } catch (err) {
        writer.write({
          type: "error",
          errorText: err instanceof Error ? err.message : "turn_failed",
        });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
