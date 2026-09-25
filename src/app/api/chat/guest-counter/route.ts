import { type NextRequest, NextResponse } from "next/server";
import { authLimiter } from "../../../../lib/arcjet";
import { clientIp, guestCookieAttrs, guestCookieValue, hashIp, resolveActor } from "../../../../lib/chat/actor";
import { guestTriesUsed } from "../../../../lib/chat/counter";

// Guest counter API (spec 0004 AC-4): tries left today, server truth with
// the cookie as fast mirror. Signed in users always have room.
export async function GET(req: NextRequest) {
  const actor = await resolveActor();
  if (actor.kind === "user") return NextResponse.json({ triesLeft: 2, capped: false });

  const decision = await authLimiter.protect(req);
  if (decision.isDenied()) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const ipHash = hashIp(clientIp(req.headers));
  const used = await guestTriesUsed(actor.guestKey, ipHash);
  const res = NextResponse.json({ triesLeft: Math.max(0, 2 - used), capped: used >= 2 });
  res.cookies.set("checkam_guest", guestCookieValue(actor.guestKey), guestCookieAttrs());
  return res;
}
