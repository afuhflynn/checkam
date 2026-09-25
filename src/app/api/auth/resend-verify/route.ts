import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authLimiter } from "../../../../lib/arcjet";
import { db } from "../../../../lib/db";
import { queueMail } from "../../../../lib/mail/queue";

const ResendSchema = z.object({
  email: z.string().email().max(254),
});

// Resend verify action (spec 0002 AC-3, AC-7): capped 5/hr per mail plus
// 20/hr per IP, queues the 0003-mail verify job, returns its job id.
export async function POST(req: NextRequest) {
  const decision = await authLimiter.protect(req);
  if (decision.isDenied()) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = ResendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  // Per-mail cap counts this address's verification rows from the last
  // hour, whatever identifier convention wrote them.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db.verification.count({
    where: { identifier: { contains: email }, createdAt: { gte: hourAgo } },
  });
  if (recent >= 5) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) {
    // Respond ok either way so addresses can't be probed.
    return NextResponse.json({ success: true, jobId: null });
  }

  // Marker row so this resend counts toward the per-mail cap above.
  await db.verification.create({
    data: {
      identifier: `resend:${email}`,
      value: "sent",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const jobId = await queueMail("mail/verify.requested", {
    userId: user.id,
    email,
    locale: "fr",
    purpose: "verify",
  });
  return NextResponse.json({ success: true, jobId });
}
