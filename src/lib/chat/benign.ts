import { evaluateKeywordPatterns } from "../rules/keyword-rules";
import { ADVANCE_FEE_PHRASES, MOMO_REVERSAL_PHRASES } from "../rules/payment-rules";
import { isNewClaimText } from "../whatsapp/tone";

/**
 * Calm benign gate (spec 0019). Decides from the raw text alone, with no
 * model call, whether an inbound turn is small talk, a product question, or
 * a true check. Claim signals always win: doubt reads as check, never calm.
 */

export type BenignKind = "smalltalk" | "product" | "check";

/** Above this length a turn is never small talk, even with hello in it. */
const SMALLTALK_MAX_LENGTH = 60;

const SMALLTALK_EN = [
  "hi",
  "hello",
  "hey",
  "thanks",
  "thank you",
  "ok",
  "okay",
  "just testing",
  "testing",
  "are you there",
  "who are you",
  "how friendly are you",
];

const SMALLTALK_FR = [
  "salut",
  "bonjour",
  "bonsoir",
  "merci",
  "ok",
  "c est un test",
  "qui es tu",
  "tu es qui",
];

const PRODUCT_EN = ["how does it work", "what can you do", "how do i check"];

const PRODUCT_FR = ["comment ca marche", "que peux tu faire", "comment verifier"];

/** Catches money doubling pitches no trigger list names yet. */
const DOUBLING_PATTERN =
  /\b(doubl|multipl|tripl).{0,16}(money|argent|capital|funds|investment|gain)/i;

/**
 * Pressure words that force the check path even in short turns. Over
 * triggering only keeps today behavior, while under triggering risks a calm
 * reply on a live pitch, so this list leans wide on purpose.
 */
const PRESSURE_PHRASES = [
  "urgent",
  "immediately",
  "right now",
  "deadline",
  "last chance",
  "midnight",
  "today only",
  "hurry",
  "secret",
  "do not tell",
  "dont tell",
  "pin",
  "fee",
  "pay now",
  "pay the fee",
  "send money",
  "send the fee",
  "transfer",
  "vite",
  "immediatement",
  "tout de suite",
  "dernier delai",
  "minuit",
  "confidentiel",
  "ne dis",
  "code pin",
  "code secret",
  "payez",
  "envoyez",
  "transferez",
  "frais",
];

function normalize(body: string): string {
  return body
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

/**
 * Scam phrase safety net (spec 0019). Reuses the decided trigger sources so
 * a short pitch like double your money tomorrow still earns a full check.
 */
export function hasScamPhrase(text: string | undefined | null): boolean {
  const body = (text ?? "").trim();
  if (!body) return false;
  const lower = body.toLowerCase();
  if (DOUBLING_PATTERN.test(body)) return true;
  if (evaluateKeywordPatterns(body) !== null) return true;
  if (includesAny(lower, ADVANCE_FEE_PHRASES.map((phrase) => phrase.toLowerCase()))) return true;
  if (includesAny(lower, MOMO_REVERSAL_PHRASES.map((phrase) => phrase.toLowerCase()))) return true;
  if (includesAny(lower, PRESSURE_PHRASES)) return true;
  return false;
}

export function classifyBenignChat(
  text: string | undefined | null,
  opts?: { hasMediaText?: boolean },
): BenignKind {
  if (opts?.hasMediaText) return "check";
  const body = (text ?? "").trim();
  if (!body) return "check";
  // Claim test first (spec 0019 order): link, phone, amount, email, flyer
  // text, or long text always earns the full check path.
  if (isNewClaimText(body)) return "check";
  if (hasScamPhrase(body)) return "check";
  const clean = normalize(body);
  if (!clean) return "check";
  if (includesAny(clean, [...PRODUCT_EN, ...PRODUCT_FR])) return "product";
  if (body.length <= SMALLTALK_MAX_LENGTH) {
    if (includesAny(clean, [...SMALLTALK_EN, ...SMALLTALK_FR])) return "smalltalk";
  }
  return "check";
}

export const BENIGN_COPY = {
  smalltalk: {
    en: "Hey there, good to see you. Paste a message or a flyer and I will check it for you.",
    fr: "Salut, ravi de vous voir. Collez un message ou un flyer et je le verifie pour vous.",
  },
  product: {
    en: "I check suspicious messages before you pay or trust. Paste the full text, or a clear photo, or a phone number, and I give you a clear verdict with reasons. Try it now, paste what you got.",
    fr: "Je verifie les messages suspects avant que vous payiez ou fassiez confiance. Collez le texte complet, ou une photo claire, ou un numero, et je vous donne un avis clair avec les raisons. Essayez, collez ce que vous avez recu.",
  },
  empty: {
    en: "I could not read this. Please send the full text or a clear picture.",
    fr: "Je nai pas pu lire ce message. Envoyez le texte complet ou une photo claire.",
  },
} as const;

export function renderBenignReply(kind: "smalltalk" | "product", language: "en" | "fr"): string {
  return BENIGN_COPY[kind][language];
}
