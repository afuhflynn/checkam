import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guestCookieAttrs, guestCookieValue, resolveActor } from "../../../../lib/chat/actor";
import { sessionScope } from "../../../../lib/chat/scope";
import { decodeCursor, encodeCursor } from "../../../../lib/chat/tokens";
import { db } from "../../../../lib/db";

const PAGE = 20;

const CreateSchema = z.object({
  folderId: z.string().cuid().nullable().optional(),
  title: z.string().trim().min(1).max(120).optional(),
});

// Cursor rail (spec 0004 AC-7, AC-11): cursor of pinned plus updatedAt
// plus id at 20 per page, title search, pins above newest.
export async function GET(req: NextRequest) {
  const actor = await resolveActor();
  const search = (req.nextUrl.searchParams.get("search") ?? "").trim().slice(0, 80);
  const cursor = decodeCursor(req.nextUrl.searchParams.get("cursor"));
  const scope = sessionScope(actor);
  // Keyset over (pinned desc, updatedAt desc, id desc). The id branch
  // uses lte on purpose: timestamptz stores microseconds the ISO cursor
  // cannot carry, so equality could miss same-millisecond rows. The rail
  // dedupes by id, trading possible duplicates for never lost rows.
  const keyset = cursor
    ? cursor.pinned
      ? [
          { pinned: true, updatedAt: { lt: new Date(cursor.updatedAt) } },
          { pinned: true, updatedAt: { lte: new Date(cursor.updatedAt) }, id: { lt: cursor.id } },
          { pinned: false },
        ]
      : [
          { pinned: false, updatedAt: { lt: new Date(cursor.updatedAt) } },
          { pinned: false, updatedAt: { lte: new Date(cursor.updatedAt) }, id: { lt: cursor.id } },
        ]
    : undefined;
  const sessions = await db.chatSession.findMany({
    where: {
      ...scope,
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
      ...(keyset ? { OR: keyset } : {}),
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
    take: PAGE + 1,
    select: { id: true, title: true, folderId: true, pinned: true, updatedAt: true },
  });

  const hasMore = sessions.length > PAGE;
  const page = sessions.slice(0, PAGE);
  const last = page[page.length - 1];
  return NextResponse.json({
    sessions: page,
    nextCursor: hasMore && last ? encodeCursor({ pinned: last.pinned, updatedAt: last.updatedAt.toISOString(), id: last.id }) : null,
  });
}

export async function POST(req: NextRequest) {
  const actor = await resolveActor();
  const body: unknown = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_session" }, { status: 422 });

  if (actor.kind === "user" && !actor.verified) {
    return NextResponse.json({ error: "unverified" }, { status: 403 });
  }
  if (parsed.data.folderId && actor.kind !== "user") {
    return NextResponse.json({ error: "signed_out" }, { status: 401 });
  }
  if (parsed.data.folderId && actor.kind === "user") {
    const folder = await db.chatFolder.findFirst({
      where: { id: parsed.data.folderId, ownerId: actor.userId, deletedAt: null },
    });
    if (!folder) return NextResponse.json({ error: "no_folder" }, { status: 422 });
  }

  const session = await db.chatSession.create({
    data:
      actor.kind === "user"
        ? { ownerId: actor.userId, folderId: parsed.data.folderId ?? null, title: parsed.data.title ?? "New check" }
        : { ownerId: null, guestKey: actor.guestKey, folderId: null, title: parsed.data.title ?? "New check" },
    select: { id: true, title: true, folderId: true, pinned: true, updatedAt: true },
  });

  const res = NextResponse.json({ session }, { status: 201 });
  if (actor.kind === "guest") {
    res.cookies.set("checkam_guest", guestCookieValue(actor.guestKey), guestCookieAttrs());
  }
  return res;
}
