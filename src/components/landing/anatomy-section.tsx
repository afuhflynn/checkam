"use client";

import { useState } from "react";
import { useTranslation } from "../../lib/i18n/context";
import type { Language } from "../../lib/i18n/dictionary";

interface Segment {
  en: string;
  fr: string;
  flag?: number;
}

interface Flag {
  n: number;
  titleEn: string;
  titleFr: string;
  descEn: string;
  descFr: string;
  ruleEn: string;
  ruleFr: string;
}

interface AnatomyCase {
  id: "minesec" | "momo" | "visa";
  message: Segment[];
  flags: Flag[];
}

const CASES: AnatomyCase[] = [
  {
    id: "minesec",
    message: [
      {
        en: "OFFICIAL NOTICE - Direct recruitment of 325 teachers (MINESEC), session 2025. ",
        fr: "COMMUNIQUÉ - Recrutement direct de 325 instituteurs (MINESEC), session 2025. ",
        flag: 3,
      },
      {
        en: "Application fee: 25,000 FCFA via Orange Money to 699 12 34 56. ",
        fr: "Frais de dossier : 25 000 FCFA par Orange Money au 699 12 34 56. ",
        flag: 2,
      },
      {
        en: "Send your files to minesec.recrutement2025@gmail.com. ",
        fr: "Envoyez vos dossiers à minesec.recrutement2025@gmail.com. ",
        flag: 1,
      },
      {
        en: "Deadline: 48 hours. Limited places, hurry.",
        fr: "Date limite : 48 heures. Places limitées, dépêchez-vous.",
        flag: 4,
      },
    ],
    flags: [
      {
        n: 1,
        titleEn: "A Gmail address for a ministry",
        titleFr: "Une adresse Gmail pour un ministère",
        descEn:
          "No Cameroonian ministry recruits through @gmail.com. Official mail lives on *.gov.cm.",
        descFr:
          "Aucun ministère camerounais ne recrute via @gmail.com. Le courrier officiel vit sur *.gov.cm.",
        ruleEn: "Free-email impersonation",
        ruleFr: "Usurpation par email gratuit",
      },
      {
        n: 2,
        titleEn: "An official fee to a personal MoMo",
        titleFr: "Un frais officiel vers un MoMo personnel",
        descEn:
          "Concours fees are paid to the Public Treasury against a quittance - never to a personal Orange Money number.",
        descFr:
          "Les frais de concours se paient au Trésor Public contre quittance - jamais vers un numéro Orange Money personnel.",
        ruleEn: "Treasury-only payments",
        ruleFr: "Paiements au Trésor uniquement",
      },
      {
        n: 3,
        titleEn: "“Direct recruitment”, no concours",
        titleFr: "« Recrutement direct », sans concours",
        descEn:
          "Civil-service entry is by competitive exam or presidential decree - announced on CRTV, never WhatsApp.",
        descFr:
          "L'entrée à la fonction publique se fait par concours ou décret présidentiel - annoncé à la CRTV, jamais sur WhatsApp.",
        ruleEn: "Concours-only entry",
        ruleFr: "Entrée par concours uniquement",
      },
      {
        n: 4,
        titleEn: "48-hour pressure",
        titleFr: "Pression des 48 heures",
        descEn:
          "Artificial urgency blocks verification. Genuine decrees give candidates weeks, not hours.",
        descFr:
          "L'urgence artificielle empêche toute vérification. Les vrais arrêtés donnent des semaines aux candidats, pas des heures.",
        ruleEn: "Urgency pattern",
        ruleFr: "Motif d'urgence",
      },
    ],
  },
  {
    id: "momo",
    message: [
      {
        en: "Transfer successful: you received 75,000 FCFA from NKODO PIERRE. ",
        fr: "Transfert réussi : vous avez reçu 75 000 FCFA de NKODO PIERRE. ",
        flag: 1,
      },
      {
        en: "Forgive me my brother, a mistaken transfer for my mother's medicine - ",
        fr: "Pardon mon frère, erreur de transfert pour les médicaments de ma mère - ",
        flag: 2,
      },
      {
        en: "please urgently send the 75,000 FCFA back to this same number.",
        fr: "veuillez renvoyer d'urgence les 75 000 FCFA sur ce même numéro.",
        flag: 3,
      },
    ],
    flags: [
      {
        n: 1,
        titleEn: "An unverifiable receipt",
        titleFr: "Un reçu invérifiable",
        descEn:
          "Only your real operator balance - #150# or *126# - proves a transfer. SMS text proves nothing.",
        descFr:
          "Seul votre solde réel chez l'opérateur - #150# ou *126# - prouve un transfert. Un SMS ne prouve rien.",
        ruleEn: "Balance-check rule",
        ruleFr: "Règle du solde réel",
      },
      {
        n: 2,
        titleEn: "An emotional emergency",
        titleFr: "Une urgence émotionnelle",
        descEn:
          "Sick relatives, accidents, blessings - the story exists to switch off your suspicion.",
        descFr:
          "Parents malades, accidents, bénédictions - l'histoire existe pour éteindre votre méfiance.",
        ruleEn: "Emotion-bait pattern",
        ruleFr: "Motif d'appât émotionnel",
      },
      {
        n: 3,
        titleEn: "“Send it back to this number”",
        titleFr: "« Renvoyez sur ce numéro »",
        descEn:
          "That instruction IS the theft: the incoming transfer never existed, your resend is real money.",
        descFr:
          "Cette instruction EST le vol : le transfert entrant n'a jamais existé, votre renvoi est de l'argent réel.",
        ruleEn: "Reversal fraud",
        ruleFr: "Arnaque au faux virement",
      },
    ],
  },
  {
    id: "visa",
    message: [
      {
        en: "EXPRESS CANADA VISA IN 14 DAYS - GUARANTEED. ",
        fr: "VISA CANADA EXPRESS EN 14 JOURS - GARANTI. ",
        flag: 1,
      },
      {
        en: "Salary 2,500,000 FCFA/month, flight + housing offered, no French test required. ",
        fr: "Salaire 2 500 000 FCFA/mois, billet + logement offerts, aucun test de français exigé. ",
        flag: 2,
      },
      {
        en: "Express stamp fee: 150,000 FCFA via MTN MoMo to 677 44 55 66 - visa.canada.immigration.express@gmail.com.",
        fr: "Frais de timbre express : 150 000 FCFA par MTN MoMo au 677 44 55 66 - visa.canada.immigration.express@gmail.com.",
        flag: 3,
      },
    ],
    flags: [
      {
        n: 1,
        titleEn: "A guaranteed visa on a deadline",
        titleFr: "Un visa garanti avec délai",
        descEn:
          "No state on earth guarantees visas in 14 days. Embassy timelines are months, never promises.",
        descFr:
          "Aucun État au monde ne garantit un visa en 14 jours. Les délais d'ambassade sont des mois, jamais des promesses.",
        ruleEn: "Guarantee pattern",
        ruleFr: "Motif de garantie",
      },
      {
        n: 2,
        titleEn: "The too-perfect bundle",
        titleFr: "L'offre trop parfaite",
        descEn:
          "Dream salary, free flight, free housing, zero requirements - every extra gift lowers your guard.",
        descFr:
          "Salaire de rêve, vol offert, logement gratuit, zéro exigence - chaque cadeau supplémentaire abaisse votre garde.",
        ruleEn: "Too-good-to-be-true",
        ruleFr: "Trop beau pour être vrai",
      },
      {
        n: 3,
        titleEn: "Upfront MoMo + Gmail embassy",
        titleFr: "MoMo d'avance + ambassade Gmail",
        descEn:
          "Real visa fees go to TLS/VFS centers with receipts. Embassies never collect via personal MoMo or Gmail.",
        descFr:
          "Les vrais frais de visa vont aux centres TLS/VFS avec reçus. Les ambassades n'encaissent jamais via MoMo personnel ou Gmail.",
        ruleEn: "Advance-fee + free email",
        ruleFr: "Frais d'avance + email gratuit",
      },
    ],
  },
];

