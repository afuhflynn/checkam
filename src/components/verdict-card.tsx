"use client";

import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageCircle,
  Phone,
  RotateCcw,
  Share2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "../lib/i18n/context";
import type { VerificationResult } from "../lib/rules/engine";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Progress } from "./ui/progress";

interface VerdictCardProps {
  result: VerificationResult;
  onReset: () => void;
}

export function VerdictCard({ result, onReset }: VerdictCardProps) {
  const { language, t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const isScam = result.verdict === "HIGH_RISK";
  const isCaution = result.verdict === "CAUTION";
  const isOfficial = result.verdict === "VERIFIED_OFFICIAL";

  const bullets = language === "fr" ? result.evidenceBullets.fr : result.evidenceBullets.en;
  const whatsappText = language === "fr" ? result.whatsappWarning.fr : result.whatsappWarning.en;

  const handleCopyAlert = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      setCopied(true);
      toast.success(t.copiedAlertBtn);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(t.copyFailed);
    }
  };

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappText);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  // Status Colors & Themes
  const theme = isScam
    ? {
        border: "border-red-400/80 ring-2 ring-red-500/10",
        headerBg: "bg-red-50/80 border-b border-red-200",
        badgeVariant: "scam" as const,
        badgeText: t.verdictHighRisk,
        badgeIcon: AlertOctagon,
        progressColor: "bg-red-600",
        scoreTextColor: "text-red-700",
        glow: "shadow-red-100",
      }
    : isCaution
      ? {
          border: "border-amber-400/80 ring-2 ring-amber-500/10",
          headerBg: "bg-amber-50/80 border-b border-amber-200",
          badgeVariant: "caution" as const,
          badgeText: t.verdictCaution,
          badgeIcon: AlertTriangle,
          progressColor: "bg-amber-500",
          scoreTextColor: "text-amber-700",
          glow: "shadow-amber-100",
        }
      : {
          border: "border-emerald-400/80 ring-2 ring-emerald-500/10",
          headerBg: "bg-emerald-50/80 border-b border-emerald-200",
          badgeVariant: "verified" as const,
          badgeText: t.verdictOfficial,
          badgeIcon: CheckCircle2,
          progressColor: "bg-emerald-600",
          scoreTextColor: "text-emerald-700",
          glow: "shadow-emerald-100",
        };

  const StatusIcon = theme.badgeIcon;

  return (
    <Card
      className={`w-full overflow-hidden border-2 shadow-xl ${theme.border} ${theme.glow} transition-all animate-in fade-in-50 zoom-in-98 duration-300`}
    >
      {/* Quittance dossier strip — unique CheckAm authority identity */}
      <div className="quittance-stripes flex items-center justify-between px-6 sm:px-8 py-2.5 bg-white border-b border-slate-200">
        <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-slate-500 uppercase">
          {language === "fr" ? "Quittance de vérification Nº" : "Verification receipt Nº"}{" "}
          {result.score.toString().padStart(2, "0")}-{result.category.slice(0, 4)}-CM
        </span>
        <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-slate-500 uppercase">
          ANTIC 8202
        </span>
      </div>
      {/* Verdict Header Banner */}
      <CardHeader className={`${theme.headerBg} p-6 sm:p-8`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="relative flex h-3.5 w-3.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isScam ? "bg-red-400" : isCaution ? "bg-amber-400" : "bg-emerald-400"}`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isScam ? "bg-red-600" : isCaution ? "bg-amber-500" : "bg-emerald-600"}`}
                />
              </span>
              <Badge
                variant={theme.badgeVariant}
                className="text-sm px-3 py-1 uppercase tracking-wide"
              >
                <StatusIcon className="h-4 w-4 mr-1.5 inline" />
                {theme.badgeText}
              </Badge>
              {/* Rotated official stamp */}
              <span
                className={`stamp-rotated inline-block rounded-md border-2 px-2 py-0.5 font-mono text-[11px] font-black uppercase tracking-widest ${
                  isScam
                    ? "border-red-700 text-red-700"
                    : isCaution
                      ? "border-amber-700 text-amber-700"
                      : "border-emerald-700 text-emerald-700"
                }`}
              >
                {isScam ? "Scam" : isCaution ? "Suspect" : "Vérifié"}
              </span>
            </div>

            <p className="text-sm font-medium text-slate-700">
              {isScam
                ? language === "fr"
                  ? "Indicateurs multiples d'escroquerie détectés selon la réglementation camerounaise."
                  : "Multiple scam indicators detected based on Cameroon regulations and flagged records."
                : isCaution
                  ? language === "fr"
                    ? "Annonce non officielle avec éléments suspects. Ne versez aucun fonds sans confirmation."
                    : "Unofficial solicitation with suspect signals. Do not send money without confirmation."
                  : language === "fr"
                    ? "Conforme aux canaux et plateformes officiels du Gouvernement Camerounais."
                    : "Matches verified Cameroon official government communication channels."}
            </p>
          </div>

          {/* Risk Score Meter */}
          <div className="bg-white/90 p-4 rounded-xl border border-slate-200/80 shadow-sm shrink-0 sm:w-48 text-center">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t.riskScoreLabel}
            </div>
            <div className={`font-display text-3xl font-black ${theme.scoreTextColor}`}>
              {result.score}%
            </div>
            <div className="w-full mt-2">
              <Progress
                value={result.score}
                indicatorClassName={theme.progressColor}
                className="h-2"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 sm:p-8 space-y-8">
        {/* Section 1: 3 Specific Evidence Bullets (The Receipts) */}
        <div>
          <h4 className="font-display text-lg font-black text-authority-950 flex items-center gap-2 mb-4">
            <ShieldAlert className="h-5 w-5 text-authority-700" />
            {t.evidenceTitle}
          </h4>

          <div className="space-y-3">
            {bullets.map((bullet, idx) => (
              <div
                key={`evidence-item-${bullet.slice(0, 30)}`}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:border-slate-300 transition-colors"
              >
                <div className="h-6 w-6 rounded-full bg-authority-900 text-white text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="text-sm font-medium text-slate-800 leading-relaxed">{bullet}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Official Contacts & ANTIC Hotline */}
        <div className="p-4 rounded-2xl bg-authority-50/60 border border-authority-200/80 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-authority-900 font-bold text-sm">
              <Phone className="h-4 w-4 text-emerald-600" />
              {t.officialContactsTitle}
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
              ANTIC: 8202 (Gratuit)
            </span>
          </div>

          <div className="text-xs text-slate-600 space-y-1.5">
            <p>{t.anticCallout}</p>
            {result.officialWebsite && (
              <div className="flex items-center gap-2 pt-1 font-semibold text-authority-900">
                <span>{t.verifiedWebsiteLabel}</span>
                <a
                  href={result.officialWebsite}
                  target="_blank"
                  rel="noreferrer"
                  className="text-authority-700 hover:text-authority-900 underline flex items-center gap-1"
                >
                  {result.officialWebsite} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: WhatsApp Forward Alert Box */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/40 p-5 space-y-4">
          <div className="flex items-center gap-2 text-emerald-950 font-bold text-base">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
            {t.forwardAlertTitle}
          </div>
          <p className="text-xs text-slate-600">{t.forwardAlertDesc}</p>

          {/* Preformatted alert preview box */}
          <div className="p-3.5 rounded-xl bg-white border border-emerald-200 font-mono text-xs text-slate-700 whitespace-pre-line leading-relaxed select-all">
            {whatsappText}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Button
              type="button"
              variant="whatsapp"
              size="lg"
              onClick={handleShareWhatsApp}
              className="flex-1 gap-2 font-bold shadow-md hover:shadow-lg"
            >
              <Share2 className="h-4 w-4" />
              {t.shareOnWhatsAppBtn}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleCopyAlert}
              className="sm:w-auto gap-2 font-bold border-slate-300"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  {t.copiedAlertBtn}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-600" />
                  {t.copyAlertBtn}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Bottom check another button */}
        <div className="pt-2 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            className="text-slate-600 hover:text-authority-950 gap-2 font-semibold"
          >
            <RotateCcw className="h-4 w-4" />
            {t.checkAnotherBtn}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
