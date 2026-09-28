"use client";

import Link from "next/link";
import { authClient } from "../lib/auth-client";
import { useTranslation } from "../lib/i18n/context";
import type { LandingStats } from "./landing/bulletin-bar";
import { CtaSection } from "./landing/cta-section";
import { FaqSection } from "./landing/faq-section";
import { HeroSection } from "./landing/hero-section";
import { HowSection } from "./landing/how-section";
import { type PreviewReport, RegistryPreview } from "./landing/registry-preview";
import { StatsStrip } from "./landing/stats-strip";
import { TrustStrip } from "./landing/trust-strip";
import { VectorsBentoSection } from "./landing/vectors-bento";
import { WhatsAppSpotlight } from "./landing/whatsapp-spotlight";

interface LandingPageProps {
  stats: LandingStats;
  reports: PreviewReport[];
}

export function LandingPage({ stats, reports }: LandingPageProps) {
  const { t } = useTranslation();
  const { data: session } = authClient.useSession();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/40">
      {/* Logged in notification banner */}
      {session?.user && (
        <div className="bg-emerald-800 px-4 py-2.5 text-center sm:px-6">
          {(session.user as { emailVerified?: boolean }).emailVerified === false ? (
            <p className="font-sans text-sm font-semibold text-white">
              {t.gateUnverifiedDesc}{" "}
              <Link href="/signin" className="underline underline-offset-2 hover:no-underline">
                {t.gateSignInBtn}
              </Link>
            </p>
          ) : (
            <p className="font-sans text-sm font-semibold text-white">
              {t.continueBarText}{" "}
              <Link href="/chat" className="underline underline-offset-2 hover:no-underline">
                {t.continueBarBtn}
              </Link>
            </p>
          )}
        </div>
      )}

      {/* 1. Hero: Pure value proposition, expansive breathing space & ambient orbits (Zero Inputs) */}
      <HeroSection stats={stats} />

      {/* 2. Institutional Authority & Verification Standards Strip */}
      <TrustStrip />

      {/* 3. How It Works: 3-Step Verification Pipeline */}
      <HowSection />

      {/* 4. Common Scam Vectors Bento Grid */}
      <VectorsBentoSection />

      {/* 5. WhatsApp Bot Spotlight & Direct Community Forwarding */}
      <WhatsAppSpotlight />

      {/* 6. Confirmed Scam Registry Preview */}
      <RegistryPreview reports={reports} />

      {/* 7. Live Impact Statistics Counter Strip */}
      <StatsStrip stats={stats} />

      {/* 8. Frequently Asked Questions Accordion */}
      <FaqSection />

      {/* 9. Final High-Impact Call to Action Banner */}
      <CtaSection />
    </div>
  );
}
