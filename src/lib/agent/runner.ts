import { generateText } from "ai";
import { loadPrompt } from "../ai/prompts";
import { normalizeCameroonPhone } from "../rules/phone-normalizer";
import {
  PRIMARY_VISION_MODELS,
  isAiCircuitOpen,
  isCreditOrLimitError,
  openAiCircuit,
  openrouter,
} from "../ai/openrouter";
import type { ExtractedFacts } from "../ai/extract-facts";
import {
  flaggedLookupTool,
  registryLookupTool,
  tavilyBudget,
  tavilySearchTool,
  tavilySpentToday,
  verifyCallTool,
  withTimeout,
  withTool,
} from "./tools";

export interface AgentTrace {
  tool: string;
  ok: boolean;
  note?: string;
}

export interface AgentTurn {
  // Null when extraction itself failed; the caller must degrade honest
  // instead of dereferencing.
  facts: ExtractedFacts | null;
  traces: AgentTrace[];
  answer: string | null;
  flagged: boolean;
  sources: { title: string; url: string }[];
  corroborated: boolean;
}

type ToolExecute<T> = (input: T) => Promise<unknown>;

async function runTool<T>(name: string, execute: ToolExecute<T>, input: T): Promise<unknown> {
  const outcome = await withTool(name, () => withTimeout(Promise.resolve(execute(input)), 10_000));
  if (!outcome.ok) throw new Error(outcome.note);
  return outcome.value;
}

async function answerWithCascade(system: string, context: string): Promise<string | null> {
  if (isAiCircuitOpen()) return null;
  for (const model of PRIMARY_VISION_MODELS) {
    try {
      const result = await generateText({
        model: openrouter(model),
        system,
        prompt: context,
        temperature: 0.3,
      });
      if (result.text.trim()) return result.text.trim();
    } catch (err) {
      if (isCreditOrLimitError(err)) {
        openAiCircuit();
        return null;
      }
    }
  }
  return null;
}

// Normalize any contact to the flagged registry key space: E.164 for
// Cameroon phones, lowercase for mails. Unparseable input yields null.
export function normalizeContact(contact: string): string | null {
  if (contact.includes("@")) {
    const mail = contact.trim().toLowerCase();
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail) ? mail : null;
  }
  const parsed = normalizeCameroonPhone(contact);
  return parsed.isValid ? parsed.normalized : null;
}

// Verdict lexicon the model must never voice: the engine alone decides.
// Anything matching falls back to engine bullets downstream.
const VERDICT_WORDS =
  /\b(high.?risk|haut risque|verified|vérifié|official|officiel|authentic|authentique|safe|sûr|legitimate|légitime|genuine|not a scam|pas une arnaque|garanti)\b/i;

