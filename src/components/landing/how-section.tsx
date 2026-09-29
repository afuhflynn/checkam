"use client";

import { FileSearch, MessageSquareWarning, ShieldCheck } from "lucide-react";
import { useTranslation } from "../../lib/i18n/context";

export function HowSection() {
  const { t } = useTranslation();

  const steps = [
    {
      num: "01",
      icon: FileSearch,
      title: t.howStep1Title,
      desc: t.howStep1Desc,
    },
    {
      num: "02",
      icon: ShieldCheck,
      title: t.howStep2Title,
      desc: t.howStep2Desc,
    },
    {
      num: "03",
      icon: MessageSquareWarning,
      title: t.howStep3Title,
      desc: t.howStep3Desc,
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
      <div className="max-w-3xl space-y-4 mb-14 sm:mb-16">
        <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-ink text-balance leading-tight">
          {t.howTitle}
        </h2>
        <p className="font-sans text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
          {t.howSub}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-sm"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-3xl font-black text-slate-300 ">
                    {step.num}
                  </span>
                  <div className="h-11 w-11 rounded-2xl bg-authority-50 text-authority-900 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-display text-xl sm:text-2xl font-black text-ink leading-snug">
                    {step.title}
                  </h3>
                  <p className="font-sans text-sm sm:text-base leading-relaxed text-slate-600">
                    {step.desc}
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
