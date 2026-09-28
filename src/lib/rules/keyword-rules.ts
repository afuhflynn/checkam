export interface ScamPatternMatch {
  category:
    | "CIVIL_SERVICE"
    | "VISA_TRAVEL"
    | "MOBILE_MONEY"
    | "INVESTMENT_PONZI"
    | "ECOMMERCE"
    | "EDUCATION"
    | "MONEY_LAUNDERING"
    | "ROMANCE"
    | "IMPERSONATION"
    | "PRIZE"
    | "EXTORTION"
    | "SEXTORTION"
    | "PHISHING"
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
  // 5. Scholarship and study abroad fee traps
  {
    category: "EDUCATION" as const,
    riskLevel: "HIGH_RISK" as const,
    triggers: [
      "bourse d'études garantie",
      "bourse d etudes garantie",
      "frais de traitement de la bourse",
      "frais de traitement bourse",
      "payez pour recevoir votre bourse",
      "scholarship processing fee",
      "tuition payment release scholarship",
      "full scholarship guaranteed no exam",
      "bourse études canada garantie",
      "admission garantie sans concours",
      "frais d'inscription à payer pour obtenir la bourse",
    ],
    evidenceBulletEn:
      "A real scholarship never charges a fee to release the award. Universities and scholarship bodies confirm awards by email from their own domain, and Cameroon state bursaries run through the Ministries concerned.",
    evidenceBulletFr:
      "Une vraie bourse ne demande jamais de frais pour être versée. Les universités et organismes de bourses confirment l'attribution par e-mail depuis leur propre domaine, et les bourses d'État camerounaises passent par les ministères concernés.",
  },
  // 6. Being recruited as a money mule
  {
    category: "MONEY_LAUNDERING" as const,
    riskLevel: "HIGH_RISK" as const,
    triggers: [
      "reçois l'argent sur mon compte",
      "recois l'argent sur mon compte",
      "envoie le reste au tiers",
      "garde 10% et transfère",
      "conserve 10 pour cent",
      "fais passer l'argent",
      "receive money on my account and send",
      "money mule",
      "money laundering commission",
      "transfert multi compte sous commission",
      "utilise ton compte mobile money pour recevoir",
      "commission de 5% par transfert",
    ],
    evidenceBulletEn:
      "Asks you to receive and pass on other people's money through your own account or Mobile Money. A small cut is not a salary: you would be holding the money and the legal liability, and the funds are usually stolen.",
    evidenceBulletFr:
      "Vous demande de recevoir et de faire transiter l'argent d'autres personnes via votre compte ou votre Mobile Money. Une petite commission n'est pas un salaire : vous détenez l'argent et la responsabilité légale, et les fonds sont généralement volés.",
  },
  // 7. Romance and long distance money requests
  {
    category: "ROMANCE" as const,
    riskLevel: "HIGH_RISK" as const,
    triggers: [
      "mon amour envoie moi",
      "j'ai besoin de ton aide financière",
      "aide moi financièrement love",
      "envoie moi de l'argent je t'aime",
      "i need your help financially",
      "send me money i love you",
      "military doctor abroad need money",
      "nurse in america send money",
      "demande de prêt urgente",
    ],
    evidenceBulletEn:
      "An online relationship that turns into a request for money, gift cards or airfare is the most common long-running fraud pattern worldwide. Genuine partners do not need your bank details, your OTP, or a guarantor.",
    evidenceBulletFr:
      "Une relation en ligne qui se transforme en demande d'argent, de cartes cadeaux ou de billet d'avion est l'escroquerie la plus répandue au monde. Un vrai partenaire n'a pas besoin de vos coordonnées bancaires, de votre OTP ni d'un garant.",
  },
  // 8. Impersonation of institutions and named people
  {
    category: "IMPERSONATION" as const,
    riskLevel: "CAUTION" as const,
    triggers: [
      "je suis le ministre",
      "au nom de l'antic",
      "au nom de l antic",
      "service client de vodacom",
      "je suis votre conseiller bancaire",
      "appel du numéro vert",
      "i am the minister",
      "acting on behalf of antic",
      "your bank security department",
      "remboursement de vos frais d'inscription",
    ],
    evidenceBulletEn:
      "Claims to speak for an institution, bank, telecom or named official. Cameroon ministries, ANTIC and banks never ask for an OTP, a pin, or a Mobile Money transfer by SMS or WhatsApp, and they do not use a personal number to introduce themselves.",
    evidenceBulletFr:
      "Prétend parler au nom d'une institution, d'une banque, d'un opérateur ou d'une personnalité officielle. Les ministères, l'ANTIC et les banques ne demandent jamais un OTP, un code ou un transfert Mobile Money par SMS ou WhatsApp, et ne s'annoncent jamais depuis un numéro personnel.",
  },
  // 9. Prizes, lotteries and inheritance
  {
    category: "PRIZE" as const,
    riskLevel: "HIGH_RISK" as const,
    triggers: [
      "vous avez gagné",
      "numéro gagnant",
      "loterie nationale spectrophot",
      "frais de livraison du lot",
      "frais de dédouanement du prix",
      "delivery fee for your prize",
      "prixClaim",
      "you have won the lottery",
      "claim your inheritance",
      "prix d lottery international",
      "frais de dédouanement du prix",
    ],
    evidenceBulletEn:
      "Winnings are never announced by SMS with a delivery, customs or processing fee attached. No lottery or promotion asks you to pay before you receive anything.",
    evidenceBulletFr:
      "Les gains ne s'annoncent jamais par SMS avec des frais de livraison, de douane ou de traitement. Aucune loterie ni promotion ne demande de payer avant de recevoir quoi que ce soit.",
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
