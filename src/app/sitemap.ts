import type { MetadataRoute } from "next";
import { db } from "../lib/db";

const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dossiers = await db.scamReport
    .findMany({
      where: { status: "APPROVED" },
      orderBy: { publishedAt: "desc" },
      take: 500,
      select: { slug: true, updatedAt: true },
    })
    .catch(() => []);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/chat`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/directory`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/report`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/whatsapp`, changeFrequency: "monthly", priority: 0.6 },
    ...dossiers.map((dossier) => ({
      url: `${base}/scam/${dossier.slug}`,
      lastModified: dossier.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
