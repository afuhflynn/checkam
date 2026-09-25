import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveActor } from "../../../../lib/chat/actor";
import { readUndoToken } from "../../../../lib/chat/tokens";
import { db } from "../../../../lib/db";

const RestoreSchema = z.object({
  token: z.string().min(1).max(500),
});

// Restore (spec 0004 AC-6): single use inside 30 days. Guests may restore
// their own rows through the same token, scoped by guest key, so the
// toast undo works before sign in too.
export async function POST(req: NextRequest) {
  const actor = await resolveActor();
  const body: unknown = await req.json().catch(() => null);
  const parsed = RestoreSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_token" }, { status: 422 });

  const payload = readUndoToken(parsed.data.token);
  if (!payload) return NextResponse.json({ error: "expired_token" }, { status: 410 });

  // Marker carries the delete stamp, so a second delete plus restore cycle
  // mints a fresh marker instead of colliding with history.
  const markerId = `restore:${payload.id}:${payload.ts}`;
  const used = await db.verification.findFirst({ where: { identifier: markerId } });
  if (used) return NextResponse.json({ error: "already_restored" }, { status: 409 });

  // Stamp window: tolerate a second of clock skew around the cascade instant.
  const stamp = new Date(payload.ts);
  const windowStart = new Date(payload.ts - 1000);
  const windowEnd = new Date(payload.ts + 1000);
  const stamped = { gte: windowStart, lte: windowEnd };

  const ownerScope =
    actor.kind === "user" ? { ownerId: actor.userId } : { ownerId: null, guestKey: actor.guestKey };
  if (payload.type === "session") {
    const session = await db.chatSession.findFirst({
      where: { id: payload.id, ...ownerScope, deletedAt: stamped },
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
    where:
      actor.kind === "user"
        ? { id: payload.id, ownerId: actor.userId, deletedAt: stamped }
        : { id: "__never__" },
  });
  if (!folder) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await db.$transaction([
    db.chatFolder.update({ where: { id: payload.id }, data: { deletedAt: null } }),
    db.chatSession.updateMany({
      where:
        actor.kind === "user"
          ? { folderId: payload.id, ownerId: actor.userId, deletedAt: stamped }
          : { folderId: "__never__" },
      data: { deletedAt: null },
    }),
    db.verification.create({
      data: { identifier: markerId, value: "used", expiresAt: new Date(payload.exp) },
    }),
  ]);
  return NextResponse.json({ restored: true });
}
