"use client";

import {
  AlertOctagon,
  ArrowRight,
  type BookOpenCheck,
  Calendar,
  CreditCard,
  Filter,
  GraduationCap,
  Layers,
  Plane,
  Search,
  ShieldAlert,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { Suspense, useEffect, useState } from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { useTranslation } from "../../../lib/i18n/context";

interface ScamReportItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  targetEntity: string | null;
  amountRequested: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  publishedAt: string | null;
  createdAt: string;
}

const CATEGORY_ICONS: Record<string, typeof BookOpenCheck> = {
  CIVIL_SERVICE: GraduationCap,
  VISA_TRAVEL: Plane,
  MOBILE_MONEY: CreditCard,
  INVESTMENT_PONZI: TrendingUp,
  ECOMMERCE: ShoppingBag,
  OTHER: AlertOctagon,
};

function DirectoryContent() {
  const { language, t } = useTranslation();
  const [query, setQuery] = useQueryState("q", { defaultValue: "" });
  const [selectedCategory, setSelectedCategory] = useQueryState("category", {
    defaultValue: "ALL",
  });
  const [reports, setReports] = useState<ScamReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory && selectedCategory !== "ALL") {
          params.set("category", selectedCategory);
        }
        if (query) {
          params.set("q", query);
        }

        const res = await fetch(`/api/reports?${params.toString()}`);
        const data = await res.json();
        if (data.reports) {
          setReports(data.reports);
        }
      } catch (err) {
        console.error("Failed to fetch reports:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchReports, 300);
    return () => clearTimeout(debounce);
  }, [query, selectedCategory]);

  const categories = [
    { id: "ALL", label: t.categoryAll, icon: Layers },
    { id: "CIVIL_SERVICE", label: t.categoryCivilService, icon: GraduationCap },
    { id: "VISA_TRAVEL", label: t.categoryVisa, icon: Plane },
    { id: "MOBILE_MONEY", label: t.categoryMoMo, icon: CreditCard },
    { id: "INVESTMENT_PONZI", label: t.categoryInvestment, icon: TrendingUp },
    { id: "ECOMMERCE", label: t.categoryEcommerce, icon: ShoppingBag },
  ];

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
      <div className="space-y-3 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 border border-red-200 text-xs font-bold text-red-800">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>
            {language === "fr" ? "Registre Public & Base de Données" : "Public Threat Registry"}
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-authority-950 tracking-tight">
          {t.directoryTitle}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{t.directorySubtitle}</p>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchDirectoryPlaceholder}
            className="pl-10 h-12 text-sm rounded-xl border-slate-300 bg-white shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl font-mono text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 border shrink-0 ${
                  isSelected
                    ? "bg-authority-900 text-white border-authority-900 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Registry Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 space-y-3">
          <ShieldAlert className="h-10 w-10 text-slate-400 mx-auto" />
          <p className="text-base font-bold text-slate-700">{t.noResultsFound}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setQuery("");
              setSelectedCategory("ALL");
            }}
          >
            {t.resetFilters}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => {
            const Icon = CATEGORY_ICONS[report.category] || AlertOctagon;
            const dateStr = report.publishedAt || report.createdAt;

            return (
              <Card
                key={report.id}
                className="overflow-hidden border border-slate-200 hover:border-authority-300 transition-all flex flex-col justify-between group"
              >
                <CardHeader className="p-5 pb-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="scam" className="text-[11px] font-bold">
                      <Icon className="h-3 w-3 mr-1 inline" />
                      {categoryLabel(report.category)}
                    </Badge>

                    {report.targetEntity && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {report.targetEntity}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-lg font-black text-authority-950 group-hover:text-authority-700 transition-colors line-clamp-2">
                    {report.title}
                  </h3>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4">
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {report.description}
                  </p>

                  {/* Flagged contacts & metadata */}
                  <div className="space-y-1 text-xs text-slate-500 font-mono pt-2 border-t border-slate-100">
                    {report.contactPhone && <div>📞 {report.contactPhone}</div>}
                    {report.amountRequested && <div>💰 {report.amountRequested}</div>}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(dateStr).toLocaleDateString(dateLocale)}</span>
                    </div>

                    <Button asChild size="sm" variant="outline" className="text-xs font-bold gap-1">
                      <Link href={`/scam/${report.slug}`}>
                        <span>{t.viewDossier}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
          <div className="h-10 w-64 bg-slate-200 rounded-xl" />
          <div className="h-12 w-full bg-slate-200 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-slate-200" />
            ))}
          </div>
        </div>
      }
    >
      <DirectoryContent />
    </Suspense>
  );
}
