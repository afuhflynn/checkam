import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { draftTitle, runAgentTurn } from "../../../../lib/agent/runner";
import type { AgentTrace, AgentTurn } from "../../../../lib/agent/runner";
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

type VerdictData = {
  verdict: string;
  score: number;
  bullets: string[];
  verificationId: string;
};

type ChatStreamMessage = UIMessage<{ verdict: VerdictData }>;

const TransportSchema = z.object({
  sessionId: z.string().cuid(),
  // Sequence of the already persisted user turn, so the wall recount
  // excludes the current turn instead of charging it twice.
  userSeq: z.number().int().nonnegative().optional(),
  locale: z.enum(["en", "fr"]).optional(),
  messages: z
    .array(
      z.object({
        role: z.string(),
        parts: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
      }),
    )
    .min(1),
});

function lastUserText(messages: { role: string; parts?: { type: string; text?: string }[] }[]): string {
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
  const { sessionId, userSeq } = parsed.data;

  const session = await db.chatSession.findFirst({ where: { id: sessionId, ...sessionScope(actor) } });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (actor.kind === "guest") {
    const decision = await authLimiter.protect(req);
    if (decision.isDenied()) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    // Same counter owner as the append wall (spec 0004 AC-4). The current
    // turn already persisted through messages-POST, so turns at or after
    // its sequence do not count against it: single enforcement, no double
    // charge.
    const ipHash = hashIp(clientIp(req.headers));
    const used =
      userSeq === undefined
        ? await guestTriesUsed(actor.guestKey, ipHash)
        : await db.chatMessage.count({
            where: {
              role: "user",
              ipHash,
              createdAt: { gte: doualaDayStart() },
              session: { guestKey: actor.guestKey, ownerId: null, deletedAt: null },
              seq: { lt: userSeq },
            },
          });
    if (used >= 2) return NextResponse.json({ error: "guest_wall", triesLeft: 0 }, { status: 403 });
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
        // Extraction cache (repo rule): a repeat text reuses stored facts
        // instead of re running the agent, but still gets a fresh answer.
        // Flagged status rechecks cheaply since watchlists move.
        const cached = await db.scamVerification.findFirst({
          where: { fileHash },
          orderBy: { createdAt: "desc" },
          select: { extractedFacts: true },
        });
        let turn: AgentTurn;
        if (cached?.extractedFacts) {
          const facts = cached.extractedFacts as unknown as ExtractedFacts;
          const hit = facts.phoneNumbers.length
            ? await db.flaggedIdentifier.findFirst({
                where: { normalizedValue: { in: facts.phoneNumbers }, isActive: true },
                select: { id: true },
              })
            : null;
          const traces: AgentTrace[] = [{ tool: "cache", ok: true }];
          turn = { facts, traces, answer: null, flagged: Boolean(hit) };
        } else {
          turn = await runAgentTurn({ text, locale });
        }
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
        });
        const bullets = locale === "fr" ? result.evidenceBullets.fr : result.evidenceBullets.en;
        const head =
          result.verdict === "HIGH_RISK"
            ? locale === "fr"
              ? "Arnaque probable. Voici pourquoi :"
              : "Likely a scam. Here is why:"
            : result.verdict === "VERIFIED_OFFICIAL"
              ? locale === "fr"
                ? "Semble officiel. Vérifiez toujours le canal :"
                : "Looks official. Always check the channel:"
              : locale === "fr"
                ? "Prudence. Points à vérifier :"
                : "Be careful. Points to check:";
        const grounded = turn.answer?.trim();
        const answer = grounded
          ? `${grounded}\n${bullets.map((bullet) => `• ${bullet}`).join("\n")}`
          : `${head}\n${bullets.map((bullet) => `• ${bullet}`).join("\n")}`;

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
            verdict: result.verdict,
            score: result.score,
            bullets,
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
              await tx.chatMessage.create({
                data: {
                  sessionId,
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
          const fallback = `${new Date().toLocaleDateString(locale === "fr" ? "fr-CM" : "en-CM")} · ${text.split(/\s+/).slice(0, 6).join(" ")}`.slice(0, 60);
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
