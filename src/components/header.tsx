"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "../lib/i18n/context";
import { UserButton } from "./user-button";
import { ShieldCheck } from "lucide-react";

export function Header() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/directory", label: t.navDirectory },
    { href: "/report", label: t.navReport },
    { href: "/whatsapp", label: t.navWhatsApp },
    // { href: "/admin", label: t.navAdmin }, // coming soon
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-paper/95 backdrop-blur-md border-b border-authority-900/10">
      {/* Masthead */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        <Link
          href="/"
          className="flex items-baseline gap-2 shrink-0"
          aria-label="CheckAm - home"
        >
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center text-authority-950 font-black">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-[26px] leading-none font-black tracking-tight text-ink">
            CheckAm
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
