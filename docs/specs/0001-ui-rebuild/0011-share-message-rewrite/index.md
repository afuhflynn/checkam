# 0011. Share message rewrite

**Date**: 2026-09-29
**Status**: In Progress

## Summary

The share message is what gets forwarded to WhatsApp, Facebook, and SMS when a user shares a verdict. The current version is loud, emoji heavy, and reads like a bot wrote it. This spec rewrites the share message to be calm, human looking, and genuinely useful to the person receiving it. The verdict leads, evidence follows, and a clear action step closes. No emojis, no all caps, no AI slop.

## Requirements

**User stories**:
- As a user sharing a verdict, I want the share message to look human and calm so that the person receiving it trusts the warning and takes it seriously.
- As a person receiving a shared verdict, I want to understand the verdict, the key evidence, and what to do in the first three seconds of reading.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: The share message leads with a calm sentence case verdict header. No all caps, no emojis.
- **AC-2**: The share message includes the intro line "This message was analyzed on checkam.cm:"
- **AC-3**: The share message shows evidence bullets as a plain text bulleted list. No emoji, no markdown.
- **AC-4**: When there are no evidence bullets, the bullet section is skipped entirely.
- **AC-5**: The share message includes the phone number on its own line only when a phone number was found, using E.164 format with spaces.
- **AC-6**: The share message includes the email address on its own line only when no phone number was found.
- **AC-7**: The share message includes the entity or domain on its own line when one was identified.
- **AC-8**: The share message includes the amount on its own line when one was found.
- **AC-9**: The share message includes the payment method on its own line when one was found.
- **AC-10**: The share message includes the safety note as a separate plain text paragraph.
- **AC-11**: For VERIFIED_OFFICIAL, the safety note is a lighter version.
- **AC-12**: For HIGH_RISK, the share message includes the ANTIC hotline (8202) and a forward prompt.
- **AC-13**: For CAUTION and VERIFIED_OFFICIAL, the share message does not include the ANTIC hotline or forward prompt.
- **AC-14**: All em dashes in the share message are replaced with hyphens.
- **AC-15**: The share message has two versions: markdown (with `*bold*` for WhatsApp) and plain text (for Facebook/SMS).
- **AC-16**: The share message uses no emojis at all.

## Decision

**Chosen option**: Option 1: Fix in place

Rewrite the `renderAlert` function in `engine.ts` to produce the new share message format. The function signature and return shape stay the same. Only the internal rendering logic changes.

**Implementation skills**: none detected

## Rationale

Reasoning and options: see [rationale.md](./rationale.md)

## Feature design

**Data model sketch**:

No database changes. The share message is rendered from the existing `VerificationResult` type. The output structure is:

```
[Verdict header - sentence case, no emoji]

This message was analyzed on checkam.cm:

- [Evidence bullet 1]
- [Evidence bullet 2]
- [Evidence bullet 3]

[Phone number line - only if found]
[Email address line - only if no phone]
[Entity or domain line - only if identified]
[Amount line - only if found]
[Payment method line - only if found]

[Safety note - separate paragraph]

[ANTIC hotline - only on HIGH_RISK]
[Forward prompt - only on HIGH_RISK]
```

**State transitions**: not applicable.

**API surface**: no new endpoints. The share message is rendered by the existing `renderAlert` function in `engine.ts`, called from `runRulesEngine`.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Render verdict header | Verdict text (Scam alert / Caution / Official communication) | `result.verdict`, hardcoded strings in the function |
| Render intro line | "This message was analyzed on checkam.cm:" | i18n dictionary, localized |
| Render evidence bullets | Bulleted list of evidence | `result.evidenceBullets.en` or `.fr`, fall back to English if French is missing |
| Render phone number | All phone numbers, comma separated, one line | `result.extractedFacts.phones`, already in E.164 format |
| Render email address | First email address | `result.extractedFacts.emails[0]` |
| Render entity or domain | Official entity acronym (fall back to name) | `result.officialEntity`, skip when null |
| Render amount | Amount exactly as extracted | `result.extractedFacts.amount`, no reformatting |
| Render payment method | Payment method text | Extracted from evidence bullets text, skip when not found |
| Render safety note | Safety note text | `result.safetyNote.en` or `.fr`, localized |
| Render ANTIC hotline | "Report free on 8202" | Static string, only on HIGH_RISK |
| Render forward prompt | "Forward this to your family and groups to protect others." | Static string, only on HIGH_RISK |

