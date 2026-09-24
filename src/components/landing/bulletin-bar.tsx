"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "../../lib/i18n/context";

export interface LandingStats {
  verifications: number;
  flagged: number;
  cases: number;
  recentFlagged: Array<{ normalizedValue: string; category: string }>;
}

function maskIdentifier(value: string): string {
  if (value.includes("@")) {
    const domain = value.split("@")[1] ?? "";
    return `•••@${domain}`;
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) return value;
  const head = digits.slice(0, 3);
  const rest = digits.slice(3);
  return `+${head} ${rest.slice(0, 3)} •• •• ${rest.slice(-2)}`;
}

export function BulletinBar({ initialStats }: { initialStats: LandingStats }) {
  const { language, t } = useTranslation();
  const [stats, setStats] = useState<LandingStats>(initialStats);
  const locale = language === "fr" ? "fr-CM" : "en-CM";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (!cancelled && data && typeof data === "object" && "verifications" in data) {
          setStats(data as LandingStats);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const figures = [
    { value: stats.verifications, label: t.bulletinVerified },
    { value: stats.flagged, label: t.bulletinBlacklisted },
    { value: stats.cases, label: t.bulletinCases },
  ];

  return (
    <div className="bg-authority-950 text-white">
      {/* Live figures */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          {t.bulletinLive}
        </div>
        <div className="flex items-center gap-4 sm:gap-6 font-mono text-[11px] sm:text-xs">
          {figures.map((f) => (
            <span key={f.label} className="whitespace-nowrap">
              <span className="font-bold text-white">{f.value.toLocaleString(locale)}</span>{" "}
              <span className="text-slate-400">{f.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Flagged-numbers wire */}
      {stats.recentFlagged.length > 0 && (
        <div className="ticker-mask overflow-hidden border-t border-white/10 bg-authority-900/60">
          <div className="animate-ticker flex w-max items-center gap-8 px-4 py-1.5 font-mono text-[11px] text-slate-300">
            {[...stats.recentFlagged, ...stats.recentFlagged].map((item, idx) => (
              <span
                key={`${item.normalizedValue}-${idx}`}
                className="flex items-center gap-2 whitespace-nowrap"
                aria-hidden={idx >= stats.recentFlagged.length}
              >
                <span className="text-red-400 font-bold">■</span>
                <span>
                  {t.bulletinFlaggedPrefix} {maskIdentifier(item.normalizedValue)}
                </span>
                <span className="text-slate-500">· {item.category.replace(/_/g, " ")}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
