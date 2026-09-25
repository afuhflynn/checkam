# Scope: CheckAm UI rebuild

Bilingual scam verification for Cameroon, rebuilt around a simple flow: landing invites trust, signed in chat does the work, settings and WhatsApp guide support it.

**Build approach:** Journey (one full user path at a time, each phase usable).
**Workflow:** GA (after `/feature-build`, `/verify-release` then `/test-engineer`, then a fresh model `/peer-review` then `/tech-writer`; most features need a spec).

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/feature-build` and skip `/solution-architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Landing refresh | Path 1: enter | planned |
| 2 | Auth refresh (password + Google + user button) | Path 2: sign in | planned |
| 3 | Mail plumbing (Nodemailer + Inngest) | Path 2: sign in | planned |
| 4 | Chat shell (AI Elements streaming) | Path 3: chat | planned |
| 5 | Chat memory + folders + caching | Path 3: chat | planned |
| 6 | Agent tools + Tavily + prompt review | Path 3: chat | planned |
| 7 | Lean settings | Path 4: account | planned |
| 8 | WhatsApp guide | Path 4: account | planned |
| 9 | Visual polish (tokens + seal + shadcn) | Throughout | planned |

## Path 1: enter

### 1. Landing refresh · in-progress
Live desk above the fold (paste / upload / lookup) with a sample flyer beside it, plus proof, registry preview, FAQ, and entries to sign in, guest try, and WhatsApp.
**Done when:** a visitor grasps the value in seconds and can reach sign in or a first check within 2 taps, in EN and FR, on phone and desktop.
- [x] Design it (spec): `/solution-architect landing refresh`
- [x] Build it: `/feature-build landing refresh` (with shell child)
   - [x] Frame plus header plus desk lift (AC-1, AC-2, AC-3)
   - [x] Bilingual SEO (AC-6)
- [ ] Verify it: `/verify-release landing refresh`
Spec 0007 (`docs/specs/0001-ui-rebuild/0007-shell.md`) · code in `src/components/landing-page.tsx`, `src/components/header.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/directory/layout.tsx`, `src/app/report/layout.tsx`

## Path 2: sign in

### 2. Auth refresh (password + Google + user button) · in-progress · GA
Permit style gate: Google on top, password below, sign up with email verify, password reset, sign out, avatar menu with settings.
**Done when:** a new user can sign up, verify mail, and return; a Google user joins in one tap; a signed in user sees avatar menu with settings and sign out; reset plus OTP paths, resend caps, cookie loss, and honest mail states all behave.
- [x] Design it (spec): `/solution-architect auth refresh`
- [x] Build it: `/feature-build auth refresh`
   - [x] Gate plus Google plus mail states (AC-1, AC-2, AC-8, AC-10)
   - [x] Verify wall plus reset link plus OTP (AC-3, AC-4, AC-5)
   - [x] Sessions plus caps plus helper (AC-6, AC-7, AC-9, AC-11, AC-12)
- [ ] Verify it: `/verify-release auth refresh`
- [ ] Test it: `/test-engineer auth refresh`
Spec 0002 (`docs/specs/0001-ui-rebuild/0002-auth.md`) · code in `src/lib/auth.ts`, `src/lib/gate.ts`, `src/lib/mail/queue.ts`, `src/app/signin/`, `src/components/gate-form.tsx`, `src/components/user-button.tsx`, `src/app/api/auth/resend-verify/`

### 3. Mail plumbing (Nodemailer + Inngest) · in-progress · GA
Nodemailer sends, Inngest queues and retries: verify on sign up, reset on request, short welcome after verify, with user flag plus run history.
**Done when:** sign up, reset, and welcome mails deliver via queued jobs with logs and retries; empty SMTP config fails loud in dev, never silently.
- [x] Design it (spec): `/solution-architect mail plumbing`
- [x] Build it: `/feature-build mail plumbing`
   - [x] Transport plus templates (AC-4, AC-5, AC-8)
   - [x] Three jobs plus triggers (AC-1, AC-2, AC-3, AC-6, AC-7)
   - [x] Status endpoint plus gate states (AC-5, AC-8, AC-9)
- [ ] Verify it: `/verify-release mail plumbing`
- [ ] Test it: `/test-engineer mail plumbing`
Spec 0003 (`docs/specs/0001-ui-rebuild/0003-mail.md`) · code in `src/lib/mail/transport.ts`, `src/lib/mail/queue.ts`, `src/lib/mail/templates/`, `src/inngest/functions/mail.ts`, `src/app/api/mail/status/`

## Path 3: chat

### 4. Chat shell (AI Elements streaming) · in-progress
ChatGPT like screen: side bar with folders and sessions on desktop, drawer on phone, thread of forwarded style notes, always visible composer, streaming bubbles.
**Done when:** a user can start a session, send text, see a streamed answer, attach a flyer or look up a phone, with calm loading, empty, and error states.
- [x] Design it (spec): `/solution-architect chat shell`
- [x] Build it: `/feature-build chat shell`
   - [x] Frames plus streaming plus composer (AC-1, AC-2, AC-4, AC-6)
   - [x] Dossier plus seal plus upload seam (AC-3, AC-5)
   - [x] States plus wall plus keys (AC-7, AC-8, AC-9, AC-10, AC-11)
