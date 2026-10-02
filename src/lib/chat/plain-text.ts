// Markdown to plain text for the clipboard (spec 0014 AC-1). A reader pastes
// what they read, so a fence marker, a bullet dot, a table pipe or a pair of
// asterisks must never reach the clipboard. Pure string work: it reads no file,
// talks to no server, and is the same function for an answer and for a
// question.

// Fenced code keeps its source verbatim, so the fence is detected per line and
// the inline pass never runs inside it.
const FENCE = /^\s{0,3}(?:```|~~~)/;

const THEMATIC_BREAK = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
// A table alignment row: only pipes, colons, dashes and spaces.
const TABLE_RULE = /^\s*\|?[\s:|-]*[\s:|-]$/;

function stripInline(part: string): string {
  return (
    part
      // Images before links, or ![alt](url) keeps a leading "!".
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Reference style: [text][ref]
      .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
      // Emphasis and strikethrough markers, nothing else. No trimming here:
      // the parts are rejoined around inline code spans, and trimming the part
      // before a span would eat the space separating them.
      .replace(/\*\*\*|\*\*|\*|___|__|_|~~/g, "")
      // An escaped marker returns to itself.
      .replace(/\\([\\`*_{}[\]()#+\-.!~|])/g, "$1")
  );
}

function stripInlineSpans(line: string): string {
  // Split keeps the code spans aside, so `_` inside `some_name` survives.
  return line
    .split(/(`+[^`]*`+)/g)
    .map((part) =>
      part.startsWith("`")
        ? part.slice(part.indexOf("`") + 1, part.lastIndexOf("`"))
        : stripInline(part),
    )
    .join("");
}

export function markdownToPlainText(markdown: string): string {
  const out: string[] = [];
  let inFence = false;

  for (const raw of markdown.split(/\r?\n/)) {
    if (inFence) {
      if (FENCE.test(raw)) inFence = false;
      else out.push(raw);
      continue;
    }
    if (FENCE.test(raw)) {
      inFence = true;
      continue;
    }
    if (raw.trim() === "") {
      out.push("");
      continue;
    }
    if (THEMATIC_BREAK.test(raw) || TABLE_RULE.test(raw)) continue;

    const line = raw
      // Headings, quotes and list markers lose their punctuation, keep words.
      .replace(/^\s{0,3}#{1,6}\s+/, "")
      .replace(/^\s{0,3}>\s?/, "")
      .replace(/^\s*(?:[-*+]|\d{1,9}[.)])\s+/, "")
      .replace(/\|/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    out.push(stripInlineSpans(line));
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}