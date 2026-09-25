import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

// Versioned prompt loader (spec 0006 AC-3): files carry frontmatter with
// name, version, owner. Loaded at runtime start with the version logged.
export interface PromptFile {
  name: string;
  version: number;
  owner: string;
  body: string;
}

const DIR = path.join(process.cwd(), "src", "lib", "ai", "prompts");

function parse(raw: string, fallbackName: string): PromptFile {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const head = match?.[1] ?? "";
  const body = (match?.[2] ?? raw).trim();
  const get = (key: string, fallback: string): string => {
    const line = head
      .split("\n")
      .find((entry) => entry.trim().startsWith(`${key}:`));
    return line?.split(":").slice(1).join(":").trim() || fallback;
  };
  return {
    name: get("name", fallbackName),
    version: Number(get("version", "1")) || 1,
    owner: get("owner", "unassigned"),
    body,
  };
}

const cache = new Map<string, PromptFile>();

export function loadPrompt(name: string): PromptFile {
  const hit = cache.get(name);
  if (hit) return hit;
  const raw = readFileSync(path.join(DIR, `${name}.md`), "utf8");
  const parsed = parse(raw, name);
  cache.set(name, parsed);
  if (process.env.NODE_ENV !== "production") {
    console.log(`[prompts] loaded ${parsed.name} v${parsed.version} (owner: ${parsed.owner})`);
  }
  return parsed;
}

export function listPromptFiles(): string[] {
  return readdirSync(DIR)
    .filter((file) => file.endsWith(".md") && file !== "registry.md")
    .map((file) => file.replace(/\.md$/, ""));
}
