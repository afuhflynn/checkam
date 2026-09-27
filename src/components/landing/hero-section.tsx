"use client";

import { ArrowRight, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../lib/i18n/context";
import { translations } from "../../lib/i18n/dictionary";
import { Button } from "../ui/button";

const SPECIMEN_BULLETS_FR = [
  "Adresse Gmail gratuite au lieu d'un domaine *.gov.cm.",
  "25 000 FCFA vers un MoMo personnel, sans quittance du Trésor.",
  "Aucun arrêté ministériel, aucune diffusion CRTV.",
];

const SPECIMEN_BULLETS_EN = [
  "Free Gmail address instead of a *.gov.cm domain.",
  "25,000 FCFA to a personal MoMo, no Treasury receipt.",
  "No ministerial decree, no CRTV broadcast.",
];

export function HeroSection({ onVerify }: { onVerify: () => void }) {
  const { language, t } = useTranslation();
  const specimenBullets = language === "fr" ? SPECIMEN_BULLETS_FR : SPECIMEN_BULLETS_EN;
  // Bilingual echo: the other language's headline, set in italic serif.
  // In a bilingual country the translation is content, not decoration.
  const echo =
    language === "fr" ? translations.en.heroHeading : translations.fr.heroHeading;
  const sealRef = useRef<HTMLDivElement | null>(null);
  const [sealed, setSealed] = useState(false);

  useEffect(() => {
    const node = sealRef.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setSealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-14 sm:pt-16 sm:pb-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Editorial headline with bilingual echo */}
        <div className="lg:col-span-7 space-y-6">
          <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-authority-700">
            <span className="h-px w-8 bg-authority-700" aria-hidden="true" />
            {t.heroKicker}
          </p>

          <h1 className="font-display text-4xl sm:text-6xl font-black leading-[1.04] tracking-tight text-ink text-balance">
            {t.heroHeadingA}{" "}
            <em className="italic underline decoration-emerald-500 decoration-[0.08em] underline-offset-[0.12em]">
              {t.heroHeadingB}
            </em>
          </h1>
          <p className="font-display text-lg sm:text-xl italic text-slate-500" lang={language === "fr" ? "en" : "fr"}>
            {echo}
          </p>

          <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
            {t.heroLede}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              size="lg"
              onClick={onVerify}
              className="gap-2 bg-authority-950 hover:bg-authority-900 font-bold shadow-lg"
            >
              {t.heroCtaVerify}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button asChild type="button" size="lg" variant="outline" className="font-bold">
              <Link href="/directory">{t.heroCtaRegistry}</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <BadgeCheck className="h-3.5 w-3.5" />
              {t.heroNoteFree}
            </span>
            <span>{t.heroNoteNoAccount}</span>
            <span>{t.heroNoteBilingual}</span>
          </div>

          <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
            {t.heroTrustLabel} — PRC · MINFOPRA · MINESEC · ANTIC
          </p>
        </div>

        {/* Specimen receipt: badges speak the page language, the seal
            stamps once when scrolled into view */}
        <div className="lg:col-span-5" ref={sealRef}>
          <div className="relative mx-auto max-w-sm rotate-1 rounded-2xl border-2 border-authority-900/15 bg-white shadow-2xl overflow-hidden">
            <div className="quittance-stripes flex items-center justify-between gap-2 px-5 py-2 border-b border-slate-200 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <span>{t.heroReceiptTitle}</span>
              <span className="whitespace-nowrap">Nº 07-MINE-CM</span>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-white">
                  {t.heroSealRisk}
                </span>
                <span
                  className={`inline-block rounded-md border-2 border-red-700 px-2 py-0.5 font-mono text-[11px] font-black uppercase tracking-widest text-red-700 ${
                    sealed ? "stamp-in" : "opacity-0"
                  }`}
                  aria-hidden={!sealed}
                >
                  {t.heroSealScam}
                </span>
              </div>
              <div className="space-y-2.5">
                {specimenBullets.map((bullet, idx) => (
                  <div
                    key={bullet}
                    className="flex items-start gap-2.5 rounded-lg bg-slate-50 border border-slate-200/80 p-3"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-authority-900 font-mono text-[10px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <p className="text-xs font-medium leading-relaxed text-slate-700">{bullet}</p>
                  </div>
                ))}
              </div>
              <div className="perforated-edge" aria-hidden="true" />
              <div className="flex items-center justify-between font-mono text-[11px] font-bold">
                <span className="text-slate-500">ANTIC 8202 — {t.heroNoteFree}</span>
                <span className="text-emerald-700">wa.me →</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
