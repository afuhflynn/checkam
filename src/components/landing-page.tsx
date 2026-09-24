"use client";

import { ArrowUp } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "../lib/i18n/context";
import type { VerificationResult } from "../lib/rules/engine";
import { IntakeHub } from "./intake-hub";
import { AnatomySection } from "./landing/anatomy-section";
import { BulletinBar, type LandingStats } from "./landing/bulletin-bar";
import { DeskSection } from "./landing/desk-section";
import { FaqSection } from "./landing/faq-section";
import { HeroSection } from "./landing/hero-section";
import { HowSection } from "./landing/how-section";
import { type PreviewReport, RegistryPreview } from "./landing/registry-preview";
import { Button } from "./ui/button";
import { VerdictCard } from "./verdict-card";

interface LandingPageProps {
  stats: LandingStats;
  reports: PreviewReport[];
}

export function LandingPage({ stats, reports }: LandingPageProps) {
  const { t } = useTranslation();
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const scrollToDesk = useCallback(() => {
    document.getElementById("desk")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleReset = useCallback(() => {
    setVerificationResult(null);
    scrollToDesk();
  }, [scrollToDesk]);

  return (
    <div className="flex flex-col">
      <BulletinBar initialStats={stats} />

      <HeroSection onVerify={scrollToDesk} />

      <DeskSection>
        {verificationResult ? (
          <VerdictCard result={verificationResult} onReset={handleReset} />
        ) : (
          <IntakeHub
            onVerificationComplete={(res) => {
              setVerificationResult(res);
            }}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}
      </DeskSection>

      <HowSection />

      <AnatomySection />

      <RegistryPreview reports={reports} />

      <FaqSection />

      {/* Final call to action */}
      <section className="bg-authority-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center space-y-5">
          <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-white text-balance">
            {t.ctaTitle}
          </h2>
          <p className="text-slate-300">{t.ctaSub}</p>
          <Button
            type="button"
            size="lg"
            onClick={scrollToDesk}
            className="gap-2 bg-emerald-500 hover:bg-emerald-400 text-authority-950 font-bold shadow-xl"
          >
            <ArrowUp className="h-4 w-4" />
            {t.ctaBtn}
          </Button>
        </div>
      </section>
    </div>
  );
}
