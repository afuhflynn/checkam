"use client";

import { ArrowRight, ShieldCheck, Siren } from "lucide-react";
import Link from "next/link";
import { PRELOADED_DEMO_CASES } from "../demo-cases";
import { useTranslation } from "../../lib/i18n/context";
import { translations } from "../../lib/i18n/dictionary";
import { Button } from "../ui/button";
import type { LandingStats } from "./bulletin-bar";

function maskShort(value: string): string {
  if (value.includes("@")) return `•••@${value.split("@")[1] ?? ""}`;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) return value;
  return `+${digits.slice(0, 3)} •• •• ${digits.slice(-2)}`;
}

export function HeroSection({ stats }: { stats: LandingStats }) {
  const { language, t } = useTranslation();
  const echo = language === "fr" ? translations.en.heroHeading : translations.fr.heroHeading;
  const flagged = stats.recentFlagged[0] ?? null;

  return (
    <section className="bg-dots relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center relative">
        {/* Floating proof cards, desktop only */}
        <div
          aria-hidden="true"
          className="animate-float-soft pointer-events-none absolute left-0 top-16 hidden w-56 rotate-[-4deg] rounded-2xl border-2 border-authority-900/15 bg-white text-left shadow-2xl xl:block"
          style={{ "--float-rotate": "-4deg" } as React.CSSProperties}
        >
          <div className="quittance-stripes border-b border-slate-200 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Nº 07-MINE-CM
          </div>
          <div className="space-y-2.5 p-4">
            <span className="inline-flex rounded-md bg-red-600 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-white">
              {t.heroSealRisk}
            </span>
            <div className="stamp-rotated inline-block rounded-md border-2 border-red-700 px-2 py-0.5 font-mono text-[11px] font-black uppercase tracking-widest text-red-700">
              {t.heroSealScam}
            </div>
            <p className="font-mono text-[11px] font-bold text-slate-500">ANTIC 8202</p>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="animate-float-soft-late pointer-events-none absolute right-0 top-24 hidden w-60 rotate-[3deg] rounded-2xl border border-authority-900/10 bg-white p-4 text-left shadow-xl xl:block"
          style={{ "--float-rotate": "3deg" } as React.CSSProperties}
        >
          <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-red-700">
            <Siren className="h-3.5 w-3.5" />
            {flagged ? maskShort(flagged.normalizedValue) : "+237 •• •• 56"}
          </p>
          <p className="mt-1.5 text-xs font-semibold text-slate-600">
            {flagged ? flagged.category.replace(/_/g, " ") : t.bulletinBlacklisted}
          </p>
          <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] font-bold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            ANTIC 8202
          </p>
        </div>

        <p className="inline-flex items-center gap-2 rounded-full border border-authority-900/15 bg-white px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-authority-800 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          {t.heroKicker}
        </p>

        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-5xl sm:text-7xl font-extrabold leading-[1.02] tracking-tight text-ink">
          {t.heroHeadingA} {t.heroHeadingB}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl font-display text-xl sm:text-2xl italic text-slate-500" lang={language === "fr" ? "en" : "fr"}>
          {echo}
        </p>
        <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg leading-relaxed text-slate-600">
          {t.heroLede}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild type="button" size="lg" className="gap-2 bg-authority-950 hover:bg-authority-900 font-bold shadow-lg px-8">
            <Link href="/chat">
              {t.heroCtaChat}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild type="button" size="lg" variant="outline" className="font-bold px-8">
            <Link href="/directory">{t.heroCtaRegistry}</Link>
          </Button>
        </div>

        <div className="mt-10">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {t.heroTrialTitle}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {PRELOADED_DEMO_CASES.map((demo) => (
              <Button key={demo.id} asChild type="button" variant="outline" size="sm" className="font-semibold">
                <Link href={`/chat?q=${encodeURIComponent(demo.text.slice(0, 400))}`}>
                  {language === "fr" ? demo.titleFr : demo.titleEn}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