- [ ] Verify it: `/verify-release chat shell`
- [ ] Test it: `/test-engineer chat shell`
Spec 0005 (`docs/specs/0001-ui-rebuild/0005-chat-shell.md`) · code in `src/app/chat/`, `src/components/chat/`, `src/components/ai-elements/`, `src/app/api/chat/transport/`, `src/app/api/chat/upload/`, `src/app/api/chat/lookup/`

### 5. Chat memory + folders + caching · in-progress
`ChatFolder` owns `ChatSession` owns `ChatMessage`, linked to `User` plus optional verify result; TanStack Query caches lists so history feels instant; guest gets 2 tries per day then a sign in wall.
**Done when:** history persists across reload, folders organize sessions, back moves need no refetch, guest wall enforces by browser id plus IP hash.
- [x] Design it (spec): `/solution-architect chat memory`
- [x] Build it: `/feature-build chat memory`
   - [x] Model plus migration plus CRUD (AC-1, AC-2, AC-10)
   - [x] Guest persist plus claim plus counter (AC-3, AC-4)
   - [x] Titles plus delete UX plus rail (AC-5, AC-6, AC-7, AC-8, AC-9)
- [ ] Verify it: `/verify-release chat memory`
- [ ] Test it: `/test-engineer chat memory`
Spec 0004 (`docs/specs/0001-ui-rebuild/0004-chat-memory.md`) · code in `prisma/schema.prisma` (`ChatFolder`, `ChatSession`, `ChatMessage`), `src/lib/chat/`, `src/app/api/chat/`, `src/inngest/functions/purge-chats.ts`

### 6. Agent tools + Tavily + prompt review · in-progress · GA
Agent with tools: Tavily web search plus registry lookup plus flagged lookup plus verify call, behind versioned reviewed prompts with safety limits; rules still decide the verdict.
**Done when:** chat calls web and local tools when needed, answers stay grounded in evidence bullets, every system prompt is reviewed, versioned, and stored.
- [x] Design it (spec): `/solution-architect agent tools`
- [x] Build it: `/feature-build agent tools`
   - [x] Tools plus handoff (AC-1, AC-2, AC-6)
   - [x] Prompts plus title (AC-3, AC-4)
   - [x] Model plus caps (AC-5, AC-7)
- [ ] Verify it: `/verify-release agent tools`
- [ ] Test it: `/test-engineer agent tools`
Spec 0006 (`docs/specs/0001-ui-rebuild/0006-agent.md`) · code in `src/lib/agent/`, `src/lib/ai/prompts.ts`, `src/lib/ai/prompts/`, rewired `src/app/api/chat/transport/`

## Path 4: account

### 7. Lean settings · in-progress
One quiet page: name, language toggle, password change, sign out, with instant save notes in both languages.
**Done when:** a user can edit profile, switch EN/FR, change password, and sign out without leaving the page.
- [x] Design it (spec): `/solution-architect lean settings`
- [x] Build it: `/feature-build lean settings` (with shell child, AC-4)
- [ ] Verify it: `/verify-release lean settings`
Spec 0007 (`docs/specs/0001-ui-rebuild/0007-shell.md`) · code in `src/app/settings/`

### 8. WhatsApp guide · in-progress
Three steps plus save number plus sample prompts for text, image, and phone lookup, in both languages, with tap to open chat.
**Done when:** a user can learn the WhatsApp flow, save the number, and start a check from the page.
- [x] Design it (spec): `/solution-architect whatsapp guide`
- [x] Build it: `/feature-build whatsapp guide` (with shell child, AC-5)
- [ ] Verify it: `/verify-release whatsapp guide`
Spec 0007 (`docs/specs/0001-ui-rebuild/0007-shell.md`) · code in `src/components/guide-trials.tsx`, `src/app/api/guide/number/`, wired into `src/app/whatsapp/page.tsx`

## Throughout

### 9. Visual polish (tokens + seal + shadcn) · planned · needs a decision
Dossier identity on the shadcn base: archival paper tokens, Fraunces display plus Public Sans body plus Plex Mono filing labels, Verdict Seal stamp moment, structure from `button`/`card`/`badge`/`input`/`textarea`/`tabs`/`progress`, focus and reduced motion respected.
**Done when:** all rebuilt screens share one style, verdicts stamp memorably, and phone plus desktop plus keyboard plus reduced motion all pass.
- [ ] Design it (spec): `/solution-architect visual polish`

## Deferred

Out of scope for the current build pass, kept so the plan stays honest.
- **Guest folders / shared chats**: folders stay private for now · needs a decision
- **Richer settings**: theme, notices, data export, delete account · needs a decision
- **Multi turn WhatsApp memory**: WhatsApp stays single shot per turn · needs a decision
- **Product analytics**: measure activation and habit · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Every other box is an execution box and `/solution-architect` never ticks one.

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/solution-architect` first; otherwise straight to `/feature-build`.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre-workflow) and `dropped` (de-scoped, kept for history).
- **Workflow** (header line) is the project default, what runs after `/feature-build`: **GA** = `/verify-release`, `/test-engineer`, a fresh model `/peer-review`, then `/tech-writer`.
