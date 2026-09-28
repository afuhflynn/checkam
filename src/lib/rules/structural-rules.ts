// Structural rules: pattern families recognised by the shape of a request
// rather than by an exact phrase.
//
// The keyword layer matches literal substrings, which is precise but brittle:
// "recois l'argent sur mon compte" and "recevoir des transferts sur mon
// compte" are the same scam and only one of them is in a trigger list. These
// detectors look for the components of a scheme instead, so paraphrases,
// rewordings and mixed FR/EN phrasings all land.

import type { ScamPatternMatch } from "./keyword-rules";

interface StructuralRule {
  key: string;
  category: ScamPatternMatch["category"];
  riskLevel: ScamPatternMatch["riskLevel"];
  // All clauses must hold for the rule to fire.
  all: readonly RegExp[];
  evidenceBulletEn: string;
  evidenceBulletFr: string;
}

// Receiving other people's money through your own account, whether or not the
// cut is spelled the same way every time. These two are alternatives, not
// requirements, so they are one clause.
const MULE_RECEIVE =
  /\bre(?:ç|c)(?:evoir|o)[a-z]{0,5}\b[^.!?]{0,80}\b(sur|to|through|on|via)\b[^.!?]{0,20}\b(mon|ma|notre|your|the)\b[^.!?]{0,20}\b(compte|account|wallet|portefeuille)\b|\breceive[sd]?\b[^.!?]{0,80}\b(sur|to|through|on|via)\b[^.!?]{0,20}\b(mon|ma|notre|your|the)\b[^.!?]{0,20}\b(compte|account|wallet|portefeuille)\b/i;

// "Keep a percentage" and "pass the rest on" are both halves of the offer, so
// unlike the others these are genuinely conjunctive.
const MULE_COMMISSION: readonly RegExp[] = [
  /\b(gard(?:e|ez|er)|conserve[rz]?|keep|retain(?:s|ed)?)\b[^.!?]{0,40}\b\d{1,2}\s*(?:%|pour\s*cent|percent)\b/i,
  /\b(envoi(?:e|ez|er)?|transf(?:e|ère|érez|er)|transmett(?:ez|re|s)?|pass(?:ez|er)?|forward|send|remit)\b[^.!?]{0,60}\b(reste|rest|suite|onward|passer|autres|others|argent|funds|money|fonds|montant|amount)\b/i,
];

// A charge demanded before the thing is released. True of scholarships, jobs,
// prizes and customs releases alike, so the category stays generic and the
// topical keyword groups do the naming.
const FEE_BEFORE_RELEASE =
  /\b(frais|fee|charges?|processing|handling|inscription|registration)\b[^.!?]{0,60}\b(lib(?:é|e)r(?:er|ez)?|release|receive|recevoir|obtenir|r[ée]cup(?:é|e)rer|encaisse[rz]?|d[ée]livr[ée]?)\b|\b(pay(?:ez|er|ment)?|vers(?:ez|er)|send|envoy(?:ez|er)?|transfert|transfer)\b[^.!?]{0,50}\b(avant de recevoir|before (?:you )?receive|pour lib(?:é|e)rer|to release|pour obtenir|to claim|pour d[ée]livrer)\b/i;

