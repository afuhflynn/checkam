export interface ScamPatternMatch {
  category:
    | "CIVIL_SERVICE"
    | "VISA_TRAVEL"
    | "MOBILE_MONEY"
    | "INVESTMENT_PONZI"
    | "ECOMMERCE"
    | "OTHER";
  riskLevel: "HIGH_RISK" | "CAUTION" | "VERIFIED_OFFICIAL";
  matchedPhrases: string[];
  evidenceBulletEn: string;
  evidenceBulletFr: string;
}

export const CAMEROON_SCAM_PATTERNS = [
  // 1. Fake Civil Service & 325 Teachers Recruitment
  {
    category: "CIVIL_SERVICE" as const,
    riskLevel: "HIGH_RISK" as const,
    triggers: [
      "325 instituteurs",
      "325 teachers",
      "recrutement des 325",
      "recrutement spécial des 325",
      "recrutement direct sans concours",
      "direct recruitment into civil service",
      "matricule solde garanti",
      "quota régional réservé",
      "facilitateur minfopra",
      "facilitateur minesec",
      "insertion directe",
      "dossier d'intégration express",
    ],
    evidenceBulletEn:
      "Matches widespread fraudulent civil service recruitment syndicate (e.g. fake MINESEC 325 teachers campaign). Government recruitments are never conducted via social media agents.",
    evidenceBulletFr:
      "Correspond au réseau frauduleux de faux recrutements de la Fonction Publique (ex. faux recrutement des 325 instituteurs MINESEC). Les recrutements de l'État ne passent jamais par des démarcheurs sur les réseaux sociaux.",
  },
  // 2. Express Visa & Foreign Work Contract
  {
    category: "VISA_TRAVEL" as const,
    riskLevel: "HIGH_RISK" as const,
    triggers: [
      "visa canada express",
      "visa canadien garanti",
      "contrat de travail canadien sans test",
      "visa schengen garanti",
      "billet d'avion offert",
      "logement gratuit au canada",
      "visa en 14 jours",
      "visa en 7 jours",
      "ambassade du canada au cameroun recrute",
      "work permit guaranteed",
      "canada express entry direct job",
    ],
    evidenceBulletEn:
      "Promises guaranteed foreign visas or work contracts without standard immigration verification (IRCC Canada or TLScontact). Foreign embassies never guarantee visas or request MoMo transfers for work permits.",
    evidenceBulletFr:
      "Promet des visas ou contrats de travail étrangers garantis sans procédure consulaire réglementaire (IRCC Canada / TLScontact). Les ambassades n'exigent jamais de dépôts MoMo pour des permis de travail.",
  },
  // 3. Fake Crypto Doubling & 24h Ponzi
  {
    category: "INVESTMENT_PONZI" as const,
    riskLevel: "HIGH_RISK" as const,
    triggers: [
      "gain garanti en 24h",
      "doubler votre argent",
      "investir 10000 gagner 50000",
      "investissement crypto garanti",
      "trading bot 100%",
      "groupe vip telegram",
      "investissez 25000 recevez 75000",
      "double your capital in 24 hours",
      "guaranteed daily returns",
      "rejoignez la plateforme d'investissement",
    ],
    evidenceBulletEn:
      "Contains hallmarks of illegal high-yield Ponzi/pyramid schemes promising unrealistic guaranteed returns with zero risk.",
    evidenceBulletFr:
      "Présente tous les indicateurs d'une pyramide de Ponzi illégale promettant des rendements mirobolants garantis sans aucun risque.",
  },
  // 4. Fake Customs Auction (Ventes aux enchères douanes)
  {
    category: "ECOMMERCE" as const,
    riskLevel: "HIGH_RISK" as const,
    triggers: [
      "vente aux enchères douanes",
      "vente aux encheres du port",
      "véhicules saisis aux douanes",
      "ventes des douanes camerounaises",
      "marchandises saisies a liquider",
      "douanes camerounaises port de douala vente",
    ],
    evidenceBulletEn:
      "Impersonates Cameroon Customs auctions. Authentic customs public auctions are held in-person under judicial supervision, never reserved over WhatsApp or paid in advance via MoMo.",
    evidenceBulletFr:
      "Usurpe l'identité de la Direction Générale des Douanes. Les ventes aux enchères officielles se déroulent en présentiel sous contrôle d'huissier, jamais par réservation WhatsApp ou paiement MoMo anticipé.",
  },
];

export function evaluateKeywordPatterns(text: string): ScamPatternMatch | null {
  const lower = text.toLowerCase();

  for (const pattern of CAMEROON_SCAM_PATTERNS) {
    const matched = pattern.triggers.filter((t) => lower.includes(t));
    if (matched.length > 0) {
      return {
        category: pattern.category,
        riskLevel: pattern.riskLevel,
        matchedPhrases: matched,
        evidenceBulletEn: pattern.evidenceBulletEn,
        evidenceBulletFr: pattern.evidenceBulletFr,
      };
    }
  }

  return null;
}
