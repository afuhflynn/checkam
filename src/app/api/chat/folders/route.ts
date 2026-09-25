import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveActor } from "../../../../lib/chat/actor";
import { db } from "../../../../lib/db";

const FolderSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

// Folders need an owner, so guests never reach here (spec 0004).
export async function GET() {
  const actor = await resolveActor();
  if (actor.kind !== "user") return NextResponse.json({ folders: [] });
  const folders = await db.chatFolder.findMany({
    where: { ownerId: actor.userId, deletedAt: null },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    select: { id: true, name: true, pinned: true, updatedAt: true },
  });
  return NextResponse.json({ folders });
}

export async function POST(req: NextRequest) {
  const actor = await resolveActor();
  if (actor.kind !== "user") {
    return NextResponse.json({ error: "signed_out" }, { status: 401 });
  }
  const body: unknown = await req.json().catch(() => null);
  const parsed = FolderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_name" }, { status: 422 });
  const folder = await db.chatFolder.create({
    data: { ownerId: actor.userId, name: parsed.data.name },
    select: { id: true, name: true, pinned: true, updatedAt: true },
  });
  return NextResponse.json({ folder }, { status: 201 });
}
