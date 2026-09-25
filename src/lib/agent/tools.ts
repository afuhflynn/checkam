import { tool } from "ai";
import { z } from "zod";
import { db } from "../db";
import { doualaDayStart } from "../chat/day";
import { extractFactsFromTextOrImage } from "../ai/extract-facts";
import { findOfficialEntity } from "../rules/cameroon-entities";

// Tool timeout: 10s plus one retry inside a 60s turn budget (spec 0006).
// The race enforces the deadline even when the underlying call ignores
// abort signals; callers pass the signal where the API accepts one.
export async function withTool<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; note: string }> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const value = await withTimeout(fn(), 10_000);
      return { ok: true, value };
    } catch (err) {
      if (attempt === 1) {
        return { ok: false, note: `${name} failed: ${err instanceof Error ? err.message : "unknown"}` };
      }
    }
  }
  return { ok: false, note: `${name} failed` };
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("tool_timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export const registryLookupTool = tool({
  description: "Look up a claimed entity in the official Cameroon registry.",
  inputSchema: z.object({ entity: z.string().min(1).max(120) }),
  execute: async ({ entity }) => {
    const record = findOfficialEntity(entity);
    if (!record) return { found: false as const };
    return {
      found: true as const,
      acronym: record.acronym,
      domains: record.officialDomains,
      payment: record.authorizedPaymentChannels,
    };
  },
});

export const flaggedLookupTool = tool({
  description: "Check a phone or mail against active flagged identifiers.",
  inputSchema: z.object({ value: z.string().min(1).max(120) }),
  execute: async ({ value }) => {
    const hit = await db.flaggedIdentifier.findFirst({
      where: { normalizedValue: value, isActive: true },
      select: { riskLevel: true, category: true },
    });
    return hit ? { found: true as const, ...hit } : { found: false as const };
  },
});

export const verifyCallTool = tool({
  description: "Extract structured facts from a suspect text.",
  inputSchema: z.object({ text: z.string().min(1).max(8000) }),
  execute: async ({ text }) => extractFactsFromTextOrImage({ text }),
});

function redactPii(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[mail]")
    .replace(/\+?\d[\d\s./-]{7,}\d/g, "[phone]");
}

export const tavilySearchTool = tool({
  description: "Web search for fresh facts when local sources miss.",
  inputSchema: z.object({
    query: z.string().min(1).max(300),
    locale: z.enum(["en", "fr"]).default("fr"),
  }),
  execute: async ({ query, locale }) => {
    const key = process.env.TAVILY_API_KEY;
    if (!key) throw new Error("tavily_not_configured");
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        api_key: key,
        query: redactPii(query).slice(0, 300),
        search_depth: "basic",
        max_results: 3,
        include_answer: false,
      }),
    });
    if (!res.ok) throw new Error(`tavily_${res.status}`);
    const data = (await res.json()) as {
      results?: { title?: string; url?: string; content?: string }[];
    };
    void locale;
    return (data.results ?? []).slice(0, 3).map((item) => ({
      title: item.title ?? "",
      url: item.url ?? "",
      content: (item.content ?? "").slice(0, 800),
    }));
  },
});

// Daily Tavily budget computed from message tool traces (spec 0006 AC-7):
// no new table, reset at Douala midnight.
export async function tavilySpentToday(): Promise<number> {
  const rows = await db.chatMessage.findMany({
    where: { role: "assistant", createdAt: { gte: doualaDayStart() } },
    select: { toolCalls: true },
  });
  let count = 0;
  for (const row of rows) {
    const calls = row.toolCalls as { tool?: string }[] | null;
    if (Array.isArray(calls)) {
      for (const call of calls) {
        if (call?.tool === "tavily") count += 1;
      }
    }
  }
  return count;
}

export function tavilyBudget(): number {
  const raw = Number(process.env.TAVILY_DAILY_BUDGET ?? 100);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 100;
}