// Speaking for an institution the reader is meant to fear or obey. The second
// clause is the common case on its own.
const IMPERSONATED_AUTHORITY: readonly RegExp[] = [
  /\b(au nom de|agissant au nom de|de la part de|acting on behalf of|on behalf of)\s+(l['’]?antic|antic|la banque|the bank|la police|the police|le ministre|the minister|le commissioner|le gouverneur)\b/i,
  /\b(je suis|this is|i am|i'm)\s+(le|la|the)\s+(ministre|minister|commissaire|inspecteur|gouverneur|governor|directeur g[ée]n[ée]ral)\b/i,
];

// Asking for the one thing that hands over the account: a code, a pin, an OTP.
const CREDENTIAL_REQUEST =
  /\b(envoy(?:ez|er)?|send|donne[rz]?|share|partag(?:ez|er)|transmettez|give)\b[^.!?]{0,40}\b(otp|code de validation|verification code|code de securite|pin|secret code|code\s*otp)\b/i;

const RULES: StructuralRule[] = [
  {
    key: "mule-receive",
    category: "MONEY_LAUNDERING",
    riskLevel: "HIGH_RISK",
    all: [MULE_RECEIVE],
    evidenceBulletEn:
      "This asks you to receive money through your own account and pass it on to someone else. You would be holding the money and the liability, and if it was stolen, the account that gets frozen is yours. A percentage for the trouble is not a salary.",
    evidenceBulletFr:
      "Ce message vous demande de recevoir de l'argent sur votre propre compte et de le transmettre à un tiers. Vous détiendriez l'argent et la responsabilité, et si les fonds sont volés, c'est votre compte qui sera bloqué. Une commission pour ce service n'est pas un salaire.",
  },
  {
    key: "mule-commission",
    category: "MONEY_LAUNDERING",
    riskLevel: "HIGH_RISK",
    all: MULE_COMMISSION,
    evidenceBulletEn:
      "This offers to pay you a percentage for moving other people's money through your account. It is money laundering, and the risk lands on you rather than on whoever recruited you.",
    evidenceBulletFr:
      "Ce message propose de vous verser un pourcentage pour faire transiter l'argent d'autres personnes via votre compte. Il s'agit de blanchiment d'argent, et le risque retombe sur vous plutôt que sur celui qui vous a recruté.",
  },
  {
    key: "fee-before-release",
    category: "OTHER",
    riskLevel: "HIGH_RISK",
    all: [FEE_BEFORE_RELEASE],
    evidenceBulletEn:
      "It asks you to pay before you receive anything. A scholarship, a job, a prize or a customs release is never unlocked by a fee you send first, whatever the offer claims to be.",
    evidenceBulletFr:
      "Il vous demande de payer avant de recevoir quoi que ce soit. Une bourse, un emploi, un prix ou une mainlevée douanière ne se débloque jamais par des frais envoyés à l'avance, quelle que soit l'annonce.",
  },
  {
    key: "impersonated-authority",
    category: "IMPERSONATION",
    riskLevel: "CAUTION",
    all: IMPERSONATED_AUTHORITY,
    evidenceBulletEn:
      "The sender claims to speak for an institution or a named official. Cameroon ministries, ANTIC and banks do not introduce themselves over SMS or WhatsApp, and they never ask for an OTP, a pin, or a Mobile Money transfer.",
    evidenceBulletFr:
      "L'expéditeur prétend parler au nom d'une institution ou d'une personnalité officielle. Les ministères, l'ANTIC et les banques ne se présentent jamais par SMS ou WhatsApp, et ne demandent jamais un OTP, un code ni un transfert Mobile Money.",
  },
  {
    key: "credential-request",
    category: "MOBILE_MONEY",
    riskLevel: "HIGH_RISK",
    all: [CREDENTIAL_REQUEST],
    evidenceBulletEn:
      "It asks for a one-time code or a pin. Whoever needs it can move money from your account, and no bank, ministry, operator or employer will ever ask you to share one. Anyone who does already has access to your account.",
    evidenceBulletFr:
      "Il demande un code à usage unique ou un code secret. Quiconque l'obtient peut déplacer de l'argent depuis votre compte, et aucune banque, aucun ministère, aucun opérateur ni employeur ne vous le demandera. Celui qui le demande a déjà accès à votre compte.",
  },
];

export function evaluateStructuralPatterns(text: string): ScamPatternMatch | null {
  for (const rule of RULES) {
    if (rule.all.every((clause) => clause.test(text))) {
      return {
        category: rule.category,
        riskLevel: rule.riskLevel,
        matchedPhrases: [rule.key],
        evidenceBulletEn: rule.evidenceBulletEn,
        evidenceBulletFr: rule.evidenceBulletFr,
      };
    }
  }
  return null;
}
