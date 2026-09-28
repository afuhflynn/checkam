"use client";

import {
  AlertOctagon,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileCheck2,
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

  // Status Themes
  const theme = isScam
    ? {
        border: "border-red-300 ring-4 ring-red-500/5",
        headerBg: "bg-gradient-to-br from-red-50/90 via-red-50/40 to-white border-b border-red-100",
        badgeVariant: "scam" as const,
        badgeText: t.verdictHighRisk,
        badgeIcon: AlertOctagon,
        badgeColor: "bg-red-600 text-white",
        progressColor: "bg-red-600",
        scoreTextColor: "text-red-700",
        pillBg: "bg-red-50 text-red-800 border-red-200",
      }
    : isCaution
      ? {
          border: "border-amber-300 ring-4 ring-amber-500/5",
          headerBg:
            "bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-white border-b border-amber-100",
          badgeVariant: "caution" as const,
          badgeText: t.verdictCaution,
          badgeIcon: AlertTriangle,
          badgeColor: "bg-amber-600 text-white",
          progressColor: "bg-amber-500",
          scoreTextColor: "text-amber-700",
          pillBg: "bg-amber-50 text-amber-800 border-amber-200",
        }
      : {
          border: "border-emerald-300 ring-4 ring-emerald-500/5",
          headerBg:
            "bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-white border-b border-emerald-100",
          badgeVariant: "verified" as const,
          badgeText: t.verdictOfficial,
          badgeIcon: CheckCircle2,
          badgeColor: "bg-emerald-600 text-white",
          progressColor: "bg-emerald-600",
          scoreTextColor: "text-emerald-700",
          pillBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
        };

  const StatusIcon = theme.badgeIcon;
  const receiptSerial = `${result.score.toString().padStart(2, "0")}-${result.category.slice(0, 4)}-CM`;

  return (
    <Card
      className={`w-full overflow-hidden rounded-3xl border-2 shadow-2xl bg-white ${theme.border} verdict-in`}
    >
      {/* Official Certificate Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 sm:px-8 py-3 bg-slate-50/80 border-b border-slate-200/80">
        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
          <FileCheck2 className="h-4 w-4 text-authority-800" />
          <span>
            {t.verdictCertNo} <span className="text-ink">{receiptSerial}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            ANTIC 8202
          </span>
        </div>
      </div>

      {/* Main Verdict Banner */}
      <CardHeader className={`${theme.headerBg} p-6 sm:p-8 space-y-5`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="relative flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isScam ? "bg-red-400" : isCaution ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    isScam ? "bg-red-600" : isCaution ? "bg-amber-500" : "bg-emerald-600"
                  }`}
                />
              </span>
              <Badge
                variant={theme.badgeVariant}
                className="font-sans text-xs px-3.5 py-1 font-bold uppercase tracking-wider rounded-lg shadow-sm"
              >
                <StatusIcon className="h-4 w-4 mr-1.5 inline" />
                {theme.badgeText}
              </Badge>
              <span className="font-mono text-xs font-bold text-slate-500 px-2.5 py-0.5 rounded border border-slate-200 bg-white">
                {result.category.replace(/_/g, " ")}
              </span>
            </div>

            <p className="font-sans text-base text-slate-700 leading-relaxed">
              {isScam
                ? language === "fr"
                  ? "Indicateurs multiples d'escroquerie détectés selon la réglementation officielle camerounaise."
                  : "Multiple scam indicators detected based on Cameroon official regulations and confirmed blacklist records."
                : isCaution
                  ? language === "fr"
                    ? "Annonce non officielle avec éléments suspects. Ne versez aucun fonds sans confirmation préalable."
                    : "Unofficial notice with suspect elements. Do not send any funds without prior confirmation."
                  : language === "fr"
                    ? "Conforme aux canaux et plateformes officiels du Gouvernement Camerounais."
                    : "Matches verified Cameroon official government communication channels."}
            </p>
          </div>

          {/* Elevated Risk Score Gauge */}
          <div className="bg-white/95 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/90 shadow-sm shrink-0 lg:w-52 text-center">
            <div className="font-mono text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              {t.riskScoreLabel}
            </div>
            <div className={`font-display text-4xl sm:text-5xl font-black ${theme.scoreTextColor}`}>
              {result.score}%
            </div>
            <div className="w-full mt-3">
              <Progress
                value={result.score}
                indicatorClassName={theme.progressColor}
                className="h-2 rounded-full bg-slate-100"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 sm:p-8 space-y-8">
        {/* Evidence Receipts */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-authority-900" />
            <h4 className="font-display text-lg font-black text-ink">{t.evidenceTitle}</h4>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {bullets.map((bullet, idx) => (
              <div
                key={`evidence-${idx}-${bullet.slice(0, 20)}`}
                className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-authority-200 hover:shadow-sm transition-all"
              >
                <div className="h-6 w-6 rounded-full bg-authority-950 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="font-sans text-sm font-medium text-slate-800 leading-relaxed">
                  {bullet}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Official Contacts & Hotlines */}
        <div className="p-5 rounded-2xl bg-authority-50/50 border border-authority-100 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-display text-sm font-bold text-authority-950">
              <Phone className="h-4 w-4 text-emerald-600" />
              <span>{t.officialContactsTitle}</span>
            </div>
            <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-900 border border-emerald-300/80">
              {t.verdictHotlineBadge}
            </span>
          </div>

          <p className="font-sans text-xs text-slate-600 leading-relaxed">{t.anticCallout}</p>

          {result.officialWebsite && (
            <div className="flex items-center gap-2 pt-1 font-mono text-xs font-semibold text-authority-900">
              <span className="text-slate-500">{t.verifiedWebsiteLabel}</span>
              <a
                href={result.officialWebsite}
                target="_blank"
                rel="noreferrer"
                className="text-authority-700 hover:text-authority-950 underline flex items-center gap-1 font-mono font-bold"
              >
                {result.officialWebsite} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {result.sources && result.sources.length > 0 && (
            <div className="pt-2 border-t border-authority-100/80 space-y-1.5">
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t.chatSourcesTitle}
              </p>
              <ul className="space-y-1">
                {result.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-sans text-xs font-semibold text-authority-700 hover:text-authority-950 underline flex items-center gap-1"
                    >
                      {source.title} <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* WhatsApp Forward Warning Card */}
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/30 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 font-display text-base font-bold text-emerald-950">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
            <span>{t.verdictShareTitle}</span>
          </div>
          <p className="font-sans text-xs text-slate-600 leading-relaxed">{t.forwardAlertDesc}</p>

          {/* Preformatted alert bubble */}
          <div className="p-4 rounded-xl bg-white border border-emerald-200/90 font-mono text-xs text-slate-800 whitespace-pre-line leading-relaxed select-all shadow-sm">
            {whatsappText}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Button
              type="button"
              variant="whatsapp"
              size="lg"
              onClick={handleShareWhatsApp}
              className="flex-1 gap-2 font-sans font-bold shadow-md hover:shadow-lg rounded-xl"
            >
              <Share2 className="h-4 w-4" />
              {t.shareOnWhatsAppBtn}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleCopyAlert}
              className="sm:w-auto gap-2 font-sans font-bold border-slate-300 rounded-xl hover:bg-slate-50"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>{t.copiedAlertBtn}</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-600" />
                  <span>{t.copyAlertBtn}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Check Another Button */}
        <div className="pt-2 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            className="text-slate-600 hover:text-authority-950 gap-2 font-sans font-semibold rounded-xl"
          >
            <RotateCcw className="h-4 w-4" />
            {t.checkAnotherBtn}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
