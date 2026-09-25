# Prompt registry (spec 0006 AC-3)

Every prompt is a versioned file with owner plus changelog. Edits land
through review: bump the version, note the change below, and get the owner
(or a second reviewer when owner is unassigned) to approve before build uses
it. Runtime loads by version and logs it in dev.

| Prompt | File | Version | Owner | Job |
|---|---|---|---|---|
| chat-answer | `src/lib/ai/prompts/chat-answer.md` | 2 | unassigned | Ground chat answers in supplied facts, FR plus EN sections |
| title-draft | `src/lib/ai/prompts/title-draft.md` | 2 | unassigned | Draft session titles under 60 chars |

## Changelog

- v2 (2026-09-25): documents the versioned registry flow; wording unchanged from v1.
- v1 (2026-09-25): initial prompts for the agent child.
