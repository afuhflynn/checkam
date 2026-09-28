"use client";

import type React from "react";
import { useTranslation } from "../../lib/i18n/context";

export function DeskSection({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();

  return (
    <section
      id="desk"
      className="relative overflow-hidden bg-authority-950 scroll-mt-20"
    >
      <div
        className="quittance-stripes pointer-events-none absolute inset-x-0 top-0 h-2 opacity-60"
        aria-hidden="true"
      />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 space-y-8">
        <div className="text-center space-y-3">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-400">
            {t.deskKicker} - {t.deskFileNo}
          </p>
          <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-white text-balance">
            {t.deskTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            {t.deskSub}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}
