"use client";

import {
  AlertOctagon,
  ArrowLeft,
  Calendar,
  CreditCard,
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
  Share2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "../lib/i18n/context";
import type { VerificationResult } from "../lib/rules/engine";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";

export interface DossierReport {
  slug: string;
  title: string;
  description: string;
  targetEntity: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  amountRequested: string | null;
  publishedAt: string | null;
  createdAt: string;
}

interface ScamDossierProps {
  report: DossierReport;
  verification: Pick<
    VerificationResult,
    | "verdict"
    | "score"
    | "category"
    | "evidenceBullets"
    | "whatsappWarning"
    | "officialWebsite"
  >;
}

export function ScamDossier({ report, verification }: ScamDossierProps) {
  const { language, t } = useTranslation();
  const bullets =
    language === "fr"
      ? verification.evidenceBullets.fr
      : verification.evidenceBullets.en;
  const whatsappAlert =
    language === "fr"
      ? verification.whatsappWarning.fr
      : verification.whatsappWarning.en;
  const locale = language === "fr" ? "fr-CM" : "en-CM";
  const publishedLabel = new Date(
    report.publishedAt ?? report.createdAt,
  ).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1.5 text-slate-600 hover:text-authority-950 font-semibold"
        >
          <Link href="/directory">
            <ArrowLeft className="h-4 w-4" />
            <span>{t.dossierBack}</span>
          </Link>
        </Button>
      </div>

      {/* Case Header Card */}
      <Card className="border-2 border-red-300 bg-white shadow-xl overflow-hidden">
        <div className="quittance-stripes flex items-center justify-between px-6 sm:px-8 py-2 bg-white border-b border-slate-200 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          <span className="truncate">
            {t.dossierBadge} - Nº {report.slug.slice(0, 18).toUpperCase()}
          </span>
          <span className="whitespace-nowrap pl-3">ANTIC 8202</span>
        </div>
        <CardHeader className="bg-red-50/80 p-6 sm:p-8 border-b border-red-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge
              variant="scam"
              className="text-xs px-3 py-1 uppercase tracking-wide"
            >
              <AlertOctagon className="h-4 w-4 mr-1.5 inline" />
              {t.dossierBadge}
            </Badge>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {t.dossierPublished} {publishedLabel}
              </span>
            </div>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-black text-authority-950 tracking-tight leading-tight">
            {report.title}
          </h1>

          {report.targetEntity && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800">
              <span>{t.dossierEntityImpersonated}</span>
              <span className="text-red-700 font-extrabold">
                {report.targetEntity}
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-8">
          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              {t.dossierFactsTitle}
            </h3>
            <p className="text-base text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              {report.description}
            </p>
          </div>

          {/* Flagged Identifiers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {report.contactPhone && (
              <div className="p-4 rounded-xl bg-red-50/50 border border-red-200 space-y-1">
                <span className="text-xs font-bold text-red-800 uppercase flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {t.dossierSuspectNumber}
                </span>
                <p className="text-base font-mono font-bold text-slate-950">
                  {report.contactPhone}
                </p>
              </div>
            )}

            {report.contactEmail && (
              <div className="p-4 rounded-xl bg-red-50/50 border border-red-200 space-y-1">
                <span className="text-xs font-bold text-red-800 uppercase flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {t.dossierFakeEmail}
                </span>
                <p className="text-base font-mono font-bold text-slate-950">
                  {report.contactEmail}
                </p>
              </div>
            )}

            {report.amountRequested && (
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-1">
                <span className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />{" "}
                  {t.dossierAmountDemanded}
                </span>
                <p className="text-base font-mono font-bold text-slate-950">
                  {report.amountRequested}
                </p>
              </div>
            )}
          </div>

          {/* Key Evidence Points from Rules Engine */}
          <div className="space-y-3 pt-2">
            <h3 className="font-display text-lg font-black text-authority-950 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              {t.dossierEvidenceTitle}
            </h3>

            <div className="space-y-2.5">
              {bullets.map((bullet, idx) => (
                <div
                  key={`evidence-${bullet.slice(0, 30)}-${idx}`}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80"
                >
                  <div className="h-6 w-6 rounded-full bg-red-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-sm font-medium text-slate-800 leading-relaxed">
                    {bullet}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Official Hotline Callout */}
          <div className="p-4 rounded-xl bg-authority-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                {t.dossierAnticTitle}
              </div>
              <p className="text-xs text-slate-300">{t.dossierAnticDesc}</p>
            </div>

            <span className="px-4 py-2 rounded-lg bg-emerald-500 text-authority-950 font-black text-sm shrink-0">
              {t.dossierHotlineBadge}
            </span>
          </div>

          {/* WhatsApp Warning Forward Box */}
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/40 p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-base">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
              {t.dossierAlertTitle}
            </div>
            <p className="text-xs text-slate-600">{t.dossierAlertDesc}</p>

            <div className="p-3.5 rounded-xl bg-white border border-emerald-200 font-mono text-xs text-slate-700 whitespace-pre-line leading-relaxed select-all">
              {whatsappAlert}
            </div>

            <div className="pt-2">
              <Button
                asChild
                variant="whatsapp"
                size="lg"
                className="w-full sm:w-auto font-bold gap-2"
              >
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(whatsappAlert)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Share2 className="h-4 w-4" />
                  {t.dossierForwardBtn}
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
