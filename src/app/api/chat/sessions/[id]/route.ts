import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveActor } from "../../../../../lib/chat/actor";
import { sessionScope } from "../../../../../lib/chat/scope";
import { issueUndoToken } from "../../../../../lib/chat/tokens";
import { db } from "../../../../../lib/db";

const PatchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  folderId: z.string().cuid().nullable().optional(),
  pinned: z.boolean().optional(),
});

async function ownedSession(actor: Awaited<ReturnType<typeof resolveActor>>, id: string) {
  return db.chatSession.findFirst({ where: { id, ...sessionScope(actor) } });
}

// A shared link carries the session id, so the page needs to read one check
// by id. Scoped to the actor the same way the writes are, so a link can only
// ever open the reader's own check and a guessed id is a plain 404.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await resolveActor();
  const { id } = await params;
  const session = await ownedSession(actor, id);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title,
      folderId: session.folderId,
      pinned: session.pinned,
      updatedAt: session.updatedAt,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await resolveActor();
  const { id } = await params;
  const session = await ownedSession(actor, id);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body: unknown = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_patch" }, { status: 422 });

  if (parsed.data.folderId && actor.kind !== "user") {
    return NextResponse.json({ error: "signed_out" }, { status: 401 });
  }
  if (parsed.data.folderId && actor.kind === "user") {
    const folder = await db.chatFolder.findFirst({
      where: { id: parsed.data.folderId, ownerId: actor.userId, deletedAt: null },
    });
    if (!folder) return NextResponse.json({ error: "no_folder" }, { status: 422 });
  }

  const updated = await db.chatSession.update({
    where: { id },
    data: { ...parsed.data },
    select: { id: true, title: true, folderId: true, pinned: true, updatedAt: true },
  });
  return NextResponse.json({ session: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await resolveActor();
  const { id } = await params;
  const session = await ownedSession(actor, id);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const stamp = new Date();
  await db.chatSession.update({ where: { id }, data: { deletedAt: stamp } });
  const undoToken = issueUndoToken("session", id, stamp.getTime());
  return NextResponse.json({ deleted: true, undoToken });
}
