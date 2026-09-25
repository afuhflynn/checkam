# 0006. Agent tools plus Tavily plus prompt review

**Date**: 2026-09-25

## Summary

A chat agent answers turns with five tools in fixed order, local lookups first and Tavily web search only on miss, then hands facts plus traces to the rules engine which alone decides the verdict. It also drafts session titles after the first answer. Prompts live as versioned files with owners, changelogs, and a registry doc so later edits stay tracked and reviewed.

## Requirements

**User stories**:
- As a chatter, I want grounded answers with proof so that I trust the verdict.
- As the product, I want rules to decide every verdict so that AI never judges.
- As the prompt owner, I want versioned editable prompts so that wording improves without hunting.
- As the budget, I want capped search so that web lookups never run wild.

**Acceptance criteria**:
- **AC-1**: each turn runs registry plus flagged plus verify tools first, Tavily only on miss, title tool after the answer; miss means registry 404 or empty, flagged no active match, verify empty or low confidence facts.
- **AC-2**: the agent returns facts in the `ExtractedFactsSchema` plus tool traces plus evidence ids and the rules engine computes verdict plus bullets, the agent never decides; the transport creates the `ScamVerification` row and links `verificationId` on the message.
- **AC-3**: every prompt lives versioned with owner plus changelog in files plus a registry doc, edits land through review; layout is `src/lib/ai/prompts/{name}.md` with frontmatter plus FR and EN variants, loaded at runtime start with the version logged.
- **AC-4**: titles draft after the first answer in thread language detected by the existing detector under 60 chars with shell fallback of date plus first words on timeout; the title tool writes `ChatSession.title`.
- **AC-5**: chat turns answer through the same OpenRouter cascade order at 0.3 with extraction kept at 0.1.
- **AC-6**: a failed or timed out tool degrades the turn with local facts plus a note naming the failed tools from i18n keys, verdict never faked.
- **AC-7**: Tavily stays capped at 2 calls per turn with a visible searching state from i18n keys plus a per day budget guard computed from message tool traces resetting midnight Douala.
- **AC-8**: no tool burns before the `0002-auth` gate helper plus the `0004-chat-memory` counter pass, attachment keys and phone lookups validate first.

## Options considered

### Option 1: Fixed order tools with rules handoff

Local tools, then capped Tavily, then title; facts flow to the engine; prompts versioned with registry.

**Pros**:
- Free facts first, paid search last, authority never moves.
- Prompt edits stay tracked and reviewable.

**Cons**:
- Fixed order can feel rigid for turns needing the web first.

### Option 2: Parallel tools every turn

All five tools fire together each turn.

**Pros**:
- Lowest latency when every source matters.

**Cons**:
- Pays search on turns local facts already answer.

### Option 3: Agent decided verdicts

The model drafts or sets the verdict with rules as advice.

**Pros**:
- Smoother prose around judgment.

**Cons**:
- Breaks the core rule that only the engine decides.

## Decision

**Chosen option**: Option 1: Fixed order tools with rules handoff

AI SDK tools with Zod schemas, 10s timeout plus one retry, versioned prompt files with registry, same cascade answering, honest degrade on failure.

## Rationale

The product promise is rules decide with evidence, so the agent gathers and the engine judges. Local first keeps answers fast and free while caps keep Tavily honest. Versioned files with a registry answer the owner directly: prompts become editable tracked assets instead of inline strings nobody dares touch.

## Feature design

**Data model sketch**:
No new tables. Prompt files live at `src/lib/ai/prompts/` with frontmatter of name, version, owner, and changelog plus a `registry.md` beside them listing every prompt, its job, and its version. Tool traces ride the `ChatMessage.toolCalls` JSON per `0004-chat-memory`.

