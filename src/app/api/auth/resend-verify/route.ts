import arcjet, { fixedWindow } from "@arcjet/next";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { queueMail } from "../../../../lib/mail/queue";

const ResendSchema = z.object({
  email: z.string().email().max(254),
});

// Day limiter for mail triggers per IP (spec 0002 AC-7, 0003 AC-6).
const mailIpLimiter = arcjet({
  key: process.env.ARCJET_KEY || "ajkey_placeholder",
  rules: [
    fixedWindow({
      mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN",
      window: "24h",
      max: 20,
    }),
  ],
});

async function requestLocale(): Promise<"en" | "fr"> {
  try {
    const h = await headers();
    const cookie = h.get("cookie") ?? "";
    const match = cookie.match(/(?:^|;\s*)checkam_lang=(en|fr)/);
    if (match?.[1]) return match[1] as "en" | "fr";
    const accept = h.get("accept-language") ?? "";
    return accept.toLowerCase().startsWith("en") ? "en" : "fr";
  } catch {
    return "fr";
  }
}

// Resend verify action (spec 0002 AC-3, AC-7): capped 5/hr per mail plus
// 20/day per IP, deduped while a recent resend is still fresh, queues the
// 0003-mail verify job and returns its job id.
export async function POST(req: NextRequest) {
  const decision = await mailIpLimiter.protect(req);
  if (decision.isDenied()) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = ResendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) {
    // Respond ok either way so addresses can't be probed.
    return NextResponse.json({ success: true, jobId: null });
  }

  // Per-mail cap counts this address's resend markers from the last hour,
  // never other purposes sharing the table.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db.verification.count({
    where: { identifier: { startsWith: "resend:" }, value: { contains: email }, createdAt: { gte: hourAgo } },
  });
  if (recent >= 5) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // Dedupe: a resend from the last 5 minutes returns its marker id as the
  // standing job id instead of queueing again.
  const fresh = await db.verification.findFirst({
    where: {
      identifier: { startsWith: "resend:" },
      value: { contains: email },
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (fresh) return NextResponse.json({ success: true, jobId: fresh.id });

  const marker = await db.verification.create({
    data: {
      identifier: `resend:${Date.now().toString(36)}`,
      value: email,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const jobId = await queueMail("mail/verify.requested", {
    userId: user.id,
    email,
    locale: await requestLocale(),
    purpose: "verify",
  });
  return NextResponse.json({ success: true, jobId, markerId: marker.id });
}