**Language selection**: The `renderAlert` function already receives a `language` parameter (`"en" or "fr"`). The function uses this to select the correct language for all localized strings. The signature and return shape stay the same.

**Emoji handling**: All emojis are stripped from evidence bullets and safety notes before rendering. The share message never contains emojis, regardless of what the source data contains.

**Em dash and unicode dash replacement**: All em dashes, en dashes, and other unicode dashes in all text (evidence bullets, safety notes, static strings) are replaced with hyphens.

**SMS length**: The share message may exceed 160 characters for SMS. The spec accepts multi segment SMS. No truncation is applied. The safety note is never truncated.

**Unexpected verdict values**: If `result.verdict` is null, undefined, or an unrecognized value, the header defaults to "Caution - CheckAm Cameroon".

**Key invariants**:
- The share message never contains emojis.
- The share message never uses all caps for the verdict header.
- The share message always includes the intro line.
- The share message includes the ANTIC hotline and forward prompt only on HIGH_RISK.
- The share message includes the phone number line only when a phone number was found.
- The share message includes the email address line only when no phone number was found.
- The share message includes the entity or domain line only when one was identified.
- The share message includes the amount line only when an amount was found.
- The share message includes the payment method line only when a payment method was found.
- All em dashes are replaced with hyphens.
- The markdown version wraps the verdict header in `*bold*`.
- The plain version drops all markdown.

**Security model**: not applicable. The share message is rendered from already verified data. No new data is exposed.

**Configuration required**: none.

**Critical test scenarios**:
- Happy path: HIGH_RISK verdict with evidence bullets, phone number, entity, amount, and payment method. Verify the full message renders correctly with all sections, hotline, and forward prompt. Verifies **AC-1**, **AC-2**, **AC-3**, **AC-5**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-12**, **AC-15**, **AC-16**.
- Empty evidence: CAUTION verdict with no evidence bullets. Verify the bullet section is skipped entirely. Verifies **AC-4**.
- No contact info: VERIFIED_OFFICIAL verdict with no phone, no email, no entity. Verify only the header, intro, and safety note appear. Verifies **AC-6**, **AC-11**, **AC-13**.
- Multiple phone numbers: HIGH_RISK verdict with 3 phone numbers. Verify all 3 appear comma separated. Verifies **AC-5**.
- Multiple email addresses: CAUTION verdict with 2 email addresses and no phone. Verify only the first email appears. Verifies **AC-6**.
- Long safety note: SEXTORTION category with the full coercive safety note. Verify the full note appears, never truncated. Verifies **AC-10**.
- Em dash replacement: Any verdict with an em dash in the safety note. Verify the em dash is replaced with a hyphen. Verifies **AC-14**.
- Markdown vs plain: Any verdict. Verify the markdown version has `*bold*` on the header and the plain version does not. Verifies **AC-15**.

## Build plan

1. Rewrite the `renderAlert` function in `src/lib/rules/engine.ts` to produce the new share message format. Replace the emoji heavy header with calm sentence case. Replace the numbered bullet list with plain text bullets. Add conditional sections for phone, email, entity, amount, and payment method. Add the ANTIC hotline and forward prompt only on HIGH_RISK. Replace all em dashes with hyphens. Keep the markdown and plain text versions. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**, **AC-13**, **AC-14**, **AC-15**, **AC-16**.
2. Update the tests in `src/tests/rules.test.ts` to verify the new share message format. Add test cases for empty evidence, no contact info, multiple phone numbers, multiple email addresses, long safety notes, em dash replacement, and markdown vs plain text. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**, **AC-13**, **AC-14**, **AC-15**, **AC-16**.

## Consequences

**Positive**:
- The share message reads like a human wrote it, not a bot.
- The message is calmer and more trustworthy.
- The structure is clearer: verdict, evidence, action.
- The ANTIC hotline and forward prompt appear only when they are relevant.

**Negative / tradeoffs**:
- The `renderAlert` function becomes longer and more conditional.
- The share message is less visually striking without emojis and all caps.
- The plain text version may look sparse on Facebook and SMS.

**Neutral**:
- No database changes.
- No new dependencies.
- No API changes.
- The function signature and return shape stay the same.

## Follow-up

- [x] Enroll this as a new feature in `docs/scope/scope.md` so it can be tracked through the build pipeline.
