"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "../../lib/i18n/context";

export function FaqSection() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(0);

  const items = [
    { q: t.faqQ1, a: t.faqA1 },
    { q: t.faqQ2, a: t.faqA2 },
    { q: t.faqQ3, a: t.faqA3 },
    { q: t.faqQ4, a: t.faqA4 },
  ];

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20">
      <div className="space-y-3 mb-8 text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-authority-700">
          {t.faqKicker}
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-ink">
          {t.faqTitle}
        </h2>
      </div>

      <div className="divide-y divide-authority-900/10 rounded-2xl border border-authority-900/10 bg-white shadow-sm overflow-hidden">
        {items.map((item, idx) => {
          const isOpen = open === idx;
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : idx)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 sm:px-6 py-4 text-left"
              >
                <span className="font-display text-base sm:text-lg font-bold text-ink">
                  {item.q}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-transform duration-300 ${
                    isOpen
                      ? "rotate-45 bg-authority-950 text-white border-authority-950"
                      : "border-slate-300 text-slate-500"
                  }`}
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-5 sm:px-6 pb-5 text-sm leading-relaxed text-slate-600">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
