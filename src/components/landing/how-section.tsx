"use client";

import { useTranslation } from "../../lib/i18n/context";

export function HowSection() {
  const { t } = useTranslation();

  const steps = [
    { numeral: "01", title: t.howStep1Title, desc: t.howStep1Desc },
    { numeral: "02", title: t.howStep2Title, desc: t.howStep2Desc },
    { numeral: "03", title: t.howStep3Title, desc: t.howStep3Desc },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <div className="max-w-2xl space-y-3 mb-10">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-authority-700">
          {t.howKicker}
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-ink text-balance">
          {t.howTitle}
        </h2>
        <p className="text-sm sm:text-base text-slate-600">{t.howSub}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {steps.map((step) => (
          <article
            key={step.numeral}
            className="relative overflow-hidden rounded-2xl border border-authority-900/10 bg-white p-6 sm:p-7 shadow-sm"
          >
            <span
              className="font-display text-6xl font-black text-authority-100 select-none"
              aria-hidden="true"
            >
              {step.numeral}
            </span>
            <h3 className="mt-3 text-lg font-bold text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
