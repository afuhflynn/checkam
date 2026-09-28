import { createOpenAI } from "@ai-sdk/openai";

// OpenRouter AI Gateway client configured with Vercel AI SDK v7.
//
// Use .chat() for every call, not the bare callable. The bare provider defaults
// to OpenAI's Responses API, and OpenRouter only implements /responses for
// some slugs, so a working model still 404s. .chat() pins to /chat/completions,
// which is the surface OpenRouter actually serves for these models.
export const openrouter = createOpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "sk-or-placeholder",
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://checkam.cm",
    "X-Title": "CheckAm Cameroon",
  },
});

export function chatModel(modelId: string) {
  return openrouter.chat(modelId);
}

// OpenRouter validates max_tokens against the key's remaining credit and
// rejects the whole call with "requires more credits" when the requested
// ceiling is larger than the balance can cover. The SDK otherwise infers that
// ceiling from the model's context window, which is tens of thousands of
// tokens. Every call must therefore state a real budget.
export const MAX_OUTPUT_TOKENS = {
  extraction: 1_500,
  answer: 1_200,
  title: 64,
} as const;

// Resilient priority cascade. Every entry was checked against the live
// OpenRouter catalogue before being listed, because a dead slug in the cascade
// is invisible: the loop swallows the error and the turn silently falls back to
// engine copy, which is how the whole system came to read as stiff.
//
// The previous list (gemini-2.0-flash-exp:free, qwen2.5-vl-72b-instruct:free,
// gemma-3-27b-it:free, llama-3.3-70b-instruct:free, gemini-2.0-flash-001) now
// returns 404 "no endpoints" for every slug, so no model prose was produced at
// all. Verified working, cheapest first, all image capable because the flyer
// path rides this same cascade.
export const PRIMARY_VISION_MODELS = [
  // ~2e-8 per prompt token, image + text, verified responding.
  "inclusionai/ling-3.0-flash-vl",
  "deepseek/deepseek-v4.1-flash",
  // Text only, but the most reliable responder in the set and the slug
  // OpenRouter itself recommends when a free one is retired.
  "mistralai/mistral-small-3.1-24b-instruct",
] as const;

// Lightweight in-memory circuit breaker for credit/limit errors (per server instance).
// Prevents hammering OpenRouter when credits are exhausted.
let circuitOpenedAt = 0;
const CIRCUIT_COOLDOWN_MS = 60_000;

export function isAiCircuitOpen(): boolean {
  return Date.now() - circuitOpenedAt < CIRCUIT_COOLDOWN_MS;
}

export function openAiCircuit(): void {
  circuitOpenedAt = Date.now();
}

export function isCreditOrLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /402|429|credit|quota|rate.?limit|insufficient/i.test(msg);
}
