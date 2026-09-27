"use client";

import { ArrowRight, Banknote, Calendar, Phone } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "../../lib/i18n/context";
import type { TranslationDictionary } from "../../lib/i18n/dictionary";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

export interface PreviewReport {
  slug: string;
  title: string;
  category: string;
  targetEntity: string | null;
  amountRequested: string | null;
  contactPhone: string | null;
  publishedAt: string | null;
  createdAt: string;
}

function categoryLabel(category: string, t: TranslationDictionary): string {
  switch (category) {
    case "CIVIL_SERVICE":
      return t.categoryCivilService;
    case "VISA_TRAVEL":
      return t.categoryVisa;
    case "MOBILE_MONEY":
      return t.categoryMoMo;
    case "INVESTMENT_PONZI":
      return t.categoryInvestment;
    case "ECOMMERCE":
      return t.categoryEcommerce;
    default:
      return t.categoryOther;
  }
}

export function RegistryPreview({ reports }: { reports: PreviewReport[] }) {
  const { language, t } = useTranslation();
  const locale = language === "fr" ? "fr-CM" : "en-CM";

  if (reports.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl space-y-3">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-authority-700">
            {t.regKicker}
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-ink text-balance">
            {t.regTitle}
          </h2>
          <p className="text-sm text-slate-600">{t.regSub}</p>
        </div>
        <Button asChild variant="outline" className="shrink-0 font-bold gap-1.5">
          <Link href="/directory">
            {t.regCta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {reports.map((report) => (
          <Card
            key={report.slug}
            className="flex flex-col justify-between border border-authority-900/10 bg-white hover:border-authority-400 hover:shadow-md transition-all"
          >
            <CardContent className="p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5">
                  {categoryLabel(report.category, t)}
                </span>
                {report.targetEntity && (
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {report.targetEntity}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-ink leading-snug line-clamp-2">{report.title}</h3>
              <div className="font-mono text-xs text-slate-500 space-y-1.5 pt-1">
                {report.contactPhone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    {report.contactPhone}
                  </p>
                )}
                {report.amountRequested && (
                  <p className="flex items-center gap-1.5">
                    <Banknote className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    {report.amountRequested}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Calendar className="h-3 w-3" />
                  {new Date(report.publishedAt ?? report.createdAt).toLocaleDateString(locale)}
                </span>
                <Link
                  href={`/scam/${report.slug}`}
                  className="text-xs font-bold text-authority-800 hover:text-authority-950 inline-flex items-center gap-1"
                >
                  {t.regViewDossier}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
