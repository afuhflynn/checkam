import { generateText } from "ai";
import { loadPrompt } from "../ai/prompts";
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
  facts: ExtractedFacts;
  traces: AgentTrace[];
  answer: string | null;
  flagged: boolean;
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

// Agent turn (spec 0006): local tools first, Tavily only on miss, title
// after the answer. Facts flow to rules; the agent never decides.
export async function runAgentTurn(params: { text: string; locale: "en" | "fr" }): Promise<AgentTurn> {
  const { text, locale } = params;
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
    return { facts: facts as unknown as ExtractedFacts, traces, answer: null, flagged: false };
  }
  if (Date.now() - turnStart > 60_000) {
    return { facts, traces, answer: null, flagged: false };
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
  if (facts.phoneNumbers.length > 0 || facts.emails.length > 0) {
    const value = facts.phoneNumbers[0] ?? facts.emails[0] ?? "";
    try {
      const hit = (await runTool("flagged", flaggedLookupTool.execute as ToolExecute<{ value: string }>, {
        value,
      })) as { found: boolean };
      flagged = hit.found;
      traces.push({ tool: "flagged", ok: true });
    } catch (err: unknown) {
      traces.push({ tool: "flagged", ok: false, note: String(err) });
    }
  }

  const miss =
    (!registry || (registry as { found?: boolean }).found === false) &&
    !flagged &&
    facts.suspiciousPhrases.length === 0;

  let passages: unknown = null;
  if (miss) {
    const spent = await tavilySpentToday().catch(() => Number.MAX_SAFE_INTEGER);
    if (spent < tavilyBudget()) {
      try {
        passages = await runTool(
          "tavily",
          tavilySearchTool.execute as ToolExecute<{ query: string; locale: "en" | "fr" }>,
          { query: facts.summaryClaim || text.slice(0, 200), locale },
        );
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
  const answer = await answerWithCascade(prompt.body, context);
  return { facts, traces, answer, flagged };
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
  const clean = title.replace(/["“”]/g, "").trim().slice(0, 60);
  return clean || null;
}
