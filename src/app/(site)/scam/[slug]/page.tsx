import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { type DossierReport, ScamDossier } from "../../../../components/scam-dossier";
import { db } from "../../../../lib/db";
import { runRulesEngine } from "../../../../lib/rules/engine";
import { absoluteUrl } from "../../../../lib/app-url";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const report = await db.scamReport.findUnique({
    where: { slug },
  });

  if (!report) {
    return { title: "Dossier not found / Dossier introuvable | CheckAm" };
  }

  return {
    title: `🚨 Scam Alert / Alerte Arnaque: ${report.title} | CheckAm Cameroun`,
    description: report.description.slice(0, 160),
    openGraph: {
      title: `🚨 Scam Alert / Alerte Arnaque: ${report.title} | CheckAm`,
      description: report.description.slice(0, 160),
      url: absoluteUrl(`/scam/${report.slug}`),
      siteName: "CheckAm Cameroon",
    },
  };
}

export default async function ScamDossierPage({ params }: Props) {
  const { slug } = await params;

  const report = await db.scamReport.findUnique({
    where: { slug },
    include: {
      flaggedIdentifiers: true,
    },
  });

  if (!report) {
    notFound();
  }

  // Rules verdict computed server-side (language-neutral: bullets in EN + FR)
  const verification = runRulesEngine({
    text: `${report.title} ${report.description}`,
    claimedEntity: report.targetEntity,
    phoneNumbers: report.contactPhone ? [report.contactPhone] : [],
    emails: report.contactEmail ? [report.contactEmail] : [],
    amount: report.amountRequested,
    isKnownFlaggedInDb: true,
  });

  const dossier: DossierReport = {
    slug: report.slug,
    title: report.title,
    description: report.description,
    targetEntity: report.targetEntity,
    contactPhone: report.contactPhone,
    contactEmail: report.contactEmail,
    amountRequested: report.amountRequested,
    publishedAt: report.publishedAt ? report.publishedAt.toISOString() : null,
    createdAt: report.createdAt.toISOString(),
  };

  return (
    <ScamDossier
      report={dossier}
      verification={{
        verdict: verification.verdict,
        score: verification.score,
        category: verification.category,
        evidenceBullets: verification.evidenceBullets,
        whatsappWarning: verification.whatsappWarning,
        officialWebsite: verification.officialWebsite,
      }}
    />
  );
}