**State transitions**:
gather local to search on miss to answer to title. Any tool may branch to degraded with note, then continue. Title fires once per session after the first answer.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| chat transport agent | internal stream | session id, text, locale | token events plus fact set plus title | owner or guest key | 429, 500 |
| registry lookup tool | internal | entity name | official record from APPROVED `ScamReport` plus `OfficialEntity`, 404 means miss | system | 404 |
| flagged lookup tool | internal | normalized phone or mail | match plus `riskLevel`, active rows only | system | 404 |
| verify call tool | internal | text plus facts | extracted fact set at 0.1 with `fileHash` reuse | system | 500 |
| Tavily search tool | internal | redacted query plus locale, never raw phones or mails | passages with urls | system, budget guard | 429, 500 |
| title draft tool | internal | first exchange | title under 60 chars | system | 500 |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| answer | grounded text | cascade output over tool results at low temperature |
| verdict event | verdict plus score plus evidence ids | rules engine over the agent fact set, never the model |
| title | session title | title tool after first answer in thread language, shell fallback on timeout |
| searching state | visible indicator | Tavily call start and end |
| prompt text | system wording | versioned files by name plus version from `registry.md` |

**Key invariants**:
- The agent never emits a verdict, only facts plus traces.
- Tavily fires only on local miss, at most 2 calls per turn, queries carry redacted text plus locale and stored traces never hold raw PII.
- Each tool gets 10s plus one retry inside a 60s sequential turn budget, retryable codes are timeout plus 5xx plus 429 with backoff, 429 surfaces capped copy.
- Prompt edits change the registry version and changelog, review before use, runtime loads by version.
- Title fires once per session through the title tool.
- Guard order is gate helper plus counter plus input validation before any tool burn.

**Security model**:
Tools run server side only with no client keys. Tavily key never leaves the server. Tool traces store queries but never secrets. Budget guard blocks overuse per day.

**Configuration required**:
- `TAVILY_API_KEY`: already in `.env.example`, web search
- Tavily per day budget value, named at build

**Critical test scenarios**:
- Happy path: local hit answers with no search and title drafts, verifies **AC-1**, **AC-4**
- Failure case: dead search degrades with local facts plus note, verifies **AC-6**
- Auth/permission: third Tavily call in one turn is refused, verifies **AC-7**

## Migration plan

**Strategy**: no migration needed
**Phases**:
1. Ship tools plus prompts plus transport wiring alongside the shell, extraction path keeps serving until cutover.
**Rollback**: revert the commit, shell falls back to extraction only answers.
**Risks**: cascade latency on long turns, contained by timeouts plus degrade path.

## Build plan

1. Build five tools with schemas plus timeouts plus traces, satisfies **AC-1**, **AC-6**
2. Wire facts to rules handoff plus verdict event, satisfies **AC-2**
3. Build prompt files plus registry plus review flow, satisfies **AC-3**
4. Build title action plus fallback plus Tavily caps plus budget from message traces, satisfies **AC-4**, **AC-5**, **AC-7**, **AC-8**

## Consequences

**Positive**:
- Answers stay grounded with visible proof and capped cost.
- Prompts become maintainable assets with owners.

**Negative / tradeoffs**:
- Fixed order sometimes searches late on web first questions.
- Five tools plus registry is real surface to maintain.

**Neutral**:
- Title quality now answers the debt `0004-chat-memory` records.

## Follow-up

- [ ] Name the Tavily per day budget at build.
- [ ] Record prompt owners in the registry at build.
- [ ] Consider installing community skills for AI SDK plus Tavily conventions before build.
## Amendments (peer review pass, 2026-09-25)

- Timeouts are race enforced (10 seconds plus one retry) since bare abort signals do not stop every call.
- Stored rows keep structured identifiers for function; free text is redacted at rest, traces never hold secrets.
- Flagged checks normalize every contact and scan all of them, not the first.
- Model prose and titles pass a verdict lexicon scrub; matches fall back to engine bullets.
- Tavily fires at most twice per turn (initial plus the wrapper retry); budget counts trace entries per Douala day.
- Prompt files carry changelog frontmatter parsed by the loader.
- Accepted deviations: no searching stream event (dossier shows traces implicitly); prompt owners still unassigned; per-day budget default 100 pending real spend.

