"use client";

import { ExternalLink, Phone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import React from "react";
import { useTranslation } from "../lib/i18n/context";

export function Footer() {
  const { language, t } = useTranslation();

  return (
    <footer className="w-full border-t border-slate-200 bg-authority-950 text-slate-300 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Mission */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center text-authority-950 font-black">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <span className="font-display text-xl font-black text-white tracking-tight">
                CheckAm Cameroon
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">{t.footerDisclaimer}</p>
            <div className="inline-flex items-center gap-2 p-3 rounded-xl bg-authority-900 border border-slate-800 text-xs">
              <Phone className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px]">
                  {language === "fr"
                    ? "Assistance Nationale Fraude & Cybercriminalité"
                    : "National Fraud & Cybercrime Hotline"}
                </span>
                <span className="font-bold text-white text-sm">
                  ANTIC: 8202 (Gratuit / Toll-Free)
                </span>
              </div>
            </div>
          </div>

          {/* Col 2: Official Whitelist Portals */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">
              {language === "fr" ? "Portails Officiels de l'État" : "Official State Portals"}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://www.prc.cm"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  Présidence de la République (prc.cm) <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="http://www.minfopra.gov.cm"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  MINFOPRA Concours (minfopra.gov.cm) <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.minesec.gov.cm"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  MINESEC Enseignements (minesec.gov.cm) <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.antic.cm"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  ANTIC Cybersécurité (antic.cm) <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Links & Feeds */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">
              {language === "fr" ? "Services & Données" : "Services & Feeds"}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/directory" className="hover:text-emerald-400 transition-colors">
                  {t.navDirectory}
                </Link>
              </li>
              <li>
                <Link href="/report" className="hover:text-emerald-400 transition-colors">
                  {t.navReport}
                </Link>
              </li>
              <li>
                <Link href="/whatsapp" className="hover:text-emerald-400 transition-colors">
                  {t.navWhatsApp}
                </Link>
              </li>
              <li>
                <a
                  href="/api/public/threat-feed?format=json"
                  target="_blank"
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                  rel="noreferrer"
                >
                  Threat Feed API (JSON) <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>
            © {new Date().getFullYear()} {t.footerRights}
          </p>
          <div className="flex items-center gap-4">
            <span>Douala • Yaoundé • Bafoussam • Garoua • Bamenda</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
