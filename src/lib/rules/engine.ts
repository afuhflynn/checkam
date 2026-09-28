import { type OfficialInstitution, findOfficialEntity } from "./cameroon-entities";
import { evaluateEmailLegitimacy, extractEmails } from "./email-rules";
import { evaluateKeywordPatterns } from "./keyword-rules";
import { evaluateLegitimacy } from "./legitimacy-rules";
import { evaluatePaymentChannel } from "./payment-rules";
import { extractCameroonPhoneNumbers, normalizeCameroonPhone } from "./phone-normalizer";

export type VerdictStatus = "HIGH_RISK" | "CAUTION" | "VERIFIED_OFFICIAL";
export type ScamCategory =
  | "CIVIL_SERVICE"
  | "VISA_TRAVEL"
  | "MOBILE_MONEY"
  | "INVESTMENT_PONZI"
  | "ECOMMERCE"
  | "OTHER";

export interface VerificationInput {
  text: string;
  claimedEntity?: string | null;
  phoneNumbers?: string[];
  emails?: string[];
  amount?: string | null;
  paymentMethod?: string | null;
  isKnownFlaggedInDb?: boolean;
  isKnownApprovedInDb?: boolean;
  webCorroboration?: {
    foundOfficialSource: boolean;
    sources: { title: string; url: string }[];
  } | null;
}

export interface WebSource {
  title: string;
  url: string;
}

export interface VerificationResult {
  verdict: VerdictStatus;
  score: number; // 0 to 100
  category: ScamCategory;
  evidenceBullets: {
    en: string[];
    fr: string[];
  };
  officialEntity: OfficialInstitution | null;
  officialWebsite: string | null;
  anticHotline: string;
  sources: WebSource[];
  whatsappWarning: {
    en: string;
    fr: string;
  };
  extractedFacts: {
    phones: string[];
    emails: string[];
    entity: string | null;
    amount: string | null;
  };
}

