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

const MESSAGE_SELECT = {
  id: true,
  seq: true,
  role: true,
  text: true,
  attachments: true,
  toolCalls: true,
  tokenUse: true,
  verificationId: true,
  createdAt: true,
} as const;

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
  const search = req.nextUrl.searchParams;
  const afterRaw = search.get("after");
  const beforeRaw = search.get("before");
  // Newer than seq (live tail, oldest first) or older than seq (paging up,
  // newest first). No cursor means the latest page, newest first.
  //
  // supersededAt: null is the filter rule from spec 0014, and this is the only
  // read it applies to. A re ask stamps the row it replaces rather than
  // deleting it (the row keeps counting toward the Tavily budget and its
  // verdict link keeps resolving), so the reads below are what keep a thread
  // from showing two answers to one question. The reads that must NOT filter:
  // verdict/route.ts, lib/agent/tools.ts (budget), transport/route.ts and
  // messages POST (seq assignment, which would collide on [sessionId, seq]),
  // and lib/chat/counter.ts (guest tries).
  const base = { sessionId: id, supersededAt: null };
  let messages: {
    id: string;
    seq: number;
    role: string;
    text: string;
    attachments: unknown;
    toolCalls: unknown;
    tokenUse: unknown;
    verificationId: string | null;
    createdAt: Date;
  }[];
  let hasMore = false;
  if (afterRaw !== null) {
    const after = Math.floor(Number(afterRaw));
    messages = await db.chatMessage.findMany({
      where: { ...base, seq: { gt: Number.isFinite(after) ? after : -1 } },
      orderBy: { seq: "asc" },
      take: PAGE,
      select: MESSAGE_SELECT,
    });
  } else {
    const before = beforeRaw === null ? null : Math.floor(Number(beforeRaw));
    const rows = await db.chatMessage.findMany({
      where: { ...base, ...(before !== null && Number.isFinite(before) ? { seq: { lt: before } } : {}) },
      orderBy: { seq: "desc" },
      take: PAGE + 1,
      select: MESSAGE_SELECT,
    });
    hasMore = rows.length > PAGE;
    messages = rows.slice(0, PAGE).reverse();
  }
  const first = messages[0];
  const last = messages[messages.length - 1];
  return NextResponse.json({
    messages,
    nextAfter: last ? last.seq : null,
    oldestSeq: first ? first.seq : null,
    hasMore,
  });
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
        await tx.chatSession.update({ where: { id }, data: { updatedAt: new Date() } });
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
