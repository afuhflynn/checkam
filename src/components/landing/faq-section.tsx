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
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
      <div className="space-y-4 mb-12 sm:mb-16 text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-authority-700">
          {t.faqKicker}
        </p>
        <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-ink">
          {t.faqTitle}
        </h2>
      </div>

      <div className="space-y-4">
        {items.map((item, idx) => {
          const isOpen = open === idx;
          return (
            <div
              key={item.q}
              className="rounded-3xl border border-slate-200/90 bg-white shadow-sm overflow-hidden transition-all duration-200 hover:border-authority-300"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : idx)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-6 sm:px-8 py-6 text-left"
              >
                <span className="font-display text-lg sm:text-xl font-bold text-ink">{item.q}</span>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                    isOpen
                      ? "rotate-45 bg-authority-950 text-white border-authority-950"
                      : "border-slate-200 text-slate-500 bg-slate-50"
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
                  <p className="px-6 sm:px-8 pb-6 pt-1 font-sans text-sm sm:text-base leading-relaxed text-slate-600">
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
