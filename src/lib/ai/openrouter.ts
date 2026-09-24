import { createOpenAI } from "@ai-sdk/openai";

// OpenRouter AI Gateway client configured with Vercel AI SDK v5+
export const openrouter = createOpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "sk-or-placeholder",
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://checkam.cm",
    "X-Title": "CheckAm Cameroon",
  },
});

// Resilient priority cascade: free vision-capable models first, paid fallback last.
// Rules decide the verdict; these models only supply structured facts.
export const PRIMARY_VISION_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "qwen/qwen2.5-vl-72b-instruct:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemini-2.0-flash-001",
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
