"use client";

import type React from "react";
import { useTranslation } from "../../lib/i18n/context";

export function DeskSection({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();

  return (
    <section id="desk" className="relative overflow-hidden bg-authority-950 scroll-mt-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(600px 300px at 20% 0%, rgba(16,185,129,0.18), transparent 70%), radial-gradient(500px 260px at 85% 100%, rgba(96,140,190,0.16), transparent 70%)",
        }}
      />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20 space-y-8">
        <div className="text-center space-y-3">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-400">
            {t.deskKicker}
          </p>
          <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-white text-balance">
            {t.deskTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">{t.deskSub}</p>
        </div>
        {children}
      </div>
    </section>
  );
}
