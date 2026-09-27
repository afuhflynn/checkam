"use client";

import { useTranslation } from "../../lib/i18n/context";

export function HowSection() {
  const { t } = useTranslation();

  // Filed exhibits, not countdown numerals: the order is a real process
  // (deposit, then rules, then receipts), so the filing labels carry it.
  const steps = [
    { file: t.howFile1, title: t.howStep1Title, desc: t.howStep1Desc },
    { file: t.howFile2, title: t.howStep2Title, desc: t.howStep2Desc },
    { file: t.howFile3, title: t.howStep3Title, desc: t.howStep3Desc },
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

      <ol className="grid grid-cols-1 md:grid-cols-3 gap-5 list-none">
        {steps.map((step, idx) => (
          <li
            key={step.file}
            className="relative overflow-hidden rounded-2xl border border-authority-900/10 bg-white shadow-sm"
          >
            <div className="quittance-stripes border-b border-slate-200/80 px-6 sm:px-7 py-2.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                {step.file}
              </span>
            </div>
            <div className="p-6 sm:p-7 pt-5">
              <span className="sr-only">{`${idx + 1} / ${steps.length}`}</span>
              <h3 className="text-lg font-bold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
