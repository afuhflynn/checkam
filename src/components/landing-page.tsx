"use client";

import { ArrowUp } from "lucide-react";
import Link from "next/link";
import { authClient } from "../lib/auth-client";
import { useTranslation } from "../lib/i18n/context";
import { AnatomySection } from "./landing/anatomy-section";
import { BulletinBar, type LandingStats } from "./landing/bulletin-bar";
import { FaqSection } from "./landing/faq-section";
import { HeroSection } from "./landing/hero-section";
import { HowSection } from "./landing/how-section";
import { ProofStrip } from "./landing/proof-strip";
import { type PreviewReport, RegistryPreview } from "./landing/registry-preview";
import { Button } from "./ui/button";

interface LandingPageProps {
  stats: LandingStats;
  reports: PreviewReport[];
}

export function LandingPage({ stats, reports }: LandingPageProps) {
  const { t } = useTranslation();
  const { data: session } = authClient.useSession();

  return (
    <div className="flex flex-col">
      <BulletinBar initialStats={stats} />

      {session?.user && (
        <div className="bg-emerald-700 px-4 py-2.5 text-center sm:px-6">
          {(session.user as { emailVerified?: boolean }).emailVerified === false ? (
            <p className="text-sm font-semibold text-white">
              {t.gateUnverifiedDesc}{" "}
              <Link href="/signin" className="underline underline-offset-2 hover:no-underline">
                {t.gateSignInBtn}
              </Link>
            </p>
          ) : (
            <p className="text-sm font-semibold text-white">
              {t.continueBarText}{" "}
              <Link href="/chat" className="underline underline-offset-2 hover:no-underline">
                {t.continueBarBtn}
              </Link>
            </p>
          )}
        </div>
      )}

      <HeroSection stats={stats} />

      <ProofStrip stats={stats} />

      <HowSection />

      <AnatomySection />

      <RegistryPreview reports={reports} />

      <FaqSection />

      {/* Final call to action */}
      <section className="bg-authority-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center space-y-5">
          <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-white text-balance">
            {t.ctaTitle}
          </h2>
          <p className="text-slate-300">{t.ctaSub}</p>
          <Button
            asChild
            type="button"
            size="lg"
            className="gap-2 bg-emerald-500 hover:bg-emerald-400 text-authority-950 font-bold shadow-xl"
          >
            <Link href="/chat">
              <ArrowUp className="h-4 w-4" />
              {t.ctaBtn}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
