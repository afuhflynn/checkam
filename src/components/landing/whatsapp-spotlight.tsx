"use client";

import { ArrowRight, CheckCircle2, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "../../lib/i18n/context";
import { Button } from "../ui/button";

export function WhatsAppSpotlight() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-emerald-50/20 to-white border-y border-slate-200/80 py-20 sm:py-28 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Value Proposition & Actions */}
          <div className="lg:col-span-6 space-y-6">
            <p className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-3.5 py-1 rounded-full">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              {t.waSpotlightBadge}
            </p>

            <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-ink leading-[1.08] text-balance">
              {t.waSpotlightTitle}
            </h2>

            <p className="font-sans text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              {t.waSpotlightSub}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Button
                asChild
                type="button"
                size="lg"
                variant="whatsapp"
                className="gap-2.5 font-sans font-bold shadow-xl px-7 py-6 rounded-2xl text-base"
              >
                <Link href="/whatsapp">
                  <MessageCircle className="h-5 w-5" />
                  {t.waSpotlightBtn}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>

              <Button
                asChild
                type="button"
                size="lg"
                variant="outline"
                className="font-sans font-bold px-7 py-6 rounded-2xl border-slate-300 text-slate-700 hover:text-ink hover:bg-slate-50 text-base"
              >
                <Link href="/chat">{t.waSpotlightWebAlt}</Link>
              </Button>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs text-slate-500">
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
            </div>
          </div>

          {/* Right Column: Realistic WhatsApp Phone Mockup */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-3xl border-4 border-slate-900 bg-slate-950 p-2 shadow-2xl shadow-emerald-950/10">
              {/* Phone Speaker Notch */}
              <div className="mx-auto h-4 w-28 rounded-full bg-slate-800 mb-2" />

              {/* Chat Viewport */}
              <div className="rounded-2xl bg-[#E5DDD5] overflow-hidden flex flex-col h-[460px]">
                {/* WhatsApp Chat Bar */}
                <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-500 text-white font-display font-black flex items-center justify-center shrink-0">
                    CA
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-sans font-bold text-sm leading-tight truncate">
                      <span>CheckAm Anti-Scam Bot</span>
                      <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0" />
                    </div>
                    <div className="font-mono text-[10px] text-emerald-200">
                      En ligne • Service National ANTIC
                    </div>
                  </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto font-sans text-xs">
                  {/* User Question */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-[#DCF8C6] p-3 text-slate-800 shadow-sm leading-relaxed">
                      <p className="font-mono text-[10px] text-slate-500 italic mb-1">
                        ↪ Transféré
                      </p>
                      <p>{t.waUserBubble}</p>
                      <div className="text-[10px] text-slate-400 text-right mt-1 font-mono">
                        10:24 ✓✓
                      </div>
                    </div>
                  </div>

                  {/* Bot Verified Answer */}
                  <div className="flex justify-start">
                    <div className="max-w-[88%] rounded-2xl rounded-tl-none bg-white p-3.5 text-slate-900 shadow-md border-l-4 border-red-500 space-y-2">
                      <div className="font-mono font-bold text-red-700 text-xs tracking-wide">
                        {t.waBotBubbleVerdict}
                      </div>
                      <div className="font-sans text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                        {t.waBotBubbleText}
                      </div>
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>CheckAm CMR • 8202</span>
                        <span>10:24</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Bottom Message Input */}
                <div className="bg-slate-100 px-3 py-2 flex items-center gap-2 border-t border-slate-200">
                  <div className="flex-1 bg-white rounded-full px-4 py-1.5 text-xs text-slate-400 border border-slate-200">
                    Transférez un message ou une photo...
                  </div>
                  <div className="h-8 w-8 rounded-full bg-[#075E54] flex items-center justify-center text-white shrink-0">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
