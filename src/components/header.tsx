"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "../lib/i18n/context";
import { UserButton } from "./user-button";

export function Header() {
  const { language, setLanguage, t } = useTranslation();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: t.navHome },
    { href: "/chat", label: t.navChat },
    { href: "/directory", label: t.navDirectory },
    { href: "/report", label: t.navReport },
    { href: "/whatsapp", label: t.navWhatsApp },
    { href: "/admin", label: t.navAdmin },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-paper/95 backdrop-blur-md border-b border-authority-900/10">
      {/* Utility strip: hotline + language */}
      <div className="bg-authority-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between gap-4">
          <p className="font-mono text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300 truncate">
            {language === "fr" ? "Cybersécurité ANTIC" : "ANTIC Cyber Security"}
            <span className="text-emerald-400 font-bold">
              {" "}
              - 8202 ({language === "fr" ? "gratuit" : "free"})
            </span>
          </p>
          <div className="flex items-center font-mono text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setLanguage("fr")}
              aria-pressed={language === "fr"}
              className={`px-2 py-0.5 transition-colors ${
                language === "fr"
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-200"
              }`}
            >
              FR
            </button>
            <span className="text-slate-700" aria-hidden="true">
              /
            </span>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
              className={`px-2 py-0.5 transition-colors ${
                language === "en"
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-200"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* Masthead */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        <Link
          href="/"
          className="flex items-baseline gap-2 shrink-0"
          aria-label="CheckAm - home"
        >
          <span className="font-display text-[26px] leading-none font-black tracking-tight text-ink">
            CheckAm
          </span>
          <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-emerald-700 border border-emerald-600/40 rounded px-1.5 py-0.5">
            CMR
          </span>
        </Link>

        {/* Desktop nav - text only, active marked with an emerald rule */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Primary">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative py-2 text-sm font-semibold transition-colors ${
                  isActive ? "text-ink" : "text-slate-500 hover:text-ink"
                }`}
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 -bottom-0.5 h-0.5 bg-emerald-500 transition-opacity ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Desktop account */}
        <div className="hidden md:block">
          <UserButton />
        </div>

        {/* Mobile trigger - CSS hamburger, no icon font */}
        <div className="flex items-center gap-2 md:hidden">
          <UserButton />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={t.toggleMenu}
            aria-expanded={mobileMenuOpen}
            className="md:hidden flex flex-col items-center justify-center gap-1.5 h-10 w-10 rounded-lg hover:bg-authority-900/5"
          >
            <span
              aria-hidden="true"
              className={`block h-0.5 w-5 bg-ink transition-transform duration-300 ${
                mobileMenuOpen ? "translate-y-[4px] rotate-45" : ""
              }`}
            />
            <span
              aria-hidden="true"
              className={`block h-0.5 w-5 bg-ink transition-transform duration-300 ${
                mobileMenuOpen ? "-translate-y-[4px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <nav
          className="md:hidden border-t border-authority-900/10 bg-paper px-4 sm:px-6 pt-2 pb-6"
          aria-label="Mobile"
        >
          {navLinks.map((link, idx) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-baseline gap-3 border-b border-authority-900/5 py-3.5 ${
                  isActive ? "text-ink" : "text-slate-600"
                }`}
              >
                <span className="font-mono text-[11px] font-bold text-emerald-700">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-xl font-bold">
                  {link.label}
                </span>
                {isActive && (
                  <span
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
