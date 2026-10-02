"use client";

import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "../../lib/i18n/context";
import { CLICK_TO_CHAT_ANCHOR_ID } from "../../lib/whatsapp/click-to-chat";
import { Button } from "../ui/button";
import { WhatsAppChatButton } from "../whatsapp/chat-button";
import type { LandingStats } from "./bulletin-bar";

export function HeroSection({ stats }: { stats: LandingStats }) {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden bg-ambient-radial pt-20 pb-20 sm:pt-28 sm:pb-32 lg:pt-36 lg:pb-36">
      {/* Concentric Subtle Orbit Lines (Deflexai Inspired) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <div className="orbit-ring h-[580px] w-[580px] sm:h-[720px] sm:w-[720px]" />
        <div className="orbit-ring h-[840px] w-[840px] sm:h-[1050px] sm:w-[1050px]" />
        <div className="orbit-ring h-[1100px] w-[1100px] sm:h-[1380px] sm:w-[1380px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        {/* Hero Headline - Fraunces Display */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-black text-ink tracking-tight text-balance leading-[1.02]">
            {t.heroMainTitle}
          </h1>

          {/* Subhead - Public Sans */}
          <p className="font-sans text-base sm:text-xl lg:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            {t.heroMainSubtitle}
          </p>
        </div>

        {/* Action Buttons - Clean, High-Contrast */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            type="button"
            size="lg"
            className="w-full sm:w-auto gap-2.5 bg-authority-950 hover:bg-authority-900 text-white font-sans font-bold shadow-xl shadow-authority-950/15 px-9 py-6 rounded-2xl text-base transition-transform hover:-translate-y-0.5"
          >
            <Link href="/chat">
              {t.heroCtaPrimary}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <WhatsAppChatButton id={CLICK_TO_CHAT_ANCHOR_ID} className="shadow-[#25D366]/25" />

          <Button
            asChild
            type="button"
            size="lg"
            variant="outline"
            className="w-full sm:w-auto font-sans font-bold px-8 py-6 rounded-2xl border-slate-300 text-slate-700 hover:text-ink hover:bg-white text-base"
          >
            <Link href="/directory">{t.heroCtaSecondary}</Link>
          </Button>
        </div>

        {/* Trust Perks Row */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 font-mono text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {t.heroPerkFree}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {t.heroPerkNoAccount}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {t.heroPerkInstant}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {t.heroPerkBilingual}
          </span>
        </div>
      </div>
    </section>
  );
}
