"use client";

import { useTranslation } from "../../lib/i18n/context";

const INSTITUTIONS = [
  { acronym: "ANTIC", name: "Cybercriminalité • Hotline 8202" },
  { acronym: "MINPOSTEL", name: "Postes & Télécommunications" },
  { acronym: "MINFOPRA", name: "Fonction Publique & Concours" },
  { acronym: "MINESEC", name: "Enseignements Secondaires" },
  { acronym: "MTN MoMo", name: "Opérateur Agréé CMR" },
  { acronym: "Orange Money", name: "Opérateur Agréé CMR" },
  { acronym: "CamTel", name: "Opérateur National Télécoms" },
];

export function TrustStrip() {
  const { t } = useTranslation();

  return (
    <section className="border-y border-slate-200/80 bg-white/70 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-center space-y-6">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
          {t.trustTitle}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-10 sm:gap-x-14 gap-y-6">
          {INSTITUTIONS.map((inst) => (
            <div key={inst.acronym} className="flex flex-col items-center">
              <span className="font-display text-xl sm:text-2xl font-black tracking-tight text-slate-400">
                {inst.acronym}
              </span>
              <span className="font-mono text-[10px] font-semibold text-slate-400">
                {inst.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
