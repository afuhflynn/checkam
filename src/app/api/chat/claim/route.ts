import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveActor } from "../../../../lib/chat/actor";
import { db } from "../../../../lib/db";

const ClaimSchema = z.object({
  guestKey: z.string().min(1).max(80),
  locale: z.enum(["en", "fr"]).default("fr"),
});

// Claim (spec 0004 AC-3): move ownerless rows for one guest key into the
// fresh account's default folder. Idempotent per guest key plus user id:
// reruns with nothing left are no ops.
export async function POST(req: NextRequest) {
  const actor = await resolveActor();
  if (actor.kind !== "user") {
    return NextResponse.json({ error: "signed_out" }, { status: 401 });
  }
  const body: unknown = await req.json().catch(() => null);
  const parsed = ClaimSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_claim" }, { status: 422 });

  const strays = await db.chatSession.findMany({
    where: { guestKey: parsed.data.guestKey, ownerId: null, deletedAt: null },
    select: { id: true },
  });
  if (strays.length === 0) return NextResponse.json({ claimed: 0 });

  const folderName = parsed.data.locale === "en" ? "My checks" : "Mes vérifications";
  const existing = await db.chatFolder.findFirst({
    where: { ownerId: actor.userId, name: folderName, deletedAt: null },
    select: { id: true },
  });
  const folder =
    existing ??
    (await db.chatFolder.create({
      data: { ownerId: actor.userId, name: folderName },
      select: { id: true },
    }));

  const moved = await db.chatSession.updateMany({
    where: { guestKey: parsed.data.guestKey, ownerId: null, deletedAt: null },
    data: { ownerId: actor.userId, folderId: folder.id, guestKey: null },
  });
  return NextResponse.json({ claimed: moved.count, folderId: folder.id });
}
