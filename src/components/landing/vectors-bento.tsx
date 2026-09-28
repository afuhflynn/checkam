"use client";

import { Award, Briefcase, CreditCard, Plane, ShieldAlert } from "lucide-react";
import { useTranslation } from "../../lib/i18n/context";

export function VectorsBentoSection() {
  const { t } = useTranslation();

  const vectors = [
    {
      id: "concours",
      badge: t.bento1Badge,
      title: t.bento1Title,
      desc: t.bento1Desc,
      rule: t.bento1Rule,
      icon: Briefcase,
      color: "border-red-200 hover:border-red-400/80 bg-white",
      badgeColor: "bg-red-50 text-red-700 border-red-200",
      accentIcon: "text-red-600 bg-red-50",
    },
    {
      id: "momo",
      badge: t.bento2Badge,
      title: t.bento2Title,
      desc: t.bento2Desc,
      rule: t.bento2Rule,
      icon: CreditCard,
      color: "border-amber-200 hover:border-amber-400/80 bg-white",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      accentIcon: "text-amber-600 bg-amber-50",
    },
    {
      id: "visa",
      badge: t.bento3Badge,
      title: t.bento3Title,
      desc: t.bento3Desc,
      rule: t.bento3Rule,
      icon: Plane,
      color: "border-blue-200 hover:border-blue-400/80 bg-white",
      badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
      accentIcon: "text-blue-600 bg-blue-50",
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
      {/* Section Header with Generous Negative Space */}
      <div className="max-w-3xl space-y-4 mb-14 sm:mb-16">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-authority-700">
          {t.bentoKicker}
        </p>
        <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-ink text-balance leading-tight">
          {t.bentoTitle}
        </h2>
        <p className="font-sans text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
          {t.bentoSub}
        </p>
      </div>

      {/* 3-Card Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {vectors.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`flex flex-col justify-between rounded-3xl border-2 p-7 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 ${item.color}`}
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`font-mono text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                  <div
                    className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${item.accentIcon}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <h3 className="font-display text-xl sm:text-2xl font-black text-ink leading-snug">
                  {item.title}
                </h3>

                <p className="font-sans text-sm sm:text-base text-slate-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              {/* The Golden Rule Box */}
              <div className="mt-8 pt-5 border-t border-slate-100">
                <div className="rounded-2xl bg-slate-50/90 border border-slate-200/80 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-authority-800">
                    <ShieldAlert className="h-3.5 w-3.5 text-authority-700" />
                    <span>CheckAm Directive</span>
                  </div>
                  <p className="font-sans text-xs text-slate-700 leading-relaxed font-medium">
                    {item.rule}
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
