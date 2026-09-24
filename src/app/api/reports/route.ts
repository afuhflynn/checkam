import type { Prisma, ScamCategory } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashContent } from "../../../lib/ai/extract-facts";
import { reportLimiter } from "../../../lib/arcjet";
import { db } from "../../../lib/db";
import { normalizeCameroonPhone } from "../../../lib/rules/phone-normalizer";

const ReportBodySchema = z.object({
  title: z.string().trim().min(8).max(160),
  description: z.string().trim().min(20).max(5000),
  category: z
    .enum([
      "CIVIL_SERVICE",
      "VISA_TRAVEL",
      "MOBILE_MONEY",
      "INVESTMENT_PONZI",
      "ECOMMERCE",
      "OTHER",
    ])
    .default("OTHER"),
  targetEntity: z.string().max(120).optional(),
  amountRequested: z.string().max(60).optional(),
  contactPhone: z.string().max(60).optional(),
  contactEmail: z.string().email().max(160).optional().or(z.literal("")),
  paymentDetails: z.string().max(500).optional(),
  submitterEmail: z.string().email().max(160).optional().or(z.literal("")),
  evidenceUrls: z.array(z.string().max(500)).max(6).default([]),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Arcjet Rate Limit check on report submissions
    const decision = await reportLimiter.protect(req);
    if (decision.isDenied()) {
      return NextResponse.json(
        { error: "Too many reports submitted. Please wait before submitting another." },
        { status: 429 },
      );
    }

    const rawBody: unknown = await req.json();
    const parsed = ReportBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Title (8+ chars) and detailed description (20+ chars) are required." },
        { status: 400 },
      );
    }
    const {
      title,
      description,
      category,
      targetEntity,
      amountRequested,
      contactPhone,
      contactEmail,
      paymentDetails,
      submitterEmail,
      evidenceUrls,
    } = parsed.data;

    // Generate SEO friendly slug
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 60)
      .replace(/^-|-$/g, "");
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    const submitterIpHash = hashContent(clientIp);

    const report = await db.scamReport.create({
      data: {
        slug,
        title,
        description,
        category: category as ScamCategory,
        targetEntity: targetEntity || null,
        amountRequested: amountRequested || null,
        evidenceUrls,
        contactPhone: contactPhone || null,
        contactEmail: contactEmail || null,
        paymentDetails: paymentDetails || null,
        submitterEmail: submitterEmail || null,
        submitterIpHash,
        status: "PENDING",
      },
    });

    // If phone number provided, add flagged candidate (inactive until approval)
    if (contactPhone) {
      const parsedPhone = normalizeCameroonPhone(contactPhone);
      if (parsedPhone.isValid) {
        await db.flaggedIdentifier.create({
          data: {
            type: "PHONE",
            value: contactPhone,
            normalizedValue: parsedPhone.normalized,
            category: category as ScamCategory,
            reportId: report.id,
            isActive: false, // Inactive until report is approved by moderator
            notes: `Soumis par le public: ${title}`,
          },
        });
      }
    }

    if (contactEmail) {
      await db.flaggedIdentifier.create({
        data: {
          type: "EMAIL",
          value: contactEmail,
          normalizedValue: contactEmail.toLowerCase(),
          category: category as ScamCategory,
          reportId: report.id,
          isActive: false,
          notes: `Soumis par le public: ${title}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      slug: report.slug,
      message: "Report received and held in moderation queue.",
    });
  } catch (error) {
    console.error("[Report API Error]:", error);
    return NextResponse.json({ error: "Failed to submit scam report" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const query = searchParams.get("q");

    const where: Prisma.ScamReportWhereInput = {
      status: "APPROVED",
    };

    if (category && category !== "ALL") {
      where.category = category.toUpperCase() as ScamCategory;
    }

    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { targetEntity: { contains: query, mode: "insensitive" } },
        { contactPhone: { contains: query } },
        { contactEmail: { contains: query, mode: "insensitive" } },
      ];
    }

    const reports = await db.scamReport.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      include: {
        flaggedIdentifiers: true,
      },
      take: 50,
    });

    return NextResponse.json({ success: true, reports });
  } catch (error) {
    console.error("[Get Reports Error]:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
