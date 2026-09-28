"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslation } from "../../lib/i18n/context";
import type { LandingStats } from "./bulletin-bar";

const ENTITIES = ["PRC", "MINFOPRA", "MINESEC", "ANTIC"];

// Social proof strip: live counters from the registry plus the official
// entities every verdict is cross checked against. Real numbers only,
// no invented logos.
export function ProofStrip({ stats }: { stats: LandingStats }) {
  const { language, t } = useTranslation();
  const locale = language === "fr" ? "fr-CM" : "en-CM";

  const figures = [
    { value: stats.verifications, label: t.bulletinVerified },
    { value: stats.flagged, label: t.bulletinBlacklisted },
    { value: stats.cases, label: t.bulletinCases },
  ];

  return (
    <section className="border-y border-authority-900/10 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 text-center space-y-6">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-authority-700">
          {t.proofKicker}
        </p>
        <div className="flex flex-wrap items-end justify-center gap-x-12 gap-y-6">
          {figures.map((figure) => (
            <div key={figure.label} className="space-y-1">
              <p className="font-display text-4xl sm:text-5xl font-black tracking-tight text-ink">
                {figure.value.toLocaleString(locale)}
              </p>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {figure.label}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2">
          <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t.heroTrustLabel}
          </span>
          {ENTITIES.map((entity) => (
            <span
              key={entity}
              className="font-display text-lg font-black tracking-tight text-slate-300"
              aria-hidden="true"
            >
              {entity}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
