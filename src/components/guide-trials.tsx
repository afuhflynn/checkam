"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { useTranslation } from "../lib/i18n/context";

const TRIAL_TEXT = "MINSEC recrutement direct 325 instituteurs, frais de dossier par Orange Money";
const TRIAL_PHONE = "+237 6";

// Guide trials (spec 0007 AC-5): save number plus deep linked trials into
// web chat and wa.me. Number comes from env with a web chat fallback.
export function GuideTrials() {
  const { language, t } = useTranslation();
  const [number, setNumber] = useState<{ display: string | null; waLink: string | null } | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/guide/number")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (live && data) setNumber(data);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  async function saveNumber() {
    if (!number?.display) return;
    try {
      await navigator.clipboard.writeText(number.display);
      toast.success(t.guideSaved);
    } catch {
      toast.error(t.gateFailed);
    }
  }

  return (
    <Card className="border-2 border-authority-900/10 bg-white">
      <CardContent className="space-y-4 p-6 sm:p-8">
        <div>
          <h2 className="font-display text-2xl font-black text-ink">{t.guideNumberTitle}</h2>
          <p className="text-sm text-slate-500">{t.guideNumberDesc}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {number?.display && (
            <p className="font-mono text-lg font-bold text-ink">{number.display}</p>
          )}
          {number?.display && (
            <Button type="button" variant="outline" onClick={saveNumber}>
              {t.guideSaveBtn}
            </Button>
          )}
          {number?.waLink ? (
            <Button type="button" variant="whatsapp" asChild>
              <a href={number.waLink} target="_blank" rel="noreferrer">
                {t.guideOpenWa}
              </a>
            </Button>
          ) : (
            <Button type="button" asChild>
              <Link href="/chat">{t.guideUseWebChat}</Link>
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href={`/chat?q=${encodeURIComponent(TRIAL_TEXT)}`}>{t.guideTrialText}</Link>
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/chat?tab=upload">{t.guideTrialImage}</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            asChild
          >
            <Link href={`/chat?q=${encodeURIComponent(TRIAL_PHONE)}`}>{t.guideTrialPhone}</Link>
          </Button>
        </div>
        <p className="text-xs text-slate-400">{language === "fr" ? "3 étapes : transférez, recevez, transférez." : "3 steps: forward, receive, forward."}</p>
      </CardContent>
    </Card>
  );
}
