"use client";

import {
  AlertCircle,
  AlertOctagon,
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  FileCheck,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { useTranslation } from "../../../lib/i18n/context";

interface AdminReport {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  targetEntity: string | null;
  amountRequested: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  submitterEmail: string | null;
  createdAt: string;
  flaggedIdentifiers: Array<{
    id: string;
    normalizedValue: string;
    isActive: boolean;
  }>;
}

interface Stats {
  pendingCount: number;
  approvedCount: number;
  flaggedNumbersCount: number;
  verificationsTotal: number;
}

export default function AdminDashboardPage() {
  const { language, t } = useTranslation();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [stats, setStats] = useState<Stats>({
    pendingCount: 0,
    approvedCount: 0,
    flaggedNumbersCount: 0,
    verificationsTotal: 0,
  });
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">(
    "PENDING",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${statusFilter}`);
      const data = await res.json();
      if (data.reports) {
        setReports(data.reports);
      }
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
      toast.error(t.adminLoadFail);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleModerate = async (reportId: string, action: "APPROVE" | "REJECT") => {
    setActionInProgress(reportId);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t.adminActionFail);
      }

      toast.success(action === "APPROVE" ? t.adminApproveOk : t.adminRejectOk);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.adminActionFail;
      // Never surface raw English API errors to French moderators for known statuses
      toast.error(
        msg === "Moderator sign-in required." && language === "fr"
          ? "Connexion modérateur requise."
          : msg,
      );
    } finally {
      setActionInProgress(null);
    }
  };

  const categoryLabel = (category: string): string => {
    switch (category) {
      case "CIVIL_SERVICE":
        return t.categoryCivilService;
      case "VISA_TRAVEL":
        return t.categoryVisa;
      case "MOBILE_MONEY":
        return t.categoryMoMo;
      case "INVESTMENT_PONZI":
        return t.categoryInvestment;
      case "ECOMMERCE":
        return t.categoryEcommerce;
      default:
        return t.categoryOther;
    }
  };

  const dateLocale = language === "fr" ? "fr-CM" : "en-CM";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-authority-900 text-white text-xs font-bold">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span>{t.adminBadge}</span>
          </div>
          <h1 className="font-display text-3xl font-black text-authority-950 tracking-tight">
            {t.adminTitle}
          </h1>
          <p className="text-sm text-slate-600">{t.adminSubtitle}</p>
        </div>

        {/* Threat feed download shortcut */}
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5 font-bold">
            <a href="/api/public/threat-feed?format=json" target="_blank" rel="noreferrer">
              <Download className="h-4 w-4 text-authority-700" />
              <span>Threat Feed (JSON)</span>
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5 font-bold">
            <a href="/api/public/threat-feed?format=csv" target="_blank" rel="noreferrer">
              <Download className="h-4 w-4 text-emerald-600" />
              <span>Threat Feed (CSV)</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border border-amber-200 bg-amber-50/50">
          <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">
            {t.adminPending}
          </div>
          <div className="font-display text-3xl font-black text-amber-900 mt-1">
            {stats.pendingCount}
          </div>
          <p className="text-[11px] text-amber-700 mt-1">{t.adminPendingHint}</p>
        </Card>

        <Card className="p-5 border border-emerald-200 bg-emerald-50/50">
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
            {t.adminApproved}
          </div>
          <div className="font-display text-3xl font-black text-emerald-900 mt-1">
            {stats.approvedCount}
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">{t.adminApprovedHint}</p>
        </Card>

        <Card className="p-5 border border-red-200 bg-red-50/50">
          <div className="text-xs font-bold text-red-800 uppercase tracking-wider">
            {t.adminFlagged}
          </div>
          <div className="font-display text-3xl font-black text-red-900 mt-1">
            {stats.flaggedNumbersCount}
          </div>
          <p className="text-[11px] text-red-700 mt-1">{t.adminFlaggedHint}</p>
        </Card>

        <Card className="p-5 border border-authority-200 bg-authority-50/50">
          <div className="text-xs font-bold text-authority-800 uppercase tracking-wider">
            {t.adminVerifs}
          </div>
          <div className="font-display text-3xl font-black text-authority-950 mt-1">
            {stats.verificationsTotal}
          </div>
          <p className="text-[11px] text-authority-700 mt-1">{t.adminVerifsHint}</p>
        </Card>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
        <div className="flex gap-2">
          {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-lg font-mono text-[11px] font-bold uppercase tracking-wider transition-all ${
                statusFilter === st
                  ? "bg-authority-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {st === "PENDING"
                ? `${t.adminTabPending} (${stats.pendingCount})`
                : st === "APPROVED"
                  ? `${t.adminTabApproved} (${stats.approvedCount})`
                  : st === "REJECTED"
                    ? t.adminTabRejected
                    : t.adminTabAll}
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={fetchData}
          disabled={isLoading}
          className="gap-1 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>{t.adminRefresh}</span>
        </Button>
      </div>

      {/* Reports Queue */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 space-y-2">
          <FileCheck className="h-10 w-10 text-emerald-500 mx-auto" />
          <p className="text-base font-bold text-slate-800">{t.adminEmpty}</p>
          <p className="text-xs text-slate-500">{t.adminEmptyHint}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isPending = report.status === "PENDING";
            const isApproved = report.status === "APPROVED";
            const isRejected = report.status === "REJECTED";
            const isProcessing = actionInProgress === report.id;

            return (
              <Card
                key={report.id}
                className="overflow-hidden border border-slate-200 hover:border-slate-300 transition-shadow bg-white"
              >
                <div className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isPending ? "caution" : isApproved ? "verified" : "destructive"}
                        className="text-xs font-bold"
                      >
                        {report.status}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-500">
                        {categoryLabel(report.category)}
                      </span>
                      {report.targetEntity && (
                        <span className="text-xs font-bold text-authority-900 bg-slate-100 px-2 py-0.5 rounded">
                          {report.targetEntity}
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-slate-400 font-mono">
                      {t.adminReceivedOn} {new Date(report.createdAt).toLocaleString(dateLocale)}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-lg font-black text-authority-950">
                      {report.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                      {report.description}
                    </p>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600 pt-2 border-t border-slate-100">
                    {report.contactPhone && (
                      <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded border border-red-200">
                        📞 {report.contactPhone}
                      </span>
                    )}
                    {report.contactEmail && (
                      <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded">
                        ✉️ {report.contactEmail}
                      </span>
                    )}
                    {report.amountRequested && (
                      <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded border border-amber-200">
                        💰 {report.amountRequested}
                      </span>
                    )}
                    {report.submitterEmail && (
                      <span className="text-slate-400">
                        {t.adminReportedBy} {report.submitterEmail}
                      </span>
                    )}
                  </div>

                  {/* Moderation Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2 flex-wrap">
                    <Button asChild size="sm" variant="link" className="p-0 text-xs font-bold">
                      <Link href={`/scam/${report.slug}`} target="_blank">
                        {t.adminViewPublic} <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>

                    <div className="flex items-center gap-2">
                      {isPending && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={isProcessing}
                            onClick={() => handleModerate(report.id, "REJECT")}
                            className="gap-1 text-xs font-bold"
                          >
                            <X className="h-3.5 w-3.5" />
                            {t.adminReject}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleModerate(report.id, "APPROVE")}
                            className="gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {isProcessing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            {t.adminApprove}
                          </Button>
                        </>
                      )}

                      {isApproved && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isProcessing}
                          onClick={() => handleModerate(report.id, "REJECT")}
                          className="text-xs text-red-600 hover:bg-red-50"
                        >
                          {t.adminUnpublish}
                        </Button>
                      )}

                      {isRejected && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isProcessing}
                          onClick={() => handleModerate(report.id, "APPROVE")}
                          className="text-xs text-emerald-700 hover:bg-emerald-50"
                        >
                          {t.adminRestore}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
