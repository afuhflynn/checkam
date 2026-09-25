import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveActor } from "../../../../../lib/chat/actor";
import { issueUndoToken } from "../../../../../lib/chat/tokens";
import { db } from "../../../../../lib/db";

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  pinned: z.boolean().optional(),
});

async function ownedFolder(actor: { userId: string }, id: string) {
  return db.chatFolder.findFirst({ where: { id, ownerId: actor.userId, deletedAt: null } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await resolveActor();
  if (actor.kind !== "user") {
    return NextResponse.json({ error: "signed_out" }, { status: 401 });
  }
  const { id } = await params;
  const folder = await ownedFolder(actor, id);
  if (!folder) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body: unknown = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_patch" }, { status: 422 });
  const updated = await db.chatFolder.update({
    where: { id },
    data: { ...parsed.data },
    select: { id: true, name: true, pinned: true, updatedAt: true },
  });
  return NextResponse.json({ folder: updated });
}

// Folder delete cascades to sessions plus messages with one shared deletedAt
// stamp so restore can scope the whole cascade (spec 0004 AC-6).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await resolveActor();
  if (actor.kind !== "user") {
    return NextResponse.json({ error: "signed_out" }, { status: 401 });
  }
  const { id } = await params;
  const folder = await ownedFolder(actor, id);
  if (!folder) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const stamp = new Date();
  const sessions = await db.chatSession.findMany({
    where: { folderId: id, ownerId: actor.userId, deletedAt: null },
    select: { id: true },
  });
  // Messages carry no stamp of their own; they hide with their session.
  await db.$transaction([
    db.chatFolder.update({ where: { id }, data: { deletedAt: stamp } }),
    db.chatSession.updateMany({
      where: { folderId: id, ownerId: actor.userId, deletedAt: null },
      data: { deletedAt: stamp },
    }),
  ]);
  const undoToken = issueUndoToken("folder", id, stamp.getTime());
  return NextResponse.json({ deleted: true, sessions: sessions.length, undoToken });
}
