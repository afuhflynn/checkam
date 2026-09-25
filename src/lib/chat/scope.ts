import { type NextResponse, NextResponse as JsonResponse } from "next/server";
import type { ChatActor } from "./actor";

// Every chat read and write filters by owner or guest key, and hides soft
// deleted rows unless the caller is the restore path (spec 0004 AC-8).
export function sessionScope(actor: ChatActor, includeDeleted = false) {
  const base =
    actor.kind === "user"
      ? { ownerId: actor.userId }
      : { ownerId: null, guestKey: actor.guestKey };
  return includeDeleted ? base : { ...base, deletedAt: null };
}

// Password writes need a proved mailbox (spec 0004 AC-8, via 0002 AC-3).
// Returns an error response when the write is refused, else null.
export function refuseUnverifiedWrite(actor: ChatActor): NextResponse | null {
  if (actor.kind === "user" && !actor.verified) {
    return JsonResponse.json({ error: "unverified" }, { status: 403 });
  }
  return null;
}
