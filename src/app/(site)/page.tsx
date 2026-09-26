import { LandingPage } from "../../components/landing-page";
import type { PreviewReport } from "../../components/landing/registry-preview";
import { db } from "../../lib/db";

export const revalidate = 120;

export default async function HomePage() {
  const [verifications, flagged, cases, latest] = await Promise.all([
    db.scamVerification.count(),
    db.flaggedIdentifier.count({ where: { isActive: true } }),
    db.scamReport.count({ where: { status: "APPROVED" } }),
    db.scamReport.findMany({
      where: { status: "APPROVED" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: {
        slug: true,
        title: true,
        category: true,
        targetEntity: true,
        amountRequested: true,
        contactPhone: true,
        publishedAt: true,
        createdAt: true,
      },
    }),
  ]);

  const recentFlagged = await db.flaggedIdentifier.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { normalizedValue: true, category: true },
  });

  const reports: PreviewReport[] = latest.map((r) => ({
    slug: r.slug,
    title: r.title,
    category: r.category,
    targetEntity: r.targetEntity,
    amountRequested: r.amountRequested,
    contactPhone: r.contactPhone,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return <LandingPage stats={{ verifications, flagged, cases, recentFlagged }} reports={reports} />;
}
