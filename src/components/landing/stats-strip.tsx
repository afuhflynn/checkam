"use client";

import { AlertTriangle, FileText, PhoneCall, ShieldCheck } from "lucide-react";
import { useTranslation } from "../../lib/i18n/context";
import type { LandingStats } from "./bulletin-bar";

export function StatsStrip({ stats }: { stats: LandingStats }) {
  const { language, t } = useTranslation();
  const locale = language === "fr" ? "fr-CM" : "en-CM";

  const metrics = [
    {
      value: stats.verifications.toLocaleString(locale),
      label: t.statsVerifiedLabel,
      icon: ShieldCheck,
      color: "text-emerald-600",
    },
    {
      value: stats.flagged.toLocaleString(locale),
      label: t.statsFlaggedLabel,
      icon: AlertTriangle,
      color: "text-red-600",
    },
    {
      value: stats.cases.toLocaleString(locale),
      label: t.statsCasesLabel,
      icon: FileText,
      color: "text-authority-800",
    },
    {
      value: "8202",
      label: t.statsHotlineLabel,
      icon: PhoneCall,
      color: "text-emerald-700",
    },
  ];

  return (
    <section className="border-y border-slate-200/80 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 text-center">
          {metrics.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="space-y-2 group cursor-default">
                <div className="flex items-center justify-center">
                  <Icon
                    className={`h-6 w-6 ${item.color} mb-1 opacity-80 group-hover:scale-110 transition-transform`}
                  />
                </div>
                <p className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-ink">
                  {item.value}
                </p>
                <p className="font-mono text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 max-w-[180px] mx-auto">
                  {item.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
