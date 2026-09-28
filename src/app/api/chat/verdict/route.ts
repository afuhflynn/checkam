import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authLimiter } from "../../../../lib/arcjet";
import { resolveActor } from "../../../../lib/chat/actor";
import { sessionScope } from "../../../../lib/chat/scope";
import type { VerdictPayload } from "../../../../lib/chat/verdict-payload";
import { db } from "../../../../lib/db";

const QuerySchema = z.object({
  sessionId: z.string().cuid(),
  verificationId: z.string().cuid(),
  locale: z.enum(["en", "fr"]).default("en"),
});

// The dossier pane used to render a bare text fallback on a fresh page load
// and only switch to the real card once a new message arrived, so reloading a
// thread silently downgraded the verdict the user had already seen. Every
// assistant row already carries its verificationId; this hands the stored
// dossier back so the card is identical either way.
export async function GET(req: NextRequest) {
  const actor = await resolveActor();
  // Reads are open to unverified mailboxes, same as every other chat read.

  const parsed = QuerySchema.safeParse({
    sessionId: req.nextUrl.searchParams.get("sessionId"),
    verificationId: req.nextUrl.searchParams.get("verificationId"),
    locale: req.nextUrl.searchParams.get("locale") ?? undefined,
  });
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_verdict_query" }, { status: 422 });
  const { sessionId, verificationId, locale } = parsed.data;

  const decision = await authLimiter.protect(req);
  if (decision.isDenied()) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  // Scoped through the message, so a guest cannot read a verification row
  // belonging to somebody else's thread by guessing an id.
  const link = await db.chatMessage.findFirst({
    where: { sessionId, verificationId, session: sessionScope(actor) },
    select: { verification: { select: { id: true, dossier: true } } },
  });
  if (!link?.verification) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const stored = link.verification.dossier as
    | { answeredIn?: "en" | "fr"; en?: unknown; fr?: unknown }
    | null;
  // Prefer the language the answer was actually written in over the page
  // language, so the card never contradicts the thread beside it. Rows
  // written before answeredIn existed fall back to the requested locale.
  const answeredIn = stored?.answeredIn ?? locale;
  const pick = answeredIn === "fr" ? stored?.fr : stored?.en;
  if (!pick || typeof pick !== "object") {
    // A null body is an honest signal to fall back to the message text, and it
    // is a 200 so the client can tell "no dossier yet" from "not your thread".
    return NextResponse.json(null);
  }

  const payload: VerdictPayload = {
    ...(pick as Omit<VerdictPayload, "verificationId">),
    verificationId: link.verification.id,
  };
  return NextResponse.json(payload);
}
