"use client";

import { ArrowRight, Banknote, Calendar, Phone, ShieldAlert } from "lucide-react";
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
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 sm:mb-16">
        <div className="max-w-2xl space-y-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-authority-700">
            {t.regKicker}
          </p>
          <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-ink text-balance leading-tight">
            {t.regTitle}
          </h2>
          <p className="font-sans text-base sm:text-lg text-slate-600 leading-relaxed">
            {t.regSub}
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          size="lg"
          className="shrink-0 font-sans font-bold gap-2 rounded-2xl border-slate-300 px-6 py-5 text-sm"
        >
          <Link href="/directory">
            {t.regCta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {reports.map((report) => (
          <Card
            key={report.slug}
            className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white hover:border-authority-300 hover:shadow-xl transition-all duration-300 overflow-hidden group"
          >
            <CardContent className="p-7 sm:p-8 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-red-700 bg-red-50 border border-red-200 rounded-full px-3 py-1">
                  {categoryLabel(report.category, t)}
                </span>
                {report.targetEntity && (
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {report.targetEntity}
                  </span>
                )}
              </div>

              <h3 className="font-display text-lg sm:text-xl font-black text-ink leading-snug line-clamp-2 group-hover:text-authority-900 transition-colors">
                {report.title}
              </h3>

              <div className="font-mono text-xs text-slate-500 space-y-2 pt-2">
                {report.contactPhone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>{report.contactPhone}</span>
                  </p>
                )}
                {report.amountRequested && (
                  <p className="flex items-center gap-2">
                    <Banknote className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span className="text-red-700 font-bold">{report.amountRequested}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                  <Calendar className="h-3 w-3" />
                  {new Date(report.publishedAt ?? report.createdAt).toLocaleDateString(locale)}
                </span>
                <Link
                  href={`/scam/${report.slug}`}
                  className="font-sans text-xs font-bold text-authority-800 hover:text-authority-950 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                >
                  <span>{t.regViewDossier}</span>
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
