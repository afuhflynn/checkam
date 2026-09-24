"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { type Language, type TranslationDictionary, translations } from "./dictionary";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "checkam_lang";

function persistLanguage(lang: Language): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, lang);
  document.cookie = `${STORAGE_KEY}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  document.documentElement.lang = lang;
}

function detectBrowserLanguage(): Language {
  if (typeof navigator === "undefined") return "fr";
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "fr";
}

export function LanguageProvider({
  children,
  initialLanguage = "fr",
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  // SSR-safe: first render always matches the server HTML (no hydration mismatch).
  // The effect below then reconciles with the visitor's saved/browser language.
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const resolved: Language = saved === "en" || saved === "fr" ? saved : detectBrowserLanguage();
    setLanguageState((prev) => (prev === resolved ? prev : resolved));
    // Keep <html lang> in sync (screen readers, SEO) on every language change,
    // including the automatic first-visit detection above.
    document.documentElement.lang = resolved;
    if (saved !== resolved) persistLanguage(resolved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    persistLanguage(lang);
  };

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
