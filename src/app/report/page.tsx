"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  HelpCircle,
  Loader2,
  Send,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { useTranslation } from "../../lib/i18n/context";

export default function ReportPage() {
  const { language, t } = useTranslation();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("CIVIL_SERVICE");
  const [targetEntity, setTargetEntity] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [amountRequested, setAmountRequested] = useState("");
  const [description, setDescription] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error(
        language === "fr"
          ? "Veuillez remplir au moins le titre et la description."
          : "Please provide at least a title and description.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          targetEntity,
          contactPhone,
          contactEmail,
          amountRequested,
          description,
          submitterEmail,
        }),
      });

      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 429) throw new Error(t.reportRateLimit);
        throw new Error(t.reportFailed);
      }
      void data;

      setIsSubmitted(true);
      toast.success(t.reportSuccessMessage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.reportFailed;
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Heading */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-xs font-bold text-amber-800">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>{language === "fr" ? "Vigilance Communautaire" : "Community Vigilance"}</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-authority-950 tracking-tight">
          {t.reportTitle}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{t.reportSubtitle}</p>
      </div>

      {isSubmitted ? (
        <Card className="border-2 border-emerald-300 bg-white p-8 text-center space-y-6 shadow-xl animate-in fade-in-50">
          <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-black text-authority-950">
              {language === "fr"
                ? "Signalement Transmis avec Succès"
                : "Report Submitted Successfully"}
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {t.reportSuccessMessage}
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild variant="default" size="lg">
              <Link href="/directory">
                {language === "fr" ? "Consulter le Registre" : "Browse Scam Registry"}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                setIsSubmitted(false);
                setTitle("");
                setDescription("");
                setContactPhone("");
                setContactEmail("");
                setAmountRequested("");
              }}
            >
              {language === "fr" ? "Signaler une autre tentative" : "Submit another report"}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="border border-slate-200 bg-white shadow-xl">
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Report Title */}
              <div className="space-y-2">
                <label
                  htmlFor="report-title"
                  className="text-sm font-bold text-authority-950 block"
                >
                  {t.reportFormTitleLabel} <span className="text-red-500">*</span>
                </label>
                <Input
                  id="report-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.reportFormTitlePlaceholder}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Category & Target Entity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="report-category"
                    className="text-sm font-bold text-authority-950 block"
                  >
                    {t.reportCategoryLabel}
                  </label>
                  <select
                    id="report-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={isLoading}
                    className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-authority-800"
                  >
                    <option value="CIVIL_SERVICE">{t.categoryCivilService}</option>
                    <option value="VISA_TRAVEL">{t.categoryVisa}</option>
                    <option value="MOBILE_MONEY">{t.categoryMoMo}</option>
                    <option value="INVESTMENT_PONZI">{t.categoryInvestment}</option>
                    <option value="ECOMMERCE">{t.categoryEcommerce}</option>
                    <option value="OTHER">Autre / Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="report-target"
                    className="text-sm font-bold text-authority-950 block"
                  >
                    {t.reportEntityLabel}
                  </label>
                  <Input
                    id="report-target"
                    value={targetEntity}
                    onChange={(e) => setTargetEntity(e.target.value)}
                    placeholder={t.reportEntityPlaceholder}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Suspect Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="report-phone"
                    className="text-sm font-bold text-authority-950 block"
                  >
                    {t.reportPhoneLabel}
                  </label>
                  <Input
                    id="report-phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder={t.reportPhonePlaceholder}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="report-email"
                    className="text-sm font-bold text-authority-950 block"
                  >
                    {t.reportEmailLabel}
                  </label>
                  <Input
                    id="report-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder={t.reportEmailPlaceholder}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Amount Demanded */}
              <div className="space-y-2">
                <label
                  htmlFor="report-amount"
                  className="text-sm font-bold text-authority-950 block"
                >
                  {t.reportAmountLabel}
                </label>
                <Input
                  id="report-amount"
                  value={amountRequested}
                  onChange={(e) => setAmountRequested(e.target.value)}
                  placeholder={t.reportAmountPlaceholder}
                  disabled={isLoading}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label htmlFor="report-desc" className="text-sm font-bold text-authority-950 block">
                  {t.reportDescLabel} <span className="text-red-500">*</span>
                </label>
                <Textarea
                  id="report-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.reportDescPlaceholder}
                  className="min-h-[140px]"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Submitter Email (Optional) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label
                  htmlFor="report-submitter"
                  className="text-xs font-semibold text-slate-600 block"
                >
                  {language === "fr"
                    ? "Votre email (facultatif - gardé strictement confidentiel) :"
                    : "Your email (optional - strictly confidential):"}
                </label>
                <Input
                  id="report-submitter"
                  type="email"
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  placeholder="contact@email.com"
                  disabled={isLoading}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="w-full bg-authority-950 hover:bg-authority-900 font-bold gap-2 text-base shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{language === "fr" ? "Envoi en cours..." : "Submitting..."}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>{t.reportSubmitBtn}</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
