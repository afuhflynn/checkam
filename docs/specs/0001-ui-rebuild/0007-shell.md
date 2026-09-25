# 0007. Shell (landing plus settings plus WhatsApp guide)

**Date**: 2026-09-25

## Summary

The shell wraps the product: a rebuilt landing frame keeps the proven intake engine with guest counter and repeat lift, signed in visitors continue into chat, lean settings hold four fields with guarded password change, and the WhatsApp guide turns reading into doing with deep linked trials. Header gains Chat plus the avatar button, public pages carry full bilingual SEO.

## Requirements

**User stories**:
- As a first visitor, I want the desk above the proof so that I check in seconds.
- As a returner, I want chat not marketing so that work resumes fast.
- As an account holder, I want four quiet settings so that my account stays mine.
- As a WhatsApp user, I want steps plus trials so that I start from the guide.

**Acceptance criteria**:
- **AC-1**: the desk keeps `IntakeHub` plus `VerdictCard` inside the rebuilt frame with the guest counter and repeat visitor desk lift, repeat read from the `checkam_returning` cookie set after the first verify plus session presence; desk verdicts arrive through the `0006-agent` rules handoff and checks pass the unverified block first then the counter with server wins.
- **AC-2**: signed in verified visitors see a continue bar into chat, signed in unverified visitors route to the resend panel per `0002-auth`, guests see the desk on top past the hero.
- **AC-3**: section order stays bulletin plus hero plus desk plus how plus anatomy plus registry plus FAQ plus CTA with entries to sign in, guest try, WhatsApp, and a sample flyer; registry preview reads APPROVED only capped at 3, bulletin plus FAQ plus sample copy comes from i18n keys; header adds Chat plus avatar with settings plus sign out.
- **AC-4**: settings edit name (Zod length checked) plus language plus password (the `0002-auth` 8 plus hint plus blocklist policy) plus inline sign out redirecting to the landing gate, with instant bilingual save notes and FR plus EN field errors; sign out runs Better Auth sign out.
- **AC-5**: the guide shows 3 steps from i18n keys plus the env number with printed fallback plus deep linked trials (`?q` plus `?tab` encoded) into the chat composer and into `wa.me` prefilled in thread language; the number endpoint returns display E.164 plus `waLink`, copy button plus `tel:` link save it, 500 serves the printed fallback.
- **AC-6**: landing plus directory plus dossiers carry bilingual metadata plus OG cards plus canonical plus sitemap entries, all strings from i18n keys.

## Options considered

### Option 1: Keep engine with new frame

Rebuilt frame, tokens, seal, and header around the live intake, registry, and guide content.

**Pros**:
- Keeps the converting engine while the voice turns dossier.
- Smallest risk on working flows.

**Cons**:
- Old component seams constrain the new frame in places.

### Option 2: Rebuild everything including intake

Fresh intake, fresh registry, fresh guide.

**Pros**:
- No legacy seams at all.

**Cons**:
- Rebuilds a converting flow with real regression risk.

### Option 3: Landing only, settings later

Ship landing now, defer settings plus guide.

**Pros**:
- Smallest child.

**Cons**:
- Splits the shell across releases and strands the avatar menu.

## Decision

**Chosen option**: Option 1: Keep engine with new frame

Strangler beside the live landing, cut over per section, settings plus guide built fresh on shadcn, SEO completed on public routes.

## Rationale

The intake converts today, so the frame changes around it rather than through it. Settings stay lean per scope while password change stays guarded because it is the sensitive moment. The guide earns its keep only when samples launch trials, so deep links beat screenshots.

## Feature design

**Data model sketch**:
No new tables. Settings read and write `User` name plus language preference. Language preference needs a home: reuse the `checkam_lang` cookie plus localStorage already live, no column per the `0002-auth` zero migration rule.

**State transitions**:
Guest landing to continue bar to chat on sign in. Settings idle to saving to saved with instant notes. Guide reading to trial launched.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| profile update | PATCH | name | user | session owner | 401, 422 |
| password change | POST | current, new 8 plus | ok, revoked others | session owner | 401, 400, 429 |
| guide number | GET | none | display E.164 plus `waLink`, 500 serves printed fallback | public, Zod plus Arcjet | 500 |

Language switches client side into the existing cookie plus storage.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| desk | intake plus verdict | live `IntakeHub` plus `VerdictCard` components |
| counter | tries left | `0004-chat-memory` counter API |
| continue bar | chat entry | session presence |
| guide trials | prefilled composer | deep link params into chat plus `wa.me` text |
| number | WhatsApp number | env with printed fallback |
| SEO | meta plus cards plus sitemap | route metadata plus existing sitemap extended |

**Key invariants**:
- Password change needs the current password and revokes other sessions.
- Language truth stays cookie plus storage with no column, accepted as no roam across devices.
- Guide number never hardcodes in copy.
- Trials never send on open, only prefill.
- Every shell string comes from i18n keys in both languages, nothing invented.

**Security model**:
Self only profile writes, rate capped password change, number endpoint is public data with no PII.

**Configuration required**:
- `WHATSAPP_NUMBER`: display plus `wa.me` link number with printed fallback

**Critical test scenarios**:
- Happy path: guest to desk check to sign in to continue bar to chat, verifies **AC-1**, **AC-2**
- Failure case: wrong current password blocks change with field error, verifies **AC-4**
- Auth/permission: signed out settings access sends to gate, verifies **AC-4**

## Migration plan

**Strategy**: strangler
**Phases**:
1. Build new frame beside live landing, cut over section by section with the desk last.
**Rollback**: revert the commit, old landing serves untouched.
**Risks**: SEO dip on route metadata changes, contained by keeping urls plus canonicals stable.

## Build plan

1. Build frame plus header plus continue bar plus desk lift, satisfies **AC-1**, **AC-2**, **AC-3**
2. Build lean settings with guarded password change, satisfies **AC-4**
3. Build guide with env number plus deep linked trials, satisfies **AC-5**
4. Complete bilingual SEO on public routes, satisfies **AC-6**

## Consequences

**Positive**:
- One coherent shell from first visit to daily use.
- Engine keeps converting through the rebuild.

**Negative / tradeoffs**:
- Old seams constrain the frame until the desk cutover finishes.
- Language without a column cannot roam across devices.

**Neutral**:
- Design tool file plus frames still owed before pixel build.

## Follow-up

- [ ] Connect a design MCP and name the shell file plus frames.
- [ ] Decide cross device language sync as later work or never.