export function runRulesEngine(input: VerificationInput): VerificationResult {
  const text = input.text.trim();
  const lower = text.toLowerCase();

  // 1. Extract phone numbers and emails
  const extractedPhones = extractCameroonPhoneNumbers(text);
  if (input.phoneNumbers) {
    for (const p of input.phoneNumbers) {
      const parsed = normalizeCameroonPhone(p);
      if (parsed.isValid && !extractedPhones.some((ep) => ep.normalized === parsed.normalized)) {
        extractedPhones.push(parsed);
      }
    }
  }

  const extractedEmails = extractEmails(text);
  if (input.emails) {
    for (const e of input.emails) {
      if (!extractedEmails.some((ee) => ee.original === e.toLowerCase())) {
        extractedEmails.push({
          original: e.toLowerCase(),
          domain: e.toLowerCase().split("@")[1] || "",
          isFreeDomain: true,
          isOfficialGovDomain: e.endsWith(".gov.cm") || e.endsWith(".cm"),
        });
      }
    }
  }

  // 2. Identify entity
  let officialEntity: OfficialInstitution | null = null;
  if (input.claimedEntity) {
    officialEntity = findOfficialEntity(input.claimedEntity);
  }
  if (!officialEntity) {
    officialEntity = findOfficialEntity(text);
  }

  // 3. Evaluate email legitimacy
  const emailEval = evaluateEmailLegitimacy(extractedEmails, officialEntity?.acronym);

  // 4. Evaluate payment channel
  const paymentEval = evaluatePaymentChannel(text, extractedPhones, officialEntity?.acronym);

  // 5. Evaluate Cameroon scam patterns
  const keywordPatternMatch = evaluateKeywordPatterns(text);

  // 6. Tally Score & Bullets
  const bulletsEn: string[] = [];
  const bulletsFr: string[] = [];
  let riskScore = 0;
  let category: ScamCategory = "OTHER";

  if (input.isKnownFlaggedInDb) {
    riskScore += 95;
    bulletsEn.push(
      "This contact number or account has already been confirmed and reported by multiple victims in the CheckAm scam registry.",
    );
    bulletsFr.push(
      "Ce numéro ou compte a déjà été confirmé et signalé par plusieurs victimes dans le registre national CheckAm.",
    );
  }

  if (keywordPatternMatch) {
    category = keywordPatternMatch.category;
    riskScore += 45;
    bulletsEn.push(keywordPatternMatch.evidenceBulletEn);
    bulletsFr.push(keywordPatternMatch.evidenceBulletFr);
  }

  if (
    emailEval.hasFreeEmailForGovEntity &&
    emailEval.evidenceBulletEn &&
    emailEval.evidenceBulletFr
  ) {
    riskScore += 40;
    bulletsEn.push(emailEval.evidenceBulletEn);
    bulletsFr.push(emailEval.evidenceBulletFr);
  }

  if (paymentEval.evidenceBulletEn && paymentEval.evidenceBulletFr) {
    if (paymentEval.hasMomoReversalPattern) {
      category = "MOBILE_MONEY";
      riskScore += 80;
    } else if (paymentEval.hasIllicitMomoRequest) {
      riskScore += 35;
    }
    bulletsEn.push(paymentEval.evidenceBulletEn);
    bulletsFr.push(paymentEval.evidenceBulletFr);
  }

  // Official domain verification check
  const hasLegitGovDomain =
    extractedEmails.some((e) => e.isOfficialGovDomain) ||
    (officialEntity?.officialDomains.some((d) => lower.includes(d)) ?? false);

  if (
    hasLegitGovDomain &&
    !emailEval.hasFreeEmailForGovEntity &&
    !paymentEval.hasIllicitMomoRequest &&
    !paymentEval.hasMomoReversalPattern &&
    !keywordPatternMatch
  ) {
    riskScore = 5;
    bulletsEn.push(
      `Matches official Cameroon government communication channel (${officialEntity?.acronym || "Official Institution"}).`,
    );
    bulletsFr.push(
      `Correspond aux canaux officiels de communication du Gouvernement Camerounais (${officialEntity?.acronym || "Institution Officielle"}).`,
    );
    bulletsEn.push(
      `Official verified website: ${officialEntity?.officialWebsites[0] || "https://www.prc.cm"}.`,
    );
    bulletsFr.push(
      `Site web officiel vérifié : ${officialEntity?.officialWebsites[0] || "https://www.prc.cm"}.`,
    );
    bulletsEn.push(
      `Payment rule: ${officialEntity?.authorizedPaymentChannels.en || "Public Treasury"}`,
    );
    bulletsFr.push(
      `Règle de paiement : ${officialEntity?.authorizedPaymentChannels.fr || "Trésor Public"}`,
    );
  }

  // Legitimacy relief: positive evidence lowers the score and claims
  // bullet slots before generic pads do. Never applies on the HIGH_RISK
  // path or the official domain path. A real red flag always outranks
  // softeners, so legit fills after risk bullets.
  const highRiskBound =
    riskScore >= 45 ||
    input.isKnownFlaggedInDb ||
    emailEval.hasFreeEmailForGovEntity ||
    paymentEval.hasMomoReversalPattern;
  const officialPath = hasLegitGovDomain && riskScore < 20;

  let legitRelief = 0;
  if (!highRiskBound && !officialPath) {
    const signals = evaluateLegitimacy(
      text,
      extractedEmails.map((e) => ({ original: e.original, domain: e.domain })),
    );
    const web = input.webCorroboration;
    const webTitles =
      web?.foundOfficialSource && web.sources
        ? web.sources.map((s) => s.title).filter(Boolean)
        : [];
    legitRelief = Math.min(30, 10 * signals.length) + (web?.foundOfficialSource ? 5 : 0);
    legitRelief = Math.min(35, legitRelief);
    if (legitRelief > 0) {
      if (webTitles.length > 0) {
        bulletsEn.push(`Corroborated online: ${webTitles.slice(0, 2).join("; ")}.`);
        bulletsFr.push(`Confirmé en ligne : ${webTitles.slice(0, 2).join(" ; ")}.`);
      }
      for (const s of signals) {
        if (bulletsEn.length >= 3) break;
        bulletsEn.push(s.en);
        bulletsFr.push(s.fr);
      }
    }
  }

  // Default fallback bullets if less than 3
  if (bulletsEn.length === 0) {
    if (officialEntity) {
      bulletsEn.push(`Claims connection to ${officialEntity.nameEn} (${officialEntity.acronym}).`);
      bulletsFr.push(
        `Prétend être affilié au ${officialEntity.nameFr} (${officialEntity.acronym}).`,
      );
    } else {
      bulletsEn.push(
        "Contains unverified solicitation without verifiable official registration numbers.",
      );
      bulletsFr.push(
        "Contient une sollicitation non vérifiée sans numéro d'immatriculation officiel.",
      );
    }
  }

  if (bulletsEn.length === 1) {
    if (officialEntity) {
      bulletsEn.push(`Official ministerial rule: ${officialEntity.authorizedPaymentChannels.en}`);
      bulletsFr.push(
        `Règle ministérielle officielle : ${officialEntity.authorizedPaymentChannels.fr}`,
      );
    } else {
      bulletsEn.push(
        "Always verify through the national cybersecurity hotline (ANTIC 8202) before transferring funds.",
      );
      bulletsFr.push(
        "Vérifiez toujours auprès du numéro vert de cybersécurité (ANTIC 8202) avant tout transfert.",
      );
    }
  }

  if (bulletsEn.length === 2) {
    bulletsEn.push(
      "National Cyber Security Agency (ANTIC) warning: Never send money or confidential OTPs over WhatsApp.",
    );
    bulletsFr.push(
      "Alerte de l'Agence Nationale des TIC (ANTIC) : N'envoyez jamais d'argent ni de code OTP sur WhatsApp.",
    );
  }

  // Cap at top 3 crisp evidence bullets
  const finalBulletsEn = bulletsEn.slice(0, 3);
  const finalBulletsFr = bulletsFr.slice(0, 3);

  // Determine Verdict Status. Legitimacy relief only softens CAUTION;
  // HIGH_RISK triggers and the official domain path are untouched.
  // (legitRelief computed above, beside the bullets it produced.)
  const cleanSources = (input.webCorroboration?.sources ?? [])
    .filter((s) => typeof s?.url === "string" && /^https?:\/\//i.test(s.url))
    .filter((s, i, arr) => arr.findIndex((o) => o.url === s.url) === i)
    .slice(0, 3)
    .map((s) => ({ title: String(s.title || s.url), url: s.url }));

  let verdict: VerdictStatus = "CAUTION";
  if (highRiskBound) {
    verdict = "HIGH_RISK";
    riskScore = Math.max(riskScore, 85);
  } else if (hasLegitGovDomain && riskScore < 20) {
    verdict = "VERIFIED_OFFICIAL";
    riskScore = Math.min(riskScore, 10);
  } else {
    verdict = "CAUTION";
    riskScore = legitRelief > 0 ? Math.max(15, riskScore - legitRelief) : Math.max(riskScore, 45);
  }

  // Format WhatsApp Alerts
  const phoneListStr = extractedPhones.map((p) => p.normalized).join(", ");
  const warningEn = generateWhatsAppAlert({
    language: "en",
    verdict,
    category,
    bullets: finalBulletsEn,
    phones: phoneListStr,
    entity: officialEntity?.acronym || "UNOFFICIAL",
  });

  const warningFr = generateWhatsAppAlert({
    language: "fr",
    verdict,
    category,
    bullets: finalBulletsFr,
    phones: phoneListStr,
    entity: officialEntity?.acronym || "NON OFFICIEL",
  });

  return {
    verdict,
    score: Math.min(100, Math.max(0, riskScore)),
    category,
    evidenceBullets: {
      en: finalBulletsEn,
      fr: finalBulletsFr,
    },
    officialEntity,
    officialWebsite: officialEntity?.officialWebsites[0] || null,
    anticHotline: "8202",
    sources: cleanSources,
    whatsappWarning: {
      en: warningEn,
      fr: warningFr,
    },
    extractedFacts: {
      phones: extractedPhones.map((p) => p.normalized),
      emails: extractedEmails.map((e) => e.original),
      entity: officialEntity?.acronym || null,
      amount: input.amount || null,
    },
  };
}

function generateWhatsAppAlert(params: {
  language: "en" | "fr";
  verdict: VerdictStatus;
  category: ScamCategory;
  bullets: string[];
  phones: string;
  entity: string;
}): string {
  if (params.language === "fr") {
    const header =
      params.verdict === "HIGH_RISK"
        ? "🚨 *ALERTE ARNAQUE / CHECKAM CAMEROUN* 🚨"
        : params.verdict === "CAUTION"
          ? "⚠️ *ATTENTION - VÉRIFICATION SUSPECTE / CHECKAM* ⚠️"
          : "✅ *COMMUNICATION OFFICIELLE VÉRIFIÉE / CHECKAM* ✅";

    const bulletsFormatted = params.bullets.map((b, i) => `🔹 *${i + 1}.* ${b}`).join("\n");

    return `${header}

Ne vous faites pas avoir ! Ce message a été vérifié sur https://checkam.cm :

${bulletsFormatted}

📞 *Numéro(s) concerné(s) :* ${params.phones || "Non spécifié"}
🛡️ *Signalez gratuitement à l'ANTIC au 8202.*
🔄 *Faites suivre dans vos groupes WhatsApp pour protéger vos proches !*`;
  }

  const header =
    params.verdict === "HIGH_RISK"
      ? "🚨 *SCAM ALERT / CHECKAM CAMEROON* 🚨"
      : params.verdict === "CAUTION"
        ? "⚠️ *CAUTION - SUSPICIOUS NOTICE / CHECKAM* ⚠️"
        : "✅ *OFFICIAL VERIFIED NOTICE / CHECKAM* ✅";

  const bulletsFormatted = params.bullets.map((b, i) => `🔹 *${i + 1}.* ${b}`).join("\n");

  return `${header}

Verify before you pay! This notice was analyzed on https://checkam.cm :

${bulletsFormatted}

📞 *Flagged Contact(s):* ${params.phones || "Not specified"}
🛡️ *Report free to ANTIC hotline 8202.*
🔄 *Forward to your WhatsApp family groups to protect others!*`;
}
