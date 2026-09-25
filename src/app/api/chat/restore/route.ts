import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveActor } from "../../../../lib/chat/actor";
import { readUndoToken } from "../../../../lib/chat/tokens";
import { db } from "../../../../lib/db";

const RestoreSchema = z.object({
  token: z.string().min(1).max(500),
});

// Restore (spec 0004 AC-6): single use inside 30 days. Folder restore
// scopes to rows stamped with the same cascade instant.
export async function POST(req: NextRequest) {
  const actor = await resolveActor();
  if (actor.kind !== "user") {
    return NextResponse.json({ error: "signed_out" }, { status: 401 });
  }
  const body: unknown = await req.json().catch(() => null);
  const parsed = RestoreSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_token" }, { status: 422 });

  const payload = readUndoToken(parsed.data.token);
  if (!payload) return NextResponse.json({ error: "expired_token" }, { status: 410 });

  const markerId = `restore:${payload.id}`;
  const used = await db.verification.findFirst({ where: { identifier: markerId } });
  if (used) return NextResponse.json({ error: "already_restored" }, { status: 409 });

  const stamp = new Date(payload.ts);
  if (payload.type === "session") {
    const session = await db.chatSession.findFirst({
      where: { id: payload.id, ownerId: actor.userId, deletedAt: stamp },
    });
    if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await db.$transaction([
      db.chatSession.update({ where: { id: payload.id }, data: { deletedAt: null } }),
      db.verification.create({
        data: { identifier: markerId, value: "used", expiresAt: new Date(payload.exp) },
      }),
    ]);
    return NextResponse.json({ restored: true });
  }

  const folder = await db.chatFolder.findFirst({
    where: { id: payload.id, ownerId: actor.userId, deletedAt: stamp },
  });
  if (!folder) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await db.$transaction([
    db.chatFolder.update({ where: { id: payload.id }, data: { deletedAt: null } }),
    db.chatSession.updateMany({
      where: { folderId: payload.id, ownerId: actor.userId, deletedAt: stamp },
      data: { deletedAt: null },
    }),
    db.verification.create({
      data: { identifier: markerId, value: "used", expiresAt: new Date(payload.exp) },
    }),
  ]);
  return NextResponse.json({ restored: true });
}
