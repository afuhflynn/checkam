import { type OfficialInstitution, findOfficialEntity } from "./cameroon-entities";
import { FREE_EMAIL_DOMAINS, evaluateEmailLegitimacy, extractEmails } from "./email-rules";
import { evaluateKeywordPatterns } from "./keyword-rules";
import { evaluateLegitimacy } from "./legitimacy-rules";
import { evaluatePaymentChannel } from "./payment-rules";
import { evaluateStructuralPatterns } from "./structural-rules";
import { extractHosts, isCameroonGovHost, looksCameroonian } from "./domain-trust";
import { extractCameroonPhoneNumbers, normalizeCameroonPhone } from "./phone-normalizer";

export type VerdictStatus = "HIGH_RISK" | "CAUTION" | "VERIFIED_OFFICIAL";
export type ScamCategory =
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

export type EvidenceTone = "warning" | "reassuring" | "neutral";

// Legitimacy signals that describe something the message did NOT do. They
// count towards the score, but they are never shown as findings.
const ABSENCE_SIGNALS = new Set(["no-payment", "no-urgency"]);

export interface VerificationResult {
  verdict: VerdictStatus;
  score: number; // 0 to 100
  category: ScamCategory;
  evidenceBullets: {
    en: string[];
    fr: string[];
  };
  // Parallel to evidenceBullets by index, so a surface can colour a red flag
  // differently from a fact that eased the score. Absent signals are not
  // evidence and must never be dressed up as findings.
  evidenceTones: EvidenceTone[];
  // Verdict-specific next step, always present. This is the only generic
  // advice the engine emits; it used to be padded into the bullet list, which
  // made every answer end in the same form-rejection boilerplate.
  safetyNote: {
    en: string;
    fr: string;
  };
  officialEntity: OfficialInstitution | null;
  officialWebsite: string | null;
  anticHotline: string;
  sources: WebSource[];
  whatsappWarning: {
    en: string;
    fr: string;
  };
  // Same notice without markdown, for surfaces that do not render asterisks.
  whatsappWarningPlain: {
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
        // Same domain judgement as extractEmails. This path used to hardcode
        // isFreeDomain true and treat any .cm as government, which flagged a
        // real ministry address as a fake free mailbox.
        const original = e.toLowerCase();
        const domain = original.split("@")[1] ?? "";
        extractedEmails.push({
          original,
          domain,
          isFreeDomain: FREE_EMAIL_DOMAINS.has(domain),
          isOfficialGovDomain: isCameroonGovHost(domain),
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

  // 5. Evaluate Cameroon scam patterns. Structural detectors recognise the
  // shape of a scheme and so catch paraphrases the literal trigger list
  // misses. The keyword layer stays the topical authority, so when both fire
  // the category comes from the keyword group and only the evidence and score
  // come from the structural read.
  const keywordPatternMatch = evaluateKeywordPatterns(text);
  const structuralMatch = evaluateStructuralPatterns(text);
  const patternMatch = structuralMatch ?? keywordPatternMatch;
  if (patternMatch && keywordPatternMatch) {
    patternMatch.category = keywordPatternMatch.category;
  }

  // A government institution does not collect a dossier fee by Mobile Money to
  // a personal number, whatever the wording. The official path used to be
  // gated only on a phrase list, so "payez 25000 FCFA par Orange Money" from a
  // real ministry address still came out green. Any payment demand aimed at a
  // person closes the official path, whatever fee phrasing was used.
  const PERSONAL_PAYMENT_HINT =
    /(orange money|mtn momo|mobile money|\bmomo\b|virement|bank transfer|transfert|envoyez|transf(?:e|ère)rez)/i;
  const MONEY_AMOUNT = /(\d[\d\s.,]*)\s*(fcfa|xaf|cfa|francs?\b|f\b)/i;
  const asksForPayment = PERSONAL_PAYMENT_HINT.test(lower) && MONEY_AMOUNT.test(lower);
  const paymentContradictsOfficial = Boolean(officialEntity) && asksForPayment;

  // 6. Tally Score & Findings
  const bulletsEn: string[] = [];
  const bulletsFr: string[] = [];
  const tones: EvidenceTone[] = [];
  // Every finding goes through here so the tone index can never drift out of
  // lockstep with the two language lists.
  const push = (en: string, fr: string, tone: EvidenceTone) => {
    bulletsEn.push(en);
    bulletsFr.push(fr);
    tones.push(tone);
  };
  let riskScore = 0;
  let category: ScamCategory = "OTHER";

  if (input.isKnownFlaggedInDb) {
    riskScore += 95;
    push(
      "Other people who received this same message have already reported this contact.",
      "D'autres personnes ayant reçu ce même message ont déjà signalé ce contact.",
      "warning",
    );
  }

  if (paymentContradictsOfficial) {
    const channel = officialEntity?.authorizedPaymentChannels;
    const trimmed = (value: string | undefined) => (value ?? "").trim().replace(/[.\s]+$/, "");
    push(
      `${officialEntity?.nameEn || "A government institution"} is being asked to take a payment by Mobile Money. ${trimmed(channel?.en) || "These bodies collect through the Public Treasury"}, never through a personal number.`,
      `On demande à ${officialEntity?.nameFr || "une institution publique"} de recevoir un paiement par Mobile Money. ${trimmed(channel?.fr) || "Ces organismes encaissent via le Trésor Public"}, jamais sur un numéro personnel.`,
      "warning",
    );
    riskScore += 40;
  }

  if (patternMatch) {
    category = patternMatch.category;
    // A pattern flagged HIGH_RISK is decisive on its own. A CAUTION pattern
    // is only a red flag to weigh, so it must stay under the 45 point bound
    // and let the rest of the picture decide.
    riskScore += patternMatch.riskLevel === "HIGH_RISK" ? 45 : 20;
    push(patternMatch.evidenceBulletEn, patternMatch.evidenceBulletFr, "warning");
  }

  if (
    emailEval.hasFreeEmailForGovEntity &&
    emailEval.evidenceBulletEn &&
    emailEval.evidenceBulletFr
  ) {
    riskScore += 40;
    push(emailEval.evidenceBulletEn, emailEval.evidenceBulletFr, "warning");
  }

  if (paymentEval.evidenceBulletEn && paymentEval.evidenceBulletFr) {
    if (paymentEval.hasMomoReversalPattern) {
      category = "MOBILE_MONEY";
      riskScore += 80;
    } else if (paymentEval.hasIllicitMomoRequest) {
      riskScore += 35;
    }
    push(paymentEval.evidenceBulletEn, paymentEval.evidenceBulletFr, "warning");
  }

  // Official channel evidence.
  //
  // This used to be satisfied by the message merely *containing* an official
  // domain, and "any .cm domain" counted as official. Both let a scammer mint
  // a VERIFIED_OFFICIAL verdict for themselves by pasting a ministry URL or
  // registering any .cm name, which is the worst failure this product can
  // have: it tells a frightened reader to stop worrying.
  //
  // Evidence is an email address on a Cameroon government domain. Nothing
  // weaker counts:
  //  - a link is attacker chosen, so quoting the real ministry URL proves
  //    nothing about who sent the message;
  //  - an SMS sender name is trivially spoofed, so "MINFOPRA" in the sender
  //    field is not evidence either.
  // A genuine SMS-only notice therefore lands on CAUTION rather than
  // VERIFIED_OFFICIAL. That is the intended trade: a false green tells a
  // frightened reader to stop checking, so we would rather under-claim.
  const officialDomains = (officialEntity?.officialDomains ?? []).map((d) =>
    d.toLowerCase().replace(/^www\./, ""),
  );
  const messageHosts = extractHosts(text);
  const senderIsGov = extractedEmails.some((e) => e.isOfficialGovDomain);
  const hasLegitGovDomain = Boolean(officialEntity) && senderIsGov;

  // A .cm host that is not the claimed institution's own domain. Reported so
  // the reader learns why a convincing looking address did not count.
  const lookalikeHost = messageHosts.find(
    (h) => looksCameroonian(h) && !officialDomains.some((d) => h === d || h.endsWith(`.${d}`)),
  );

  if (
    hasLegitGovDomain &&
    !emailEval.hasFreeEmailForGovEntity &&
    !paymentEval.hasIllicitMomoRequest &&
    !paymentEval.hasMomoReversalPattern &&
    !patternMatch &&
    !paymentContradictsOfficial
  ) {
    riskScore = 5;
    push(
      `The message points at a real Cameroon government channel (${officialEntity?.acronym || "official institution"}).`,
      `Le message renvoie vers un canal gouvernemental camerounais authentique (${officialEntity?.acronym || "institution officielle"}).`,
      "reassuring",
    );
    if (officialEntity?.officialWebsites[0]) {
      push(
        `You can check this yourself at ${officialEntity.officialWebsites[0]}.`,
        `Vous pouvez le vérifier vous-même sur ${officialEntity.officialWebsites[0]}.`,
        "reassuring",
      );
    }
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
        push(
          `We found this on the web: ${webTitles.slice(0, 2).join("; ")}.`,
          `Nous avons retrouvé cela en ligne : ${webTitles.slice(0, 2).join(" ; ")}.`,
          "reassuring",
        );
      }
      for (const s of signals) {
        if (bulletsEn.length >= 3) break;
        // Absence signals ("the message does not ask for money") soften the
        // score but are not findings. Listing them is what made every benign
        // message read like a linter had something to report.
        if (ABSENCE_SIGNALS.has(s.key)) continue;
        push(s.en, s.fr, "reassuring");
      }
    }
  }

  // Cap at top 3 crisp findings. Tones slice alongside the two language lists
  // so all three stay index-aligned.
  const finalBulletsEn = bulletsEn.slice(0, 3);
  const finalBulletsFr = bulletsFr.slice(0, 3);
  const finalTones = tones.slice(0, 3);

  // No padding. A message that trips nothing yields an empty finding list and
  // an honest "we could not tell from this" note, rather than three invented
  // advisories dressed as evidence.

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

  // Coercive threats get their own guidance rather than a payment warning.
  // Telling someone being blackmailed to "confirm before you act" is useless,
  // and the one thing they must hear is that paying does not end it.
  const COERCIVE_SAFETY = {
    en: "Do not pay and do not reply. Paying is what these schemes depend on, it rarely stops them, and they often escalate afterwards. Do not meet anyone in person. Take screenshots of everything now: the full conversation, the profile, the phone number, and the threats. Then report it to the police and to the ANTIC hotline on 8202, and tell someone you trust so you are not carrying it alone. Nothing you send or pay can be taken back, but the evidence you keep can still be used against them.",
    fr: "Ne payez pas et ne répondez pas. Le paiement est ce sur quoi ces mécanismes reposent, cela s'arrête rarement, et ils escaladent souvent ensuite. Ne rencontrez personne en personne. Faites tout de suite des captures d'écran : la conversation entière, le profil, le numéro et les menaces. Signalez ensuite à la police et au numéro de l'ANTIC, le 8202, et parlez-en à une personne de confiance pour ne pas porter cela seul. Rien de ce que vous envoyez ou payez ne peut être repris, mais les preuves que vous conservez peuvent encore servir contre eux.",
  };
  const MINOR_SAFETY = {
    en: "If you are under 18, tell a parent, a teacher or a trusted adult today, and do not meet this person. This kind of threat against a minor is reported to child protection services, and the material being demanded is not your fault and does not make you in trouble.",
    fr: "Si vous avez moins de 18 ans, parlez-en aujourd'hui à un parent, un enseignant ou un adulte de confiance, et ne rencontrez pas cette personne. Ce type de menace contre un mineur est signalé aux services de protection de l'enfance, et ce qu'on vous demande d'envoyer n'est pas de votre faute et ne vous met pas en difficulté.",
  };

  const PHISHING_SAFETY = {
    en: "Do not click the link and do not enter anything on the page it opens. Your bank, your operator and the government already have your card and your phone number, so a message asking you to log in or confirm details is always fake. Open the app yourself, or type the address into your browser. If you already entered your details, change the password and call your bank now. Report the sender on the ANTIC hotline, 8202.",
    fr: "Ne cliquez pas sur le lien et ne saisissez rien sur la page qu'il ouvre. Votre banque, votre opérateur et l'État ont déjà votre carte et votre numéro, donc un message qui vous demande de vous connecter ou de confirmer vos informations est toujours faux. Ouvrez l'application vous-même, ou saisissez l'adresse dans votre navigateur. Si vous avez déjà saisi vos informations, changez le mot de passe et appelez votre banque immédiatement. Signalez l'expéditeur au numéro de l'ANTIC, le 8202.",
  };

  const safetyNote =
    category === "SEXTORTION" || category === "EXTORTION"
      ? {
          en: `${COERCIVE_SAFETY.en}\n\n${MINOR_SAFETY.en}`,
          fr: `${COERCIVE_SAFETY.fr}\n\n${MINOR_SAFETY.fr}`,
        }
      : category === "PHISHING"
        ? PHISHING_SAFETY
        : verdict === "HIGH_RISK"
          ? {
              en: "Do not send money, documents, or any code from a text message. If you already paid, contact your Mobile Money operator at once and report it free on the ANTIC hotline, 8202.",
              fr: "N'envoyez ni argent, ni documents, ni aucun code à partir d'un SMS. Si vous avez déjà payé, contactez immédiatement votre opérateur Mobile Money et signalez gratuitement au numéro de l'ANTIC, le 8202.",
            }
          : verdict === "VERIFIED_OFFICIAL"
            ? {
                en: "This points at an official channel. Still open the institution's own website yourself instead of using the link in the message, and never send an OTP to anyone.",
                fr: "Cela renvoie vers un canal officiel. Ouvrez vous-même le site officiel de l'institution plutôt que d'utiliser le lien du message, et n'envoyez jamais un OTP à quiconque.",
              }
            : finalBulletsEn.length === 0
              ? {
                  en: "We found no clear signal either way, which usually means the message is too short to judge. Send the full text plus the phone number or email address it came from, and check on the organisation's own website before you act.",
                  fr: "Nous n'avons trouvé aucun indice clair dans un sens ou l'autre, ce qui signifie généralement que le message est trop court pour être jugé. Envoyez le texte complet ainsi que le numéro ou l'adresse e-mail d'origine, et vérifiez sur le site officiel de l'organisation avant d'agir.",
                }
              : {
                  en: "Before you act, confirm on the organisation's own website or by calling their official line. Never send an OTP, a pin, or a code to anyone who asks for it, and report it free on the ANTIC hotline, 8202.",
                  fr: "Avant d'agir, confirmez sur le site officiel de l'organisation ou en appelant leur ligne officielle. N'envoyez jamais un OTP, un code ou un PIN à quiconque vous le demande, et signalez gratuitement au numéro de l'ANTIC, le 8202.",
                };

  // Format forwardable notices. Markdown for WhatsApp, plain for Facebook and
  // SMS, which render asterisks literally.
  const phoneListStr = extractedPhones.map((p) => p.normalized).join(", ");
  const emailList = extractedEmails.map((e) => e.original);
  const amountStr = input.amount || null;
  const warningEn = renderAlert({
    language: "en",
    verdict,
    category,
    bullets: finalBulletsEn,
    phones: phoneListStr,
    emails: emailList,
    entity: officialEntity?.acronym || "UNOFFICIAL",
    amount: amountStr,
    nextStep: safetyNote.en,
    format: "markdown",
  });
  const warningFr = renderAlert({
    language: "fr",
    verdict,
    category,
    bullets: finalBulletsFr,
    phones: phoneListStr,
    emails: emailList,
    entity: officialEntity?.acronym || "NON OFFICIEL",
    amount: amountStr,
    nextStep: safetyNote.fr,
    format: "markdown",
  });
  const warningEnPlain = renderAlert({
    language: "en",
    verdict,
    category,
    bullets: finalBulletsEn,
    phones: phoneListStr,
    emails: emailList,
    entity: officialEntity?.acronym || "UNOFFICIAL",
    amount: amountStr,
    nextStep: safetyNote.en,
    format: "plain",
  });
  const warningFrPlain = renderAlert({
    language: "fr",
    verdict,
    category,
    bullets: finalBulletsFr,
    phones: phoneListStr,
    emails: emailList,
    entity: officialEntity?.acronym || "NON OFFICIEL",
    amount: amountStr,
    nextStep: safetyNote.fr,
    format: "plain",
  });

  return {
    verdict,
    score: Math.min(100, Math.max(0, riskScore)),
    category,
    evidenceBullets: {
      en: finalBulletsEn,
      fr: finalBulletsFr,
    },
    evidenceTones: finalTones,
    safetyNote,
    officialEntity,
    officialWebsite: officialEntity?.officialWebsites[0] || null,
    anticHotline: "8202",
    sources: cleanSources,
    whatsappWarning: { en: warningEn, fr: warningFr },
    whatsappWarningPlain: { en: warningEnPlain, fr: warningFrPlain },
    extractedFacts: {
      phones: extractedPhones.map((p) => p.normalized),
      emails: extractedEmails.map((e) => e.original),
      entity: officialEntity?.acronym || null,
      amount: input.amount || null,
    },
  };
}

export type AlertFormat = "markdown" | "plain";

function extractPaymentMethod(bullets: string[]): string | null {
  const patterns = [/orange money/i, /mtn momo/i, /mobile money/i, /bank transfer/i, /virement/i];
  for (const bullet of bullets) {
    for (const pattern of patterns) {
      const match = bullet.match(pattern);
      if (match) return match[0];
    }
  }
  return null;
}

function renderAlert(params: {
  language: "en" | "fr";
  verdict: VerdictStatus;
  category: ScamCategory;
  bullets: string[];
  phones: string;
  emails: string[];
  entity: string;
  amount: string | null;
  nextStep: string;
  format: AlertFormat;
}): string {
  const fr = params.language === "fr";
  const strong = (text: string) => (params.format === "markdown" ? `*${text}*` : text);
  const replaceDashes = (text: string) => text.replace(/[\u2014\u2013]/g, "-");
  const stripEmojis = (text: string) =>
    text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");

  const header =
    params.verdict === "HIGH_RISK"
      ? fr
        ? "Alerte arnaque - CheckAm Cameroun"
        : "Scam alert - CheckAm Cameroon"
      : params.verdict === "CAUTION"
        ? fr
          ? "Attention, message a verifier - CheckAm"
          : "Caution, message to verify - CheckAm"
        : fr
          ? "Communication officielle - CheckAm"
          : "Official communication - CheckAm";

  const intro = fr
    ? "Ce message a ete analyse sur checkam.cm :"
    : "This message was analyzed on checkam.cm:";

  const sections: string[] = [strong(header), "", intro];

  if (params.bullets.length > 0) {
    const bulletLines = params.bullets.map((b) => `- ${stripEmojis(replaceDashes(b))}`);
    sections.push("", bulletLines.join("\n"));
  }

  const contactLines: string[] = [];
  if (params.phones) {
    contactLines.push(fr ? `Numero a surveiller : ${params.phones}` : `Number to watch: ${params.phones}`);
  } else if (params.emails.length > 0) {
    contactLines.push(fr ? `Email a surveiller : ${params.emails[0]}` : `Email to watch: ${params.emails[0]}`);
  }
  if (params.entity && params.entity !== "UNOFFICIAL" && params.entity !== "NON OFFICIEL") {
    contactLines.push(fr ? `Entite : ${params.entity}` : `Entity: ${params.entity}`);
  }
  if (params.amount) {
    contactLines.push(fr ? `Montant demande : ${params.amount}` : `Amount demanded: ${params.amount}`);
  }
  const paymentMethod = extractPaymentMethod(params.bullets);
  if (paymentMethod) {
    contactLines.push(fr ? `Methode de paiement : ${paymentMethod}` : `Payment method: ${paymentMethod}`);
  }
  if (contactLines.length > 0) {
    sections.push("", contactLines.join("\n"));
  }

  sections.push("", replaceDashes(stripEmojis(params.nextStep)));

  if (params.verdict === "HIGH_RISK") {
    sections.push("", fr ? "Signalez gratuitement a l'ANTIC au 8202." : "Report it free on the ANTIC hotline, 8202.");
    sections.push(fr ? "Faites suivre a vos groupes WhatsApp pour proteger vos proches." : "Forward this to your family and groups to protect others.");
  }

  return sections.join("\n");
}
