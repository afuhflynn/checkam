import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { aj } from "../../../../lib/arcjet";
import { db } from "../../../../lib/db";

export async function GET(req: NextRequest) {
  try {
    // Rate-limit the public feed so telco/bank pollers cannot exhaust the DB
    const decision = await aj.protect(req, { requested: 1 });
    if (decision.isDenied()) {
      return NextResponse.json({ error: "Rate limited. Retry shortly." }, { status: 429 });
    }
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    const category = searchParams.get("category");
    const since = searchParams.get("since");

    const whereClause: Prisma.FlaggedIdentifierWhereInput = {
      isActive: true,
    };

    if (category) {
      whereClause.category = category.toUpperCase() as Prisma.EnumScamCategoryFilter["equals"];
    }

    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        whereClause.createdAt = { gte: sinceDate };
      }
    }

    const threats = await db.flaggedIdentifier.findMany({
      where: whereClause,
      include: {
        report: {
          select: {
            slug: true,
            title: true,
            targetEntity: true,
            amountRequested: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    if (format === "csv") {
      const csvHeader =
        "ID,Type,NormalizedValue,RiskLevel,Category,TargetEntity,ReportSlug,CreatedAt\n";
      const csvRows = threats
        .map((t) => {
          const sanitizedTitle = (t.report?.targetEntity || "Unknown").replace(/"/g, '""');
          return `"${t.id}","${t.type}","${t.normalizedValue}","${t.riskLevel}","${t.category}","${sanitizedTitle}","${t.report?.slug || ""}","${t.createdAt.toISOString()}"`;
        })
        .join("\n");

      return new NextResponse(csvHeader + csvRows, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="checkam-threat-feed-${new Date().toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    // JSON Format response
    const payload = {
      feedVersion: "1.0",
      publisher: "CheckAm Cameroon Threat Intelligence",
      totalActiveThreats: threats.length,
      generatedAt: new Date().toISOString(),
      anticHotline: "8202",
      threats: threats.map((t) => ({
        id: t.id,
        identifierType: t.type,
        normalizedValue: t.normalizedValue,
        riskLevel: t.riskLevel,
        category: t.category,
        notes: t.notes,
        relatedCase: t.report
          ? {
              slug: t.report.slug,
              title: t.report.title,
              targetEntity: t.report.targetEntity,
              amountRequested: t.report.amountRequested,
            }
          : null,
        firstDetectedAt: t.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[Threat Feed Error]:", error);
    return NextResponse.json({ error: "Failed to generate threat feed" }, { status: 500 });
  }
}
