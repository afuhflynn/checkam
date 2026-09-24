"use client";

import { AlertCircle, ArrowRight, BookOpenCheck, CreditCard, Plane } from "lucide-react";
import React from "react";
import { useTranslation } from "../lib/i18n/context";

export interface DemoCase {
  id: string;
  titleEn: string;
  titleFr: string;
  category: "CIVIL_SERVICE" | "MOBILE_MONEY" | "VISA_TRAVEL";
  text: string;
  icon: typeof BookOpenCheck;
  highlightText: string;
}

export const PRELOADED_DEMO_CASES: DemoCase[] = [
  {
    id: "demo-minesec",
    titleEn: "Fake MINESEC 325 Teachers Flyer",
    titleFr: "Faux avis MINESEC des 325 instituteurs",
    category: "CIVIL_SERVICE",
    icon: BookOpenCheck,
    highlightText: "minesec.recrutement2025@gmail.com • 25 000 FCFA MoMo",
    text: `COMMUNIQUÉ OFFICIEL DU MINISTÈRE DES ENSEIGNEMENTS SECONDAIRES (MINESEC).
Dans le cadre du programme spécial d'urgence, le Ministre lance le recrutement direct de 325 instituteurs et professeurs de l'enseignement secondaire session 2025.
Les candidats intéressés doivent envoyer leur dossier complet ainsi que les frais d'étude de dossier de 25 000 FCFA par Orange Money au numéro du régisseur: 699 12 34 56.
Date limite: 15 Mars 2025.
Email de réception des dossiers: minesec.recrutement2025@gmail.com`,
  },
  {
    id: "demo-momo",
    titleEn: "75,000 FCFA Orange Money Reversal SMS",
    titleFr: "SMS faux virement Orange Money 75 000 FCFA",
    category: "MOBILE_MONEY",
    icon: CreditCard,
    highlightText: "SMS prétendant un faux versement + demande de renvoi",
    text: `Transfert réussi ! Vous avez reçu 75.000 FCFA de NKODO PIERRE (698001122). Nouveau solde: 75.450 FCFA. Réf: OM99882211.
Pardon mon frère, c'est une erreur de transfert pour les médicaments de ma mère à l'hôpital. Veuillez s'il vous plaît renvoyer les 75 000 FCFA sur ce même numéro Orange Money 698001122. Que Dieu vous bénisse.`,
  },
  {
    id: "demo-visa",
    titleEn: "Express Canada Work Visa Flyer",
    titleFr: "Faux visa travail Canada express 14 jours",
    category: "VISA_TRAVEL",
    icon: Plane,
    highlightText: "Visa en 14 jours garanti • 150 000 FCFA MoMo",
    text: `PROGRAMME SPÉCIAL D'IMMIGRATION ET VISA CANADA EXPRESS EN 14 JOURS GARANTI.
L'Ambassade du Canada au Cameroun en partenariat avec les entreprises canadiennes recrute urgemment 150 travailleurs (chauffeurs, maçons, infirmiers, secrétaires).
Avantages: Salaire de 2 500 000 FCFA / mois, billet d'avion offert, logement gratuit à Montréal. Aucun test de français exigé.
Frais de quittance et timbre express de visa: 150 000 FCFA à transférer par MTN Mobile Money au 677 44 55 66.
Email: visa.canada.immigration.express@gmail.com`,
  },
];

interface DemoCasesProps {
  onSelectCase: (demo: DemoCase) => void;
  isLoading?: boolean;
}

export function DemoCases({ onSelectCase, isLoading }: DemoCasesProps) {
  const { language, t } = useTranslation();

  return (
    <div className="w-full mt-6 pt-6 border-t border-slate-200/80">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="h-4 w-4 text-authority-700" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">{t.orTryDemo}</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PRELOADED_DEMO_CASES.map((demo) => {
          const Icon = demo.icon;
          const title = language === "fr" ? demo.titleFr : demo.titleEn;

          return (
            <button
              key={demo.id}
              type="button"
              disabled={isLoading}
              onClick={() => onSelectCase(demo)}
              className="text-left p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-authority-300 hover:shadow-sm transition-all group focus:outline-none focus:ring-2 focus:ring-authority-700 disabled:opacity-50"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-authority-900 group-hover:bg-authority-900 group-hover:text-white transition-colors shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-authority-900 line-clamp-1">
                    {title}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-mono">
                    {demo.highlightText}
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-authority-900 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
