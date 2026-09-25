import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveActor } from "../../../../lib/chat/actor";
import { db } from "../../../../lib/db";

const ClaimSchema = z.object({
  guestKey: z.string().min(1).max(80),
  locale: z.enum(["en", "fr"]).default("fr"),
});

// Claim (spec 0004 AC-3): move ownerless rows for one guest key into the
// fresh account's default folder. The claimed key must match the signed
// guest cookie when the browser still holds it, so one user cannot sweep
// another browser's tries. Idempotent per guest key plus user id: reruns
// with nothing left are no ops. The default folder upserts on its unique
// pair, so concurrent claims converge instead of splitting sessions.
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
  const folder = await db.chatFolder.upsert({
    where: { ownerId_name: { ownerId: actor.userId, name: folderName } },
    update: {},
    create: { ownerId: actor.userId, name: folderName },
    select: { id: true },
  });

  // Bind to the presented cookie when the browser still holds it; a fresh
  // sign in on the same browser always does.
  const cookieGuest = req.cookies.get("checkam_guest")?.value.split(".")[0] ?? null;
  const keyMatch = cookieGuest === null || cookieGuest === parsed.data.guestKey;
  const moved = await db.chatSession.updateMany({
    where: {
      guestKey: parsed.data.guestKey,
      ownerId: null,
      deletedAt: null,
      ...(keyMatch ? {} : { id: "__never__" }),
    },
    data: { ownerId: actor.userId, folderId: folder.id, guestKey: null },
  });
  return NextResponse.json({ claimed: moved.count, folderId: folder.id });
}
