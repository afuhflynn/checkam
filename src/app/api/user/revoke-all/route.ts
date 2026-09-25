import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth, revokeAllSessions } from "../../../../lib/auth";

// Revoke every session for the caller (spec 0002 invariant). Used after
// password change; the caller signs back in afterwards.
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "signed_out" }, { status: 401 });
  }
  const count = await revokeAllSessions(session.user.id);
  return NextResponse.json({ revoked: count });
}
