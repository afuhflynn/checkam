import { type NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { headers } from "next/headers";

// Job status endpoint (spec 0003 AC-5, AC-9): the gate polls by the job id
// returned at trigger time. State derives from domain truth since history
// only is the store: verified means sent, a fresh token row means sending,
// anything older means failed.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "signed_out" }, { status: 401 });
  }

  const jobId = req.nextUrl.searchParams.get("jobId") ?? "";
  const match = jobId.match(/^mail:(verify|password-reset|welcome):([^:]+)/);
  if (!match?.[2] || match[2] !== session.user.id) {
    return NextResponse.json({ error: "unknown_job" }, { status: 404 });
  }
  const kind = match[1];
  const userId = match[2];

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "unknown_job" }, { status: 404 });

  if (kind === "verify" || kind === "welcome") {
    if (user.emailVerified) return NextResponse.json({ state: "sent" });
  }
  const freshCutoff = new Date(Date.now() - 30 * 60 * 1000);
  const recent = await db.verification.findFirst({
    where: {
      identifier: { contains: user.email },
      createdAt: { gte: freshCutoff },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return NextResponse.json({ state: "sending" });
  const marker =
    kind === "welcome"
      ? await db.verification.findFirst({ where: { identifier: `welcome:${userId}` } })
      : null;
  if (marker) return NextResponse.json({ state: "sent" });
  return NextResponse.json({ state: "failed" });
}
