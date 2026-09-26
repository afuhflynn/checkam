import { type NextRequest, NextResponse } from "next/server";
import { resolveActor } from "../../../../lib/chat/actor";
import { sessionScope } from "../../../../lib/chat/scope";
import { db } from "../../../../lib/db";

// Freshness stream (spec 0009): holds up to 25 seconds watching the
// session plus its messages, then emits change pings the client uses to
// invalidate queries. Poll plus focus remain authoritative behind it.
export async function GET(req: NextRequest) {
  const actor = await resolveActor();
  const sessionId = req.nextUrl.searchParams.get("sessionId") ?? "";
  const sinceRaw = req.nextUrl.searchParams.get("since") ?? "";
  const since = new Date(sinceRaw);
  if (!sessionId || Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "invalid_stream" }, { status: 422 });
  }
  const session = await db.chatSession.findFirst({
    where: { id: sessionId, ...sessionScope(actor) },
    select: { id: true, updatedAt: true },
  });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      };
      send("ping", JSON.stringify({ at: new Date().toISOString() }));
      const deadline = Date.now() + 25_000;
      let lastSeen = session.updatedAt.getTime();
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
          const fresh = await db.chatSession.findFirst({
            where: { id: sessionId },
            select: { updatedAt: true },
          });
          const latest = await db.chatMessage.findFirst({
            where: { sessionId },
            orderBy: { seq: "desc" },
            select: { createdAt: true },
          });
          const newest = Math.max(
            fresh?.updatedAt.getTime() ?? 0,
            latest?.createdAt.getTime() ?? 0,
          );
          if (newest > Math.max(lastSeen, since.getTime())) {
            lastSeen = newest;
            send("change", JSON.stringify({ at: new Date(newest).toISOString() }));
          }
        } catch {
          break;
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
