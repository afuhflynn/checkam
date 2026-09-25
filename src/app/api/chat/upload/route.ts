import { type NextRequest, NextResponse } from "next/server";
import { authLimiter } from "../../../../lib/arcjet";
import { clientIp, hashIp, resolveActor } from "../../../../lib/chat/actor";
import { guestTriesUsed } from "../../../../lib/chat/counter";
import { sessionScope, refuseUnverifiedWrite } from "../../../../lib/chat/scope";
import { db } from "../../../../lib/db";
import { saveChatFile } from "../../../../lib/storage";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);

// Flyer upload (spec 0005 AC-5): 10MB cap with preview url, stored local in
// dev and Blob in prod through the storage seam.
export async function POST(req: NextRequest) {
  const actor = await resolveActor();
  const refused = refuseUnverifiedWrite(actor);
  if (refused) return refused;

  if (actor.kind === "guest") {
    const decision = await authLimiter.protect(req);
    if (decision.isDenied()) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    // Uploads pass the same guest cap as sends (spec 0005 invariants).
    const used = await guestTriesUsed(actor.guestKey, hashIp(clientIp(req.headers)));
    if (used >= 2) return NextResponse.json({ error: "guest_wall", triesLeft: 0 }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const sessionId = form?.get("sessionId");
  const file = form?.get("file");
  if (typeof sessionId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "invalid_upload" }, { status: 422 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 422 });
  }

  const session = await db.chatSession.findFirst({
    where: { id: sessionId, ...sessionScope(actor) },
  });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    const saved = await saveChatFile({ bytes, mimeType: file.type, sessionId });
    return NextResponse.json({ file: saved }, { status: 201 });
  } catch (err) {
    const code = err instanceof Error ? err.message : "upload_failed";
    if (code === "FILE_TOO_LARGE") return NextResponse.json({ error: "too_large" }, { status: 413 });
    if (code === "UNSUPPORTED_FILE_TYPE") {
      return NextResponse.json({ error: "unsupported_type" }, { status: 422 });
    }
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
