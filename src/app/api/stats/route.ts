import { type NextRequest, NextResponse } from "next/server";
import { aj } from "../../../lib/arcjet";
import { db } from "../../../lib/db";

// Public landing stats - counts only, no personal data.
export async function GET(req: NextRequest) {
  try {
    const decision = await aj.protect(req, { requested: 1 });
    if (decision.isDenied()) {
      return NextResponse.json({ error: "Rate limited." }, { status: 429 });
    }

    const [verifications, flagged, cases, recentFlagged] = await Promise.all([
      db.scamVerification.count(),
      db.flaggedIdentifier.count({ where: { isActive: true } }),
      db.scamReport.count({ where: { status: "APPROVED" } }),
      db.flaggedIdentifier.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { normalizedValue: true, category: true },
      }),
    ]);

    return NextResponse.json(
      { verifications, flagged, cases, recentFlagged },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error("[Stats API Error]:", error);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 },
    );
  }
}
