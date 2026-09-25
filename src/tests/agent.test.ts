import { afterEach, describe, expect, it, vi } from "vitest";
import { tavilyBudget, withTool } from "../lib/agent/tools";
import { loadPrompt } from "../lib/ai/prompts";

const savedEnv = { ...process.env };

afterEach(() => {
  process.env = { ...savedEnv };
  vi.unstubAllEnvs();
});

describe("agent tool wrapper", () => {
  it("returns values on success", async () => {
    const outcome = await withTool("probe", async () => 42);
    expect(outcome).toEqual({ ok: true, value: 42 });
  });

  it("retries once then reports a named note", async () => {
    let calls = 0;
    const outcome = await withTool("probe", async () => {
      calls += 1;
      throw new Error("boom");
    });
    expect(calls).toBe(2);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.note).toContain("probe");
  });
});

describe("tavily budget", () => {
  it("defaults to 100", () => {
    vi.stubEnv("TAVILY_DAILY_BUDGET", "");
    expect(tavilyBudget()).toBe(100);
  });

  it("honors the env override and rejects garbage", () => {
    vi.stubEnv("TAVILY_DAILY_BUDGET", "25");
    expect(tavilyBudget()).toBe(25);
    vi.stubEnv("TAVILY_DAILY_BUDGET", "junk");
    expect(tavilyBudget()).toBe(100);
  });
});

describe("prompt registry", () => {
  it("loads versioned prompts with owners", () => {
    const chat = loadPrompt("chat-answer");
    expect(chat.name).toBe("chat-answer");
    expect(chat.version).toBeGreaterThanOrEqual(1);
    expect(chat.body.length).toBeGreaterThan(50);
    const title = loadPrompt("title-draft");
    expect(title.name).toBe("title-draft");
    expect(title.body.length).toBeGreaterThan(20);
  });
});
