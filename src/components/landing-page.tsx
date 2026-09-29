"use client";

import type { LandingStats } from "./landing/bulletin-bar";
import { FaqSection } from "./landing/faq-section";
import { HeroSection } from "./landing/hero-section";
import { HowSection } from "./landing/how-section";
import {
  type PreviewReport,
  RegistryPreview,
} from "./landing/registry-preview";
import { TrustStrip } from "./landing/trust-strip";
import { VectorsBentoSection } from "./landing/vectors-bento";
import { WhatsAppSpotlight } from "./landing/whatsapp-spotlight";

interface LandingPageProps {
  stats: LandingStats;
  reports: PreviewReport[];
}

export function LandingPage({ stats, reports }: LandingPageProps) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/40">
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

      {/* 8. Frequently Asked Questions Accordion */}
      <FaqSection />
    </div>
  );
}