function pick(lang: Language, en: string, fr: string): string {
  return lang === "fr" ? fr : en;
}

function getCase(id: AnatomyCase["id"]): AnatomyCase {
  const found = CASES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown anatomy case: ${id}`);
  return found;
}

export function AnatomySection() {
  const { language, t } = useTranslation();
  const [activeCase, setActiveCase] = useState<AnatomyCase["id"]>("minesec");
  const [activeFlag, setActiveFlag] = useState<number | null>(null);

  const current = getCase(activeCase);
  const tabs = [
    { id: "minesec" as const, label: t.anatomyTabMinesec },
    { id: "momo" as const, label: t.anatomyTabMomo },
    { id: "visa" as const, label: t.anatomyTabVisa },
  ];

  return (
    <section className="border-y border-authority-900/10 bg-paper-deep">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="max-w-2xl space-y-3 mb-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-authority-700">
            {t.anatomyKicker}
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-ink text-balance">
            {t.anatomyTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-600">{t.anatomySub}</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveCase(tab.id);
                setActiveFlag(null);
              }}
              className={`rounded-xl px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                activeCase === tab.id
                  ? "bg-authority-950 text-white shadow-md"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-authority-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* The message, with numbered exhibits */}
          <div className="rounded-2xl border border-authority-900/10 bg-white p-6 sm:p-7 shadow-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">
              Exhibit A - {tabs.find((x) => x.id === activeCase)?.label}
            </p>
            <p className="font-mono text-[13px] leading-[2] text-slate-800">
              {current.message.map((seg) => (
                <button
                  key={seg.en}
                  type="button"
                  onMouseEnter={() => setActiveFlag(seg.flag ?? null)}
                  onMouseLeave={() => setActiveFlag(null)}
                  onFocus={() => setActiveFlag(seg.flag ?? null)}
                  onBlur={() => setActiveFlag(null)}
                  onClick={() => setActiveFlag(seg.flag ?? null)}
                  className={`rounded px-1 py-0.5 font-inherit text-left transition-colors ${
                    seg.flag != null && activeFlag === seg.flag
                      ? "bg-red-600 text-white"
                      : seg.flag != null
                        ? "bg-red-100 text-red-900"
                        : "bg-transparent"
                  }`}
                >
                  {pick(language, seg.en, seg.fr)}
                  {seg.flag != null && (
                    <sup className="ml-0.5 font-bold">{seg.flag}</sup>
                  )}
                </button>
              ))}
            </p>
          </div>

          {/* The flags */}
          <div className="space-y-3">
            {current.flags.map((flag) => {
              const isActive = activeFlag === flag.n;
              return (
                <button
                  key={flag.n}
                  type="button"
                  onMouseEnter={() => setActiveFlag(flag.n)}
                  onMouseLeave={() => setActiveFlag(null)}
                  onClick={() => setActiveFlag(isActive ? null : flag.n)}
                  className={`w-full text-left rounded-2xl border p-4 sm:p-5 transition-all ${
                    isActive
                      ? "border-red-500 bg-white shadow-md"
                      : "border-authority-900/10 bg-white/70 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold text-white transition-colors ${
                        isActive ? "bg-red-600" : "bg-authority-900"
                      }`}
                    >
                      {flag.n}
                    </span>
                    <span className="font-bold text-ink text-sm sm:text-base">
                      {pick(language, flag.titleEn, flag.titleFr)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {pick(language, flag.descEn, flag.descFr)}
                  </p>
                  <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-wider text-red-700">
                    {t.anatomyRuleLabel}:{" "}
                    {pick(language, flag.ruleEn, flag.ruleFr)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
