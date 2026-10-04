import type { Language } from "./dictionary";

/**
 * Language respect (spec 0018): the versioned phrase list that sets a fixed
 * reply language, plus the shared resolution order both surfaces use.
 *
 * Fixed choice always wins. Phrase matching runs only on short turns with no
 * claim markers (callers check that first), so quoted scam text can never flip
 * your voice. Matching is accent blind with longest match winning.
 */

interface FixPhrase {
  phrase: string;
  language: Language;
}

const FIX_PHRASES: FixPhrase[] = [
  { phrase: "respond in english", language: "en" },
  { phrase: "answer in english", language: "en" },
  { phrase: "reply in english", language: "en" },
  { phrase: "english please", language: "en" },
  { phrase: "english only", language: "en" },
  { phrase: "francais uniquement", language: "fr" },
  { phrase: "reponds en francais", language: "fr" },
  { phrase: "repond en francais", language: "fr" },
  { phrase: "reponse en francais", language: "fr" },
  { phrase: "parle francais", language: "fr" },
  { phrase: "en francais", language: "fr" },
];

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Longest matching fix phrase wins, else null. Already normalized both sides. */
export function matchFixPhrase(text: string | undefined | null): Language | null {
  const body = normalizeForMatch(text ?? "");
  if (!body) return null;
  let best: FixPhrase | null = null;
  for (const entry of FIX_PHRASES) {
    if (body.includes(entry.phrase) && (!best || entry.phrase.length > best.phrase.length)) {
      best = entry;
    }
  }
  return best?.language ?? null;
}

export interface ResolveInput {
  /** Saved fixed choice, already resolved from user/session/thread rows. */
  fixed: Language | null;
  /** Raw inbound text for phrase plus detection passes. */
  text: string;
  /** True when the turn is short with no claim markers (phrase matching allowed). */
  shortTurn: boolean;
  /** Stored heuristic from the thread or session, for short notes. */
  storedHeuristic: Language | null;
  /** True when the one time ask already went out on this thread. */
  askSent: boolean;
  /** Fresh guess for this turn, with its signal flag. */
  detected: { language: Language; hasSignal: boolean };
}

export interface ResolveOutput {
  language: Language;
  /** True when the caller should render the bilingual ask instead of a reply. */
  shouldAsk: boolean;
  /** Present when a fix phrase set the language on this turn. */
  fixedByPhrase: Language | null;
}

/**
 * One shared order for web chat and WhatsApp: fixed first, then phrase on
 * short turns, then fresh detection with signal, then the one time ask, then
 * the silent fallback of stored heuristic else English.
 */
export function resolveReplyLanguage(input: ResolveInput): ResolveOutput {
  if (input.fixed) {
    return { language: input.fixed, shouldAsk: false, fixedByPhrase: null };
  }
  if (input.shortTurn) {
    const phrase = matchFixPhrase(input.text);
    if (phrase) {
      return { language: phrase, shouldAsk: false, fixedByPhrase: phrase };
    }
  }
  if (input.detected.hasSignal) {
    return { language: input.detected.language, shouldAsk: false, fixedByPhrase: null };
  }
  if (!input.askSent) {
    return { language: input.storedHeuristic ?? "en", shouldAsk: true, fixedByPhrase: null };
  }
  return {
    language: input.storedHeuristic ?? "en",
    shouldAsk: false,
    fixedByPhrase: null,
  };
}

/** The turn after an ask answers it when it carries a clear en or fr token. */
export function parseAskAnswer(text: string | undefined | null): Language | null {
  const body = ` ${normalizeForMatch(text ?? "")} `;
  const hasEn = /\ben\b/.test(body) || body.includes("english") || body.includes("anglais");
  const hasFr = /\bfr\b/.test(body) || body.includes("francais") || body.includes("french");
  if (hasEn && !hasFr) return "en";
  if (hasFr && !hasEn) return "fr";
  return null;
}
