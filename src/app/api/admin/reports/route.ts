import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "../../../../inngest/client";
import { requireModerator } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { normalizeCameroonPhone } from "../../../../lib/rules/phone-normalizer";

const ModerateSchema = z.object({
  reportId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
  moderatorNotes: z.string().max(2000).optional(),
});

// GET: Fetch all reports for moderation queue (PENDING, APPROVED, REJECTED)
export async function GET(req: NextRequest) {
  try {
    await requireModerator();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PENDING";

    const reports = await db.scamReport.findMany({
      where: status === "ALL" ? {} : { status: status as "PENDING" | "APPROVED" | "REJECTED" },
      orderBy: { createdAt: "desc" },
      include: {
        flaggedIdentifiers: true,
      },
    });

    const stats = {
      pendingCount: await db.scamReport.count({ where: { status: "PENDING" } }),
      approvedCount: await db.scamReport.count({ where: { status: "APPROVED" } }),
      flaggedNumbersCount: await db.flaggedIdentifier.count({ where: { isActive: true } }),
      verificationsTotal: await db.scamVerification.count(),
    };

    return NextResponse.json({ success: true, reports, stats });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN_NOT_MODERATOR") {
      return NextResponse.json({ error: "Moderator sign-in required." }, { status: 403 });
    }
    console.error("[Admin API Error]:", error);
    return NextResponse.json({ error: "Failed to fetch admin data" }, { status: 500 });
  }
}

// POST: Moderate Report (APPROVE or REJECT)
export async function POST(req: NextRequest) {
  try {
    const moderator = await requireModerator();
    const rawBody: unknown = await req.json();
    const parsed = ModerateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid moderation payload" }, { status: 400 });
    }
    const { reportId, action, moderatorNotes } = parsed.data;

    if (action === "APPROVE") {
      const existing = await db.scamReport.findUnique({
        where: { id: reportId },
        include: { flaggedIdentifiers: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      const updated = await db.scamReport.update({
        where: { id: reportId },
        data: {
          status: "APPROVED",
          publishedAt: new Date(),
          moderatorNotes: moderatorNotes || `Approved by ${moderator.userId}`,
          moderatedById: moderator.userId === "dev-bypass" ? undefined : moderator.userId,
        },
      });

      // Activate all flagged identifiers attached to this report
      await db.flaggedIdentifier.updateMany({
        where: { reportId },
        data: { isActive: true },
      });

      // Auto-create flagged identifiers from phone/email when missing
      if (existing.flaggedIdentifiers.length === 0) {
        if (existing.contactPhone) {
          const parsedPhone = normalizeCameroonPhone(existing.contactPhone);
          if (parsedPhone.isValid) {
            await db.flaggedIdentifier.create({
              data: {
                type: "PHONE",
                value: existing.contactPhone,
                normalizedValue: parsedPhone.normalized,
                category: existing.category,
                reportId,
                isActive: true,
                notes: `Auto-flagged on approval: ${existing.title}`,
              },
            });
          }
        }
        if (existing.contactEmail) {
          const email = existing.contactEmail.toLowerCase().trim();
          if (email.includes("@")) {
            await db.flaggedIdentifier.create({
              data: {
                type: "EMAIL",
                value: existing.contactEmail,
                normalizedValue: email,
                category: existing.category,
                reportId,
                isActive: true,
                notes: `Auto-flagged on approval: ${existing.title}`,
              },
            });
          }
        }
      }

      // Trigger Threat Feed sync event
      await inngest.send({
        name: "threat-feed/sync.requested",
        data: {
          triggeredBy: "admin-approval",
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json({ success: true, report: updated });
    }

    if (action === "REJECT") {
      const updated = await db.scamReport.update({
        where: { id: reportId },
        data: {
          status: "REJECTED",
          moderatorNotes: moderatorNotes || `Rejected by ${moderator.userId}`,
          moderatedById: moderator.userId === "dev-bypass" ? undefined : moderator.userId,
        },
      });

      // Deactivate flagged identifiers
      await db.flaggedIdentifier.updateMany({
        where: { reportId },
        data: { isActive: false },
      });

      return NextResponse.json({ success: true, report: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN_NOT_MODERATOR") {
      return NextResponse.json({ error: "Moderator sign-in required." }, { status: 403 });
    }
    console.error("[Admin Action Error]:", error);
    return NextResponse.json({ error: "Failed to execute moderation action" }, { status: 500 });
  }
}