// Verdict lexicon the model must never voice: judgment claims belong to
// the engine alone. Topic words (scam, arnaque, fraud) stay allowed since
// the user asked about them; claims of safety or officialdom do not.
export function scrubVerdictWords(text: string): string | null {
  if (VERDICT_WORDS.test(text)) return null;
  return text;
}
export async function runAgentTurn(params: {
  text: string;
  locale: "en" | "fr";
  skipAnswer?: boolean;
}): Promise<AgentTurn> {
  const { text, locale, skipAnswer } = params;
  const traces: AgentTrace[] = [];
  const turnStart = Date.now();

  const facts = (await runTool("verify", verifyCallTool.execute as ToolExecute<{ text: string }>, {
    text,
  }).catch((err: unknown) => {
    traces.push({ tool: "verify", ok: false, note: String(err) });
    return null;
  })) as ExtractedFacts | null;
  if (facts) traces.push({ tool: "verify", ok: true });
  if (!facts) {
    return { facts: facts as unknown as ExtractedFacts, traces, answer: null, flagged: false, sources: [], corroborated: false };
  }
  if (Date.now() - turnStart > 60_000) {
    return { facts, traces, answer: null, flagged: false, sources: [], corroborated: false };
  }

  let registry: unknown = null;
  if (facts.claimedEntity) {
    try {
      registry = await runTool("registry", registryLookupTool.execute as ToolExecute<{ entity: string }>, {
        entity: facts.claimedEntity,
      });
      traces.push({ tool: "registry", ok: true });
    } catch (err: unknown) {
      traces.push({ tool: "registry", ok: false, note: String(err) });
    }
  }

  let flagged = false;
  let flaggedChecked = 0;
  const contacts = [...facts.phoneNumbers, ...facts.emails];
  for (const contact of contacts) {
    const normalized = normalizeContact(contact);
    if (!normalized) continue;
    flaggedChecked += 1;
    try {
      const hit = (await runTool("flagged", flaggedLookupTool.execute as ToolExecute<{ value: string }>, {
        value: normalized,
      })) as { found: boolean };
      if (hit.found) {
        flagged = true;
        break;
      }
    } catch (err: unknown) {
      traces.push({ tool: "flagged", ok: false, note: String(err) });
    }
  }
  traces.push({ tool: "flagged", ok: true, note: `checked:${flaggedChecked} hit:${flagged}` });

  const miss =
    (!registry || (registry as { found?: boolean }).found === false) &&
    !flagged &&
    facts.suspiciousPhrases.length === 0;

  // Tavily fires at most twice per turn: the initial attempt plus the one
  // retry inside withTool. Budget, locale, and PII redaction live in tools.ts.
  let passages: { title?: string; url?: string }[] | null = null;
  if (miss) {
    const spent = await tavilySpentToday().catch(() => Number.MAX_SAFE_INTEGER);
    if (spent < tavilyBudget()) {
      try {
        passages = (await runTool(
          "tavily",
          tavilySearchTool.execute as ToolExecute<{ query: string; locale: "en" | "fr" }>,
          { query: facts.summaryClaim || text.slice(0, 200), locale },
        )) as { title?: string; url?: string }[];
        traces.push({ tool: "tavily", ok: true });
      } catch (err: unknown) {
        traces.push({ tool: "tavily", ok: false, note: String(err) });
      }
    } else {
      traces.push({ tool: "tavily", ok: false, note: "budget_exhausted" });
    }
  }

  const prompt = loadPrompt("chat-answer");
  const context = [
    `Locale: ${locale}`,
    `Facts: ${JSON.stringify(facts)}`,
    `Registry: ${JSON.stringify(registry)}`,
    `Flagged: ${flagged}`,
    `Web: ${JSON.stringify(passages)}`,
    `Suspect text: ${text.slice(0, 2000)}`,
  ].join("\n");
  const raw = skipAnswer ? null : await answerWithCascade(prompt.body, context);
  // The engine alone voices verdicts; a model that judges gets dropped to
  // engine bullets downstream.
  const answer = raw ? scrubVerdictWords(raw) : null;
  const sources = collectSources(passages);
  const corroborated = isCorroborated(sources, facts);
  return { facts, traces, answer, flagged, sources, corroborated };
}

function collectSources(
  passages: { title?: string; url?: string }[] | null,
): { title: string; url: string }[] {
  return (passages ?? [])
    .filter((p) => typeof p.url === "string" && /^https?:\/\//i.test(p.url))
    .slice(0, 3)
    .map((p) => ({ title: p.title || (p.url as string), url: p.url as string }));
}

function isCorroborated(
  sources: { title: string; url: string }[],
  facts: ExtractedFacts,
): boolean {
  const senderDomains = facts.emails
    .map((e) => e.split("@")[1]?.toLowerCase())
    .filter((d): d is string => Boolean(d));
  return sources.some((s) => {
    try {
      const host = new URL(s.url).hostname.toLowerCase();
      return senderDomains.some((d) => host === d || host.endsWith(`.${d}`));
    } catch {
      return false;
    }
  });
}

// Research without prose for surfaces that only need facts plus sources
// (the landing desk). Same tools, same order, no answer generation.
export async function researchTurn(params: {
  text: string;
  locale: "en" | "fr";
}): Promise<Omit<AgentTurn, "answer">> {
  const full = await runAgentTurn({ ...params, skipAnswer: true });
  const { answer, ...rest } = full;
  void answer;
  return rest;
}

// Title draft (spec 0006 AC-4, owed to 0004): after the first answer, in
// thread language, under 60 chars. Null means the shell fallback applies.
export async function draftTitle(params: {
  userText: string;
  assistantText: string;
  locale: "en" | "fr";
}): Promise<string | null> {
  const prompt = loadPrompt("title-draft");
  const context = `Locale: ${params.locale}\nUser: ${params.userText.slice(0, 300)}\nAssistant: ${params.assistantText.slice(0, 300)}`;
  const title = await answerWithCascade(prompt.body, context);
  if (!title) return null;
  const clean = scrubVerdictWords(title.replace(/["“”]/g, "").trim()) ?? "";
  const short = clean.slice(0, 60);
  return short || null;
}
