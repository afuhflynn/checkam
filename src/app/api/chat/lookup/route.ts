import { type NextRequest, NextResponse } from "next/server";
import { resolveActor } from "../../../../lib/chat/actor";
import { sessionScope } from "../../../../lib/chat/scope";
import { db } from "../../../../lib/db";
import { normalizeCameroonPhone } from "../../../../lib/rules/phone-normalizer";

// Phone lookup inside chat (spec 0005 AC-4): normalize to E.164 Cameroon,
// then read the flagged registry plus approved reports. Read only.
export async function GET(req: NextRequest) {
  const actor = await resolveActor();
  const raw = (req.nextUrl.searchParams.get("phone") ?? "").trim().slice(0, 40);
  if (!raw) return NextResponse.json({ error: "invalid_phone" }, { status: 422 });

  const sessionId = req.nextUrl.searchParams.get("sessionId") ?? "";
  if (sessionId) {
    const session = await db.chatSession.findFirst({
      where: { id: sessionId, ...sessionScope(actor) },
    });
    if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const parsed = normalizeCameroonPhone(raw);
  if (!parsed.isValid) return NextResponse.json({ error: "invalid_phone" }, { status: 422 });
  const normalized = parsed.normalized;

  const flagged = await db.flaggedIdentifier.findFirst({
    where: { normalizedValue: normalized, isActive: true },
    select: { riskLevel: true, category: true, updatedAt: true },
  });
  const reports = await db.scamReport.findMany({
    where: { status: "APPROVED", contactPhone: { contains: normalized.slice(-9) } },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: { slug: true, title: true, category: true },
  });
  return NextResponse.json({ normalized, flagged, reports });
}
