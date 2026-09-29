"use client";

import { ArrowRight, PhoneCall, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "../../lib/i18n/context";
import { Button } from "../ui/button";

export function CtaSection() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden bg-authority-950 text-white">
      {/* Subtle ambient lighting in background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-emerald-500/10 blur-3xl"
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32 text-center space-y-6">
        <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white text-balance leading-tight">
          {t.ctaTitle}
        </h2>

        <p className="font-sans text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {t.ctaSub}
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            type="button"
            size="lg"
            className="w-full sm:w-auto gap-2 bg-emerald-500 hover:bg-emerald-400 text-authority-950 font-sans font-bold px-8 py-6 rounded-2xl shadow-2xl text-base transition-transform hover:-translate-y-0.5"
          >
            <Link href="/chat">
              {t.ctaBtn}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            asChild
            type="button"
            size="lg"
            variant="outline"
            className="w-full sm:w-auto font-sans font-bold px-8 py-6 rounded-2xl border-white/20 text-white hover:bg-white/10 text-base"
          >
            <Link href="/directory">{t.heroCtaSecondary}</Link>
          </Button>
        </div>

        <div className="pt-6 flex items-center justify-center gap-2 font-mono text-xs text-slate-400">
          <PhoneCall className="h-3.5 w-3.5 text-emerald-400" />
          <span>Hotline Nationale ANTIC : 8202 (Appel gratuit)</span>
        </div>
      </div>
    </section>
  );
}
