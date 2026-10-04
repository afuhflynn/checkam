import type { Language } from "./dictionary";

// Distinctive stopwords - matched as whole words, never substrings.
const FRENCH_WORDS = new Set([
  "le",
  "la",
  "les",
  "de",
  "des",
  "du",
  "un",
  "une",
  "et",
  "est",
  "vous",
  "nous",
  "votre",
  "vos",
  "notre",
  "pour",
  "avec",
  "dans",
  "que",
  "qui",
  "pas",
  "plus",
  "par",
  "sur",
  "au",
  "aux",
  "ces",
  "son",
  "merci",
  "pardon",
  "veuillez",
  "envoyez",
  "frais",
  "dossier",
  "arnaque",
  "virement",
  "transfert",
  "erreur",
  "silvousplait",
  // Short greetings (spec 0018): these carry real signal for tiny turns.
  "bonjour",
  "salut",
  "bonsoir",
]);

const ENGLISH_WORDS = new Set([
  "the",
  "and",
  "you",
  "your",
  "please",
  "kindly",
  "send",
  "money",
  "received",
  "transfer",
  "error",
  "hello",
  "dear",
  "verify",
  "account",
  "bank",
  "momo",
  "congratulations",
  "winner",
  "urgent",
  // Short greetings (spec 0018): tiny turns like hi now read as English.
  "hi",
  "hey",
  "morning",
]);

/**
 * Detect whether an inbound message (WhatsApp text, caption, SMS) is French or
 * English so the bot can reply in the sender's language. Defaults to French
 * (majority language in Cameroon) when there is no usable signal.
 */
export function detectMessageLanguage(text: string | undefined | null): Language {
  return detectMessageLanguageWithSignal(text).language;
}

/**
 * Language respect (spec 0018): same guess as above, plus a signal flag that
 * tells signal free turns apart from detected ones. Callers use the flag to
 * decide between answering and asking once, instead of silently defaulting.
 */
export function detectMessageLanguageWithSignal(text: string | undefined | null): {
  language: Language;
  hasSignal: boolean;
} {
  if (!text) return { language: "fr", hasSignal: false };
  const lower = text.toLowerCase();
  // French diacritics are a near-certain signal
  if (/[àâäçéèêëîïôöùûüÿœæ]/.test(lower)) return { language: "fr", hasSignal: true };
  const words = lower.match(/[a-z]+/g) ?? [];
  let fr = 0;
  let en = 0;
  for (const w of words) {
    if (FRENCH_WORDS.has(w)) fr += 1;
    if (ENGLISH_WORDS.has(w)) en += 1;
  }
  if (fr === 0 && en === 0) return { language: "fr", hasSignal: false };
  return { language: fr >= en ? "fr" : "en", hasSignal: true };
}
