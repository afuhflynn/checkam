import type { NormalizedCameroonPhone } from "./phone-normalizer";

export interface PaymentEvaluationResult {
  hasIllicitMomoRequest: boolean;
  hasAdvanceFeePattern: boolean;
  hasMomoReversalPattern: boolean;
  evidenceBulletEn: string | null;
  evidenceBulletFr: string | null;
}

export const ADVANCE_FEE_PHRASES = [
  "frais de dossier",
  "frais de dossiers",
  "frais de timbre",
  "quittance express",
  "frais d'envoi",
  "frais de déblocage",
  "frais de debloquage",
  "frais de traitement",
  "frais d'insertion",
  "frais de validation",
  "frais d'enregistrement",
  "frais d'inscription express",
  "application fee",
  "file processing fee",
  "express stamp fee",
  "visa dispatch fee",
  "clearance fee",
  "release fee",
];

export const MOMO_REVERSAL_PHRASES = [
  "transfert par erreur",
  "erreur de transfert",
  "veuillez renvoyer",
  "veuillez retourner",
  "renvoyer les 75000",
  "renvoyer les 50000",
  "rembourser par erreur",
  "orange money reversal",
  "mtn momo reversal",
  "wrong transaction please refund",
  "sent by mistake",
  "tap your secret pin",
  "entrez votre code pin",
  "composez votre code secret",
];

export function evaluatePaymentChannel(
  text: string,
  phones: NormalizedCameroonPhone[],
  claimedEntityAcronym?: string | null,
): PaymentEvaluationResult {
  const lower = text.toLowerCase();

  const hasAdvanceFee = ADVANCE_FEE_PHRASES.some((phrase) => lower.includes(phrase));
  const hasMomoReversal = MOMO_REVERSAL_PHRASES.some((phrase) => lower.includes(phrase));

  const mentionsMomoOrOrange =
    lower.includes("orange money") ||
    lower.includes("om") ||
    lower.includes("mtn momo") ||
    lower.includes("momo") ||
    lower.includes("mobile money") ||
    lower.includes("dépôt") ||
    lower.includes("depot") ||
    lower.includes("recharge");

  const hasPhones = phones.length > 0;

  // Case 1: Government or Official Concours soliciting payment via personal MoMo
  if (claimedEntityAcronym && (mentionsMomoOrOrange || hasPhones) && hasAdvanceFee) {
    return {
      hasIllicitMomoRequest: true,
      hasAdvanceFeePattern: true,
      hasMomoReversalPattern: false,
      evidenceBulletEn: `Demands payment of administrative fees via personal Mobile Money (${phones[0]?.normalized || "private phone number"}) instead of a stamped Public Treasury receipt (Quittance du Trésor).`,
      evidenceBulletFr: `Exige le paiement de frais de dossier par Mobile Money personnel (${phones[0]?.normalized || "numéro privé"}) au lieu d'une quittance officielle du Trésor Public.`,
    };
  }

  // Case 2: MoMo Reversal SMS Scam
  if (hasMomoReversal) {
    return {
      hasIllicitMomoRequest: false,
      hasAdvanceFeePattern: false,
      hasMomoReversalPattern: true,
      evidenceBulletEn:
        "Classic Mobile Money reversal fraud: Scammer sends a forged SMS pretending to have mistakenly transferred funds, urging you to refund money never received.",
      evidenceBulletFr:
        "Arnaque classique au faux transfert Mobile Money : L'escroc envoie un faux SMS prétendant un versement par erreur pour vous pousser à renvoyer des fonds inexistants.",
    };
  }

  // Case 3: Generic advance fee with phone number
  if (hasAdvanceFee && (mentionsMomoOrOrange || hasPhones)) {
    return {
      hasIllicitMomoRequest: true,
      hasAdvanceFeePattern: true,
      hasMomoReversalPattern: false,
      evidenceBulletEn:
        "Requires upfront advance fees via Mobile Money before delivering promises (recruitment, visa, loan, or prize).",
      evidenceBulletFr:
        "Exige des frais préalables par Mobile Money avant la délivrance d'un service (recrutement, visa, prêt ou loterie).",
    };
  }

  return {
    hasIllicitMomoRequest: false,
    hasAdvanceFeePattern: hasAdvanceFee,
    hasMomoReversalPattern: false,
    evidenceBulletEn: null,
    evidenceBulletFr: null,
  };
}
