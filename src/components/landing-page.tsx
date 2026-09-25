"use client";

import { ArrowUp } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { authClient } from "../lib/auth-client";
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
  const { data: session } = authClient.useSession();
  const [returning] = useState(
    () =>
      typeof document !== "undefined" &&
      /(?:^|;\s*)checkam_returning=1/.test(document.cookie),
  );

  const scrollToDesk = useCallback(() => {
    document.getElementById("desk")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleReset = useCallback(() => {
    setVerificationResult(null);
    scrollToDesk();
  }, [scrollToDesk]);

  const desk = (
    <DeskSection>
      {verificationResult ? (
        <VerdictCard result={verificationResult} onReset={handleReset} />
      ) : (
        <IntakeHub
          onVerificationComplete={(res) => {
            document.cookie = "checkam_returning=1; max-age=31536000; path=/; SameSite=Lax";
            setVerificationResult(res);
          }}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      )}
    </DeskSection>
  );

  return (
    <div className="flex flex-col">
      <BulletinBar initialStats={stats} />

      {session?.user && (
        <div className="bg-emerald-700 px-4 py-2.5 text-center sm:px-6">
          <p className="text-sm font-semibold text-white">
            {t.continueBarText}{" "}
            <Link href="/chat" className="underline underline-offset-2 hover:no-underline">
              {t.continueBarBtn}
            </Link>
          </p>
        </div>
      )}

      {returning && !session?.user ? (
        <>
          {desk}
          <HeroSection onVerify={scrollToDesk} />
        </>
      ) : (
        <>
          <HeroSection onVerify={scrollToDesk} />
          {desk}
        </>
      )}

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
