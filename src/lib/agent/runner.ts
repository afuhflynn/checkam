import { generateText } from "ai";
import { loadPrompt } from "../ai/prompts";
import { normalizeCameroonPhone } from "../rules/phone-normalizer";
import {
  MAX_OUTPUT_TOKENS,
  PRIMARY_VISION_MODELS,
  isAiCircuitOpen,
  isCreditOrLimitError,
  openAiCircuit,
  chatModel,
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
        model: chatModel(model),
        system,
        prompt: context,
        temperature: 0.3,
        maxOutputTokens: MAX_OUTPUT_TOKENS.answer,
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

// A judgement pronouncement about the message under review. The engine alone
// decides the verdict, so a model that pronounces one is dropped downstream.
//
// Precision matters more than breadth here. A bare "official" or "verified"
// word was disqualifying whole answers under the v2 broad lexicon, and since
// the subject matter IS ministries, embassies and scholarships, that threw
// away almost every grounded answer and shipped the boilerplate fallback
// instead. So each pattern must show the word actually being used as a verdict,
// not as a description of a source, a channel, or a search result.
//
// Allowed, and must stay allowed: "not an official channel", "unofficial",
// "unverified", "we could not find this on the ministry site", "the official
// website lists", "a verified address does not prove the sender".
const VERDICT_CLAIMS: RegExp[] = [
  // "this is a scam / official / genuine / safe ..."
  /\b(this|that|it|here|that's|it's|c'est|cette|ce|celui[- ]ci)\s*'?\s*(is|are|looks?|seems?|appears?|est|sont)\s+(like\s+|comme\s+)?(a\s+|an\s+|the\s+|un\s+|une\s+|l')?(scam|arnaque|fraud|fraude|phishing|legit\w+|l[ée]gitime\w*|officiel\w*|official|authentic\w*|authentique\w*|safe|sûr|real|r[ée]el|genuine|trustworthy)\b/i,
  // "c'est une arnaque" carries its verb inside the contraction, so it needs
  // its own shape rather than the subject + verb alternation above.
  /\bc'est\s+(un|une|le|la|l'|vraiment|totalement)?\s*(scam|arnaque|fraude|fraud|phishing|legit\w+|l[ée]gitime\w*|officiel\w*|authentic\w*|authentique\w*|sûr|r[ée]el)\b/i,
  // "is legitimate / is authentic / c'est sûr ..."
  /\b(is|are|was|were|'s|est|sont|[ée]tait)\s+(legit\w*|l[ée]gitime\w*|authentic\w*|authentique\w*|safe|sûr|trustworthy|real|r[ée]el|genuine)\b/i,
  // Declaring it clean is still a verdict.
  /\b(not a scam|not a fraud|no scam|pas une arnaque|ce n'est pas une arnaque|c'est legitime)\b/i,
  // "guaranteed safe / garanti officiel"
  /\b(guarantee[ds]?|garanti[es]?)\s+(safe|legit\w*|l[ée]gitime\w*|official|officiel\w*|genuine|real|r[ée]el|secure)\b/i,
  // Reassurance the reader did not ask for. Scoped to the reassurance idiom
  // only: the model is *supposed* to say "do not send money", and a bare
  // "do not" ban would reject exactly the advice we want.
  /\b(do not|don't|dont|no need to|ne vous inquiete[z]? pas|n'ayez pas)\s*(worry|panic|fear|be afraid|inqui[ée]t)\b/i,
  /\b(you are|you're|you can be|tu es|vous etes)\s+(safe|protected|covered|tranquille|tranqui[le]le)\b/i,
  // A verdict stamped on the opportunity itself rather than on the message.
  /\b(legit\w*|l[ée]gitime\w*|verified|v[ée]rifi[ée]|official|officiel\w*|genuine|real)\s+(offer|opportunity|recruitment|recruiter|programme|program|scholarship|bursary|employer|company|annonce)\b/i,
  /\b(is|are|est)\s+(safe|legit\w*|l[ée]gitime\w*)\s+to\s+(pay|send|apply|proceed|post|payer|envoyer)\b/i,
];

// Judgment claims belong to the engine alone. Topic words (scam, arnaque,
// fraud) stay allowed since the reader asked about them; claims of safety or
// officialdom do not.
export function scrubVerdictWords(text: string): string | null {
  for (const pattern of VERDICT_CLAIMS) {
    if (pattern.test(text)) return null;
  }
  return text;
}
export async function runAgentTurn(params: {
  text: string;
  locale: "en" | "fr";
  skipAnswer?: boolean;
  // Reuse of stored extraction. Only the fact extraction is cached, so a
  // repeat message still gets fresh research and a fresh written answer. The
  // cache used to short circuit the whole turn, which meant a message checked
  // twice came back as a bare fallback with no evidence and no sources.
  preExtractedFacts?: ExtractedFacts | null;
}): Promise<AgentTurn> {
  const { text, locale, skipAnswer } = params;
  const traces: AgentTrace[] = [];
  const turnStart = Date.now();

  const facts = params.preExtractedFacts
    ? params.preExtractedFacts
    : ((await runTool("verify", verifyCallTool.execute as ToolExecute<{ text: string }>, {
        text,
      }).catch((err: unknown) => {
        traces.push({ tool: "verify", ok: false, note: String(err) });
        return null;
      })) as ExtractedFacts | null);
  if (params.preExtractedFacts) {
    traces.push({ tool: "verify", ok: true, note: "cache" });
  } else if (facts) {
    traces.push({ tool: "verify", ok: true });
  }
  if (!facts) {
    return {
      facts: facts as unknown as ExtractedFacts,
      traces,
      answer: null,
      flagged: false,
      sources: [],
      corroborated: false,
    };
  }
  if (Date.now() - turnStart > 60_000) {
    return { facts, traces, answer: null, flagged: false, sources: [], corroborated: false };
  }

  let registry: unknown = null;
  if (facts.claimedEntity) {
    try {
      registry = await runTool(
        "registry",
        registryLookupTool.execute as ToolExecute<{ entity: string }>,
        {
          entity: facts.claimedEntity,
        },
      );
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
      const hit = (await runTool(
        "flagged",
        flaggedLookupTool.execute as ToolExecute<{ value: string }>,
        {
          value: normalized,
        },
      )) as { found: boolean };
      if (hit.found) {
        flagged = true;
        break;
      }
    } catch (err: unknown) {
      traces.push({ tool: "flagged", ok: false, note: String(err) });
    }
  }
  traces.push({ tool: "flagged", ok: true, note: `checked:${flaggedChecked} hit:${flagged}` });

  // Research always runs now, and runs three angles in parallel rather than
  // one shallow guess. The old gate only fired when nothing at all was known,
  // so a message that matched a keyword or an entity never got looked up, and
  // unfamiliar topics came back as top level guesses.
  //
  // The contact angle is deliberately the sender *domain*, not the phone
  // number: tavilySearchTool redacts phone numbers before they leave the box,
  // and that policy is not something to quietly route around. The in-house
  // flagged registry remains the authoritative check on the number itself.
  const plans = buildResearchPlans(text, facts);
  const spent = await tavilySpentToday().catch(() => Number.MAX_SAFE_INTEGER);
  const allowance = Number.isFinite(spent) ? Math.max(0, tavilyBudget() - spent) : 0;
  const affordable = plans.slice(0, Math.min(plans.length, allowance));

  const settled = await Promise.all(
    affordable.map(async (plan) => {
      try {
        const found = (await runTool(
          "tavily",
          tavilySearchTool.execute as ToolExecute<{ query: string; locale: "en" | "fr" }>,
          { query: plan.query, locale },
        )) as { title?: string; url?: string }[];
        traces.push({ tool: "tavily", ok: true, note: `angle:${plan.angle}` });
        return found;
      } catch (err: unknown) {
        traces.push({ tool: "tavily", ok: false, note: `angle:${plan.angle}` });
        return [];
      }
    }),
  );
  const passages = settled.flat() as { title?: string; url?: string; content?: string }[];
  if (plans.length > 0 && affordable.length === 0) {
    traces.push({ tool: "tavily", ok: false, note: "budget_exhausted" });
  }

  const prompt = loadPrompt("chat-answer");
  // Longform first, question last: the guidance that the suspect text and the
  // web findings sit above the structured summary measurably helps the model
  // reason over them.
  const context = [
    "<suspect_message>",
    text.slice(0, 2000),
    "</suspect_message>",
    "",
    "<web_findings>",
    passages.length
      ? passages
          .map(
            (p, i) =>
              `<result index="${i + 1}">\n<title>${p.title ?? ""}</title>\n<url>${p.url ?? ""}</url>\n<excerpt>${p.content ?? ""}</excerpt>\n</result>`,
          )
          .join("\n")
      : "No web source was found for this message.",
    "</web_findings>",
    "",
    "<extracted_facts>",
    JSON.stringify(facts),
    "</extracted_facts>",
    `<registry_lookup>${JSON.stringify(registry)}</registry_lookup>`,
    `<reported_by_others>${flagged}</reported_by_others>`,
    `<requested_language>${locale === "fr" ? "French (fr-CM)" : "English (en-CM)"}</requested_language>`,
  ].join("\n");
  const raw = skipAnswer ? null : await answerWithCascade(prompt.body, context);
  // The engine alone voices verdicts; a model that judges gets dropped and the
  // transport falls back to prose built from the top finding.
  const answer = raw ? scrubVerdictWords(raw) : null;
  const sources = collectSources(passages);
  const corroborated = isCorroborated(sources, facts);
  return { facts, traces, answer, flagged, sources, corroborated };
}

function collectSources(
  passages: { title?: string; url?: string; content?: string }[] | null,
): { title: string; url: string }[] {
  return (
    (passages ?? [])
      .filter((p) => typeof p.url === "string" && /^https?:\/\//i.test(p.url))
      .map((p) => ({ title: p.title || (p.url as string), url: p.url as string }))
      // Three overlapping queries return the same page many times over.
      .filter((s, i, arr) => arr.findIndex((o) => o.url === s.url) === i)
      .slice(0, 3)
  );
}

// Three research angles, cheapest and most specific first. Deduplicated and
// capped so a message with five emails does not fan out into five searches.
function buildResearchPlans(
  text: string,
  facts: ExtractedFacts,
): { angle: string; query: string }[] {
  const plans: { angle: string; query: string }[] = [];
  const claim = facts.summaryClaim?.trim() || text.replace(/\s+/g, " ").slice(0, 200);
  if (claim) plans.push({ angle: "claim", query: claim });

  const domainCandidates = facts.emails
    .map((e) => e.split("@")[1]?.toLowerCase().trim() ?? "")
    .filter((d) => d.length > 0 && !FREE_MAILBOXES.has(d));
  const domains = [...new Set(domainCandidates)];
  for (const domain of domains.slice(0, 2)) {
    plans.push({
      angle: "domain",
      query: `${domain} ${facts.claimedEntity ?? ""} arnaque OR fraude OR escroquerie`.trim(),
    });
  }

  if (facts.claimedEntity) {
    plans.push({
      angle: "entity",
      query: `${facts.claimedEntity} Cameroun avis officiel recrutement bourse fraude`,
    });
  }
  return plans;
}

const FREE_MAILBOXES = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.fr",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "yandex.com",
  "mail.ru",
  "gmail.cm",
]);

function isCorroborated(sources: { title: string; url: string }[], facts: ExtractedFacts): boolean {
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
