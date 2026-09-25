import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { draftTitle, runAgentTurn } from "../../../../lib/agent/runner";
import { withTimeout } from "../../../../lib/agent/tools";
import { authLimiter } from "../../../../lib/arcjet";
import { hashContent } from "../../../../lib/ai/extract-facts";
import { detectMessageLanguage } from "../../../../lib/i18n/detect";
import { clientIp, hashIp, resolveActor } from "../../../../lib/chat/actor";
import { doualaDayStart } from "../../../../lib/chat/day";
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
  const { sessionId } = parsed.data;

  const where =
    actor.kind === "user"
      ? { id: sessionId, ...sessionScope(actor) }
      : { id: sessionId, ...sessionScope(actor) };
  const session = await db.chatSession.findFirst({ where });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (actor.kind === "guest") {
    const decision = await authLimiter.protect(req);
    if (decision.isDenied()) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    const ipHash = hashIp(clientIp(req.headers));
    const used = await db.chatMessage.count({
      where: {
        role: "user",
        ipHash,
        createdAt: { gte: doualaDayStart() },
        session: { guestKey: actor.guestKey, ownerId: null, deletedAt: null },
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
        const turn = await runAgentTurn({ text, locale });
        const facts = turn.facts;
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

        const fileHash = hashContent(text);
        const verification = await db.scamVerification.create({
          data: {
            inputType: "TEXT",
            queryContent: text.slice(0, 1000),
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
          await tx.chatSession.update({ where: { id: sessionId }, data: {} });
        });

        if (session.title === "New check") {
          const fallback = `${new Date().toLocaleDateString(locale === "fr" ? "fr-CM" : "en-CM")} · ${text.split(/\s+/).slice(0, 6).join(" ")}`.slice(0, 120);
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
