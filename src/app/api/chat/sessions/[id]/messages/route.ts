import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authLimiter } from "../../../../../../lib/arcjet";
import {
  clientIp,
  guestCookieAttrs,
  guestCookieValue,
  hashIp,
  resolveActor,
} from "../../../../../../lib/chat/actor";
import { doualaDayStart } from "../../../../../../lib/chat/day";
import { guestTriesUsed } from "../../../../../../lib/chat/counter";
import { sessionScope, refuseUnverifiedWrite } from "../../../../../../lib/chat/scope";
import { db } from "../../../../../../lib/db";

const PAGE = 50;

const AttachmentSchema = z.object({
  key: z.string().min(1).max(300),
  mime: z.string().min(1).max(80),
  bytes: z.number().int().nonnegative().max(10 * 1024 * 1024),
});

const AppendSchema = z.object({
  role: z.enum(["user", "assistant", "system"]).default("user"),
  text: z.string().trim().min(1).max(8000),
  attachments: z.array(AttachmentSchema).max(5).default([]),
  verificationId: z.string().cuid().nullable().optional(),
});

async function visibleSession(actor: Awaited<ReturnType<typeof resolveActor>>, id: string) {
  return db.chatSession.findFirst({ where: { id, ...sessionScope(actor) } });
}

// Tries used today are counted in lib/chat/counter.ts so the counter
// endpoint and the append wall read one owner.

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await resolveActor();
  const { id } = await params;
  const session = await visibleSession(actor, id);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const after = Number(req.nextUrl.searchParams.get("after") ?? -1);
  const messages = await db.chatMessage.findMany({
    where: { sessionId: id, seq: { gt: Number.isFinite(after) ? Math.floor(after) : -1 } },
    orderBy: { seq: "asc" },
    take: PAGE,
    select: {
      id: true,
      seq: true,
      role: true,
      text: true,
      attachments: true,
      toolCalls: true,
      tokenUse: true,
      verificationId: true,
      createdAt: true,
    },
  });
  const last = messages[messages.length - 1];
  return NextResponse.json({ messages, nextAfter: last ? last.seq : after });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await resolveActor();
  const { id } = await params;
  const session = await visibleSession(actor, id);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const refused = refuseUnverifiedWrite(actor);
  if (refused) return refused;

  const body: unknown = await req.json().catch(() => null);
  const parsed = AppendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_message" }, { status: 422 });

  const ip = clientIp(req.headers);
  const ipHash = hashIp(ip);

  if (actor.kind === "guest" && parsed.data.role === "user") {
    const decision = await authLimiter.protect(req);
    if (decision.isDenied()) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    const used = await guestTriesUsed(actor.guestKey, ipHash);
    if (used >= 2) {
      const res = NextResponse.json({ error: "guest_wall", triesLeft: 0 }, { status: 403 });
      res.cookies.set("checkam_guest", guestCookieValue(actor.guestKey), guestCookieAttrs());
      return res;
    }
  }

  let message = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      message = await db.$transaction(async (tx) => {
        const last = await tx.chatMessage.findFirst({
          where: { sessionId: id },
          orderBy: { seq: "desc" },
          select: { seq: true },
        });
        const created = await tx.chatMessage.create({
          data: {
            sessionId: id,
            seq: (last?.seq ?? -1) + 1,
            role: parsed.data.role,
            text: parsed.data.text,
            attachments: parsed.data.attachments,
            toolCalls: [],
            ipHash,
            verificationId: parsed.data.verificationId ?? null,
          },
          select: {
            id: true,
            seq: true,
            role: true,
            text: true,
            attachments: true,
            verificationId: true,
            createdAt: true,
          },
        });
        await tx.chatSession.update({ where: { id }, data: {} });
        return created;
      });
      break;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "P2002" && attempt < 2) continue;
      if (code === "P2003") return NextResponse.json({ error: "no_verification" }, { status: 422 });
      throw err;
    }
  }
  if (!message) return NextResponse.json({ error: "seq_conflict" }, { status: 409 });

  const res = NextResponse.json({ message }, { status: 201 });
  if (actor.kind === "guest") {
    res.cookies.set("checkam_guest", guestCookieValue(actor.guestKey), guestCookieAttrs());
  }
  return res;
}
