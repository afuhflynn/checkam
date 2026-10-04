# Scope: CheckAm UI rebuild

Bilingual scam verification for Cameroon, rebuilt around a simple flow: landing invites trust, signed in chat does the work, settings and the WhatsApp guide support it, and WhatsApp itself is a first class surface that answers with the same verdict, evidence and voice as the web app.

**Build approach:** Journey (one full user path at a time, each phase usable).
**Workflow:** GA (after `/feature-build`, `/verify-release` then `/test-engineer`, then a fresh model `/peer-review` then `/tech-writer`; most features need a spec).

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/feature-build` and skip `/solution-architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Landing refresh | Path 1: enter | done |
| 2 | Auth refresh (password + Google + user button) | Path 2: sign in | done |
| 3 | Mail plumbing (Nodemailer + Inngest) | Path 2: sign in | done |
| 4 | Chat shell (AI Elements streaming) | Path 3: chat | done |
| 5 | Chat memory + folders + caching | Path 3: chat | done |
| 6 | Agent tools + Tavily + prompt review | Path 3: chat | done |
| 7 | Lean settings | Path 4: account | done |
| 8 | WhatsApp guide | Path 4: account | done |
| 9 | Visual polish (tokens + seal + shadcn) | Throughout | done |
| 10 | Dedicated chat layout | Path 5: immerse | done |
| 11 | Virtual thread + realtime sync | Path 5: immerse | done |
| 12 | Landing redesign (intentional) | Path 1: enter | done |
| 13 | Proxy edge rate limits | Path 6: harden | in-progress |
| 14 | Thread window tuning from data | Path 6: harden | planned |
| 15 | Share message rewrite | Path 3: chat | in-progress |
| 16 | Chat history action menu | Path 3: chat | in-progress |
| 17 | Settings as a chat modal | Path 3: chat | in-progress |
| 18 | Message actions and rich answers | Path 3: chat | in-progress |
| 19 | WhatsApp platform rules and cost | Path 7: WhatsApp | in-progress |
| 20 | Untrusted content hardening | Path 7: WhatsApp | planned |
| 21 | WhatsApp sender identity | Path 7: WhatsApp | planned |
| 22 | WhatsApp answer parity | Path 7: WhatsApp | planned |
| 23 | WhatsApp rate and abuse guard | Path 7: WhatsApp | planned |
| 24 | WhatsApp thread memory | Path 7: WhatsApp | planned |
| 25 | WhatsApp checks recorded | Path 7: WhatsApp | planned |
| 26 | WhatsApp media handling | Path 7: WhatsApp | planned |
| 27 | WhatsApp delivery reliability | Path 7: WhatsApp | planned |
| 28 | WhatsApp guide truth | Path 7: WhatsApp | in-progress |
| 29 | WhatsApp launch readiness | Path 7: WhatsApp | planned |
| 30 | Graph API version expiry guard | Path 7: WhatsApp | planned |
| 31 | WhatsApp chat button | Path 7: WhatsApp | in-progress |
| 32 | WhatsApp warm chat tone | Path 7: WhatsApp | in-progress |
| 33 | WhatsApp human voice | Path 7: WhatsApp | in-progress |
| 34 | Language respect across chat and WhatsApp | Path 7: WhatsApp | in-progress |
| 35 | Calm check for benign chat | Path 7: WhatsApp | in-progress |

## Path 1: enter

### 1. Landing refresh · done
Live desk above the fold (paste / upload / lookup) with a sample flyer beside it, plus proof, registry preview, FAQ, and entries to sign in, guest try, and WhatsApp.
**Done when:** a visitor grasps the value in seconds and can reach sign in or a first check within 2 taps, in EN and FR, on phone and desktop.
- [x] Design it (spec): `/solution-architect landing refresh`
- [x] Build it: `/feature-build landing refresh` (with shell child)
   - [x] Frame plus header plus desk lift (AC-1, AC-2, AC-3)
   - [x] Bilingual SEO (AC-6)
- [x] Verify it: `/verify-release landing refresh`
Spec 0007 (`docs/specs/0001-ui-rebuild/0007-shell/index.md`) · code in `src/components/landing-page.tsx`, `src/components/header.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/directory/layout.tsx`, `src/app/report/layout.tsx`

### 12. Landing redesign (intentional) · done
Deliberate non templated landing voice: bilingual echo headlines, language correct sealed specimen with stamp in motion, dossier filing steps instead of giant numerals, Lucide icons over emoji, no gradients.
Done when: screenshot reviewed against the brief with checks green on phone and desktop.
- [x] Design it: frontend-design pass (echo, seal, dossier steps, icon swap)
- [x] Build it: hero, how, desk, registry, globals, dictionary EN plus FR
- [x] Verify it: after screenshot review plus typecheck, lint, tests green
Code in `src/components/landing/`, `src/app/globals.css`, `src/lib/i18n/dictionary.ts` (no spec; design skill pass, not architected)

## Path 2: sign in

### 2. Auth refresh (password + Google + user button) · done · GA
Permit style gate: Google on top, password below, sign up with email verify, password reset, sign out, avatar menu with settings.
**Done when:** a new user can sign up, verify mail, and return; a Google user joins in one tap; a signed in user sees avatar menu with settings and sign out; reset plus OTP paths, resend caps, cookie loss, and honest mail states all behave.
- [x] Design it (spec): `/solution-architect auth refresh`
- [x] Build it: `/feature-build auth refresh`
   - [x] Gate plus Google plus mail states (AC-1, AC-2, AC-8, AC-10)
   - [x] Verify wall plus reset link plus OTP (AC-3, AC-4, AC-5)
   - [x] Sessions plus caps plus helper (AC-6, AC-7, AC-9, AC-11, AC-12)
- [x] Verify it: `/verify-release auth refresh`
- [x] Test it: `/test-engineer auth refresh`
Spec 0002 (`docs/specs/0001-ui-rebuild/0002-auth.md`) · code in `src/lib/auth.ts`, `src/lib/gate.ts`, `src/lib/mail/queue.ts`, `src/app/signin/`, `src/components/gate-form.tsx`, `src/components/user-button.tsx`, `src/app/api/auth/resend-verify/`

### 3. Mail plumbing (Nodemailer + Inngest) · done · GA
Nodemailer sends, Inngest queues and retries: verify on sign up, reset on request, short welcome after verify, with user flag plus run history.
**Done when:** sign up, reset, and welcome mails deliver via queued jobs with logs and retries; empty SMTP config fails loud in dev, never silently.
- [x] Design it (spec): `/solution-architect mail plumbing`
- [x] Build it: `/feature-build mail plumbing`
   - [x] Transport plus templates (AC-4, AC-5, AC-8)
   - [x] Three jobs plus triggers (AC-1, AC-2, AC-3, AC-6, AC-7)
   - [x] Status endpoint plus gate states (AC-5, AC-8, AC-9)
- [x] Verify it: `/verify-release mail plumbing`
- [x] Test it: `/test-engineer mail plumbing` (`src/tests/mail.test.ts`: templates, queue fallback)
Spec 0003 (`docs/specs/0001-ui-rebuild/0003-mail.md`) · code in `src/lib/mail/transport.ts`, `src/lib/mail/queue.ts`, `src/lib/mail/templates/`, `src/inngest/functions/mail.ts`, `src/app/api/mail/status/`

## Path 3: chat

### 4. Chat shell (AI Elements streaming) · done
ChatGPT like screen: side bar with folders and sessions on desktop, drawer on phone, thread of forwarded style notes, always visible composer, streaming bubbles.
**Done when:** a user can start a session, send text, see a streamed answer, attach a flyer or look up a phone, with calm loading, empty, and error states.
- [x] Design it (spec): `/solution-architect chat shell`
- [x] Build it: `/feature-build chat shell`
   - [x] Frames plus streaming plus composer (AC-1, AC-2, AC-4, AC-6)
   - [x] Dossier plus seal plus upload seam (AC-3, AC-5)
   - [x] States plus wall plus keys (AC-7, AC-8, AC-9, AC-10, AC-11)
- [x] Verify it: `/verify-release chat shell`
- [ ] Test it: `/test-engineer chat shell`
Spec 0005 (`docs/specs/0001-ui-rebuild/0005-chat-shell.md`) · code in `src/app/chat/`, `src/components/chat/`, `src/components/ai-elements/`, `src/app/api/chat/transport/`, `src/app/api/chat/upload/`, `src/app/api/chat/lookup/`

### 5. Chat memory + folders + caching · done
`ChatFolder` owns `ChatSession` owns `ChatMessage`, linked to `User` plus optional verify result; TanStack Query caches lists so history feels instant; guest gets 2 tries per day then a sign in wall.
**Done when:** history persists across reload, folders organize sessions, back moves need no refetch, guest wall enforces by browser id plus IP hash.
- [x] Design it (spec): `/solution-architect chat memory`
- [x] Build it: `/feature-build chat memory`
   - [x] Model plus migration plus CRUD (AC-1, AC-2, AC-10)
   - [x] Guest persist plus claim plus counter (AC-3, AC-4)
   - [x] Titles plus delete UX plus rail (AC-5, AC-6, AC-7, AC-8, AC-9)
- [x] Verify it: `/verify-release chat memory`
- [x] Test it: `/test-engineer chat memory` (`src/tests/chat-memory.test.ts`: cursor, undo tokens, Douala day)
Spec 0004 (`docs/specs/0001-ui-rebuild/0004-chat-memory.md`) · code in `prisma/schema.prisma` (`ChatFolder`, `ChatSession`, `ChatMessage`), `src/lib/chat/`, `src/app/api/chat/`, `src/inngest/functions/purge-chats.ts`

### 6. Agent tools + Tavily + prompt review · done · GA
Agent with tools: Tavily web search plus registry lookup plus flagged lookup plus verify call, behind versioned reviewed prompts with safety limits; rules still decide the verdict.
**Done when:** chat calls web and local tools when needed, answers stay grounded in evidence bullets, every system prompt is reviewed, versioned, and stored.
- [x] Design it (spec): `/solution-architect agent tools`
- [x] Build it: `/feature-build agent tools`
   - [x] Tools plus handoff (AC-1, AC-2, AC-6)
   - [x] Prompts plus title (AC-3, AC-4)
   - [x] Model plus caps (AC-5, AC-7)
- [x] Verify it: `/verify-release agent tools`
- [x] Test it: `/test-engineer agent tools` (`src/tests/agent.test.ts`: tool wrapper, budget, prompt registry)
Spec 0006 (`docs/specs/0001-ui-rebuild/0006-agent.md`) · code in `src/lib/agent/`, `src/lib/ai/prompts.ts`, `src/lib/ai/prompts/`, rewired `src/app/api/chat/transport/`

### 16. Chat history action menu · in-progress
Each chat or folder keeps its title readable, with one action icon that appears on hover, on focus, and on the check you are inside, opening a dropdown holding rename, share, pin, move and delete. Replaces spec 0012, whose inline labelled buttons were measured collapsing the title to zero width in a 256px rail and whose menu never opened on a phone.
**Done when:** the title is always readable, the actions live in one dropdown reachable by hover, keyboard and tap, and every action works in both languages.
- [x] Design it (spec): `/solution-architect chat history action menu`
- [x] Build it: `/feature-build chat history action menu`
   - [x] Row and dropdown from the shadcn wrapper, icon always mounted, reduced motion (AC-1, AC-2, AC-3, AC-16, AC-17)
   - [x] Rename as a growing input with no buttons (AC-4, AC-5, AC-6)
   - [x] Actions wired, pinning scoped to a section, folder rows, move submenu (AC-7, AC-8, AC-9, AC-10, AC-11)
   - [x] Pinned star column, cross tab delete channel, keyboard contract, bilingual labels (AC-8, AC-12, AC-13, AC-14)
- [ ] Verify it: `/verify-release chat history action menu`
- [x] Test it: `/test-engineer chat history action menu`
- [ ] Review it (fresh model): `/peer-review chat history action menu`
- [ ] Document it: `/tech-writer chat history action menu`
Spec 0013 (`docs/specs/0001-ui-rebuild/0013-hover-icon-action-menu.md`), superseding 0012 · code in `src/components/chat/chat-shell.tsx`, `src/components/ui/dropdown-menu.tsx`, `src/app/api/chat/sessions/[id]/route.ts`, `src/app/(chat)/chat/page.tsx`, `src/lib/i18n/dictionary.ts`

### 18. Message actions and rich answers · in-progress
Every message earns a quiet action row, so you can copy any message and any code block, and re ask an answer that got a verdict wrong. Answers already render as proper rich text through Streamdown, so this wires the action primitives the repo already vendors, keeps the code block copy the library already renders, and adds one nullable column so a replaced answer still counts against the budget.
**Done when:** you can copy a message or a code block in one tap, re ask an answer without losing the thread, read formatted answers properly, and the thread reads as one modern surface in both languages on phone and desktop.
- [x] Design it (spec): `/solution-architect message actions and rich answers`
- [x] Build it: `/feature-build message actions and rich answers`
   - [x] Action row with plain text copy, check confirmation, and both languages (AC-1, AC-2, AC-3, AC-4, AC-13)
   - [x] Supersede column plus the filter rule, naming the four paths that must not filter (AC-7, AC-8, AC-10)
   - [x] Re ask end to end: one transport field, stale target refusal, the guest charge, the control, the settled state (AC-5, AC-6, AC-7, AC-9, AC-11, AC-12, AC-14, AC-15)
   - [x] Surface pass for keyboard, focus, reduced motion, touch targets and both languages (AC-4)
- [ ] Verify it: `/verify-release message actions and rich answers`
- [ ] Test it: `/test-engineer message actions and rich answers`
- [ ] Review it (fresh model): `/peer-review message actions and rich answers`
- [ ] Document it: `/tech-writer message actions and rich answers`
Spec 0014 (`../specs/0001-ui-rebuild/0014-message-actions/index.md`) · code in `src/lib/chat/plain-text.ts`, `src/components/chat/message-actions.tsx`, `src/components/chat/thread-view.tsx`, `src/components/ai-elements/message.tsx`, `src/app/api/chat/transport/route.ts`, `src/app/api/chat/sessions/[id]/messages/route.ts`, `src/lib/chat/counter.ts`, `src/lib/i18n/dictionary.ts`, `prisma/schema.prisma`

## Path 4: account

### 17. Settings as a chat modal · in-progress
Settings opens as a modal over the chat shell instead of leaving the chat for a standalone page. The open and closed state lives in a browser search parameter through nuqs, which this project already uses, with the parameter parsed through a typed schema so a bad value cannot reach the component. The existing /settings route stays as a deep link that opens the same modal. The dialog mounts inside ChatShell beside the thread and opens from the rail without navigating, so the conversation is never torn down; /settings answers as a server redirect for the cross surface deep link.
**Done when:** settings opens over the thread without losing the conversation, the URL carries the state so it can be linked and restored, closing returns you to the chat, and /settings still lands on the same modal.
- [x] Design it (spec): `/solution-architect settings as a chat modal`
- [x] Build it: `/feature-build settings as a chat modal`
   - [x] Shared form component plus the typed `panel` parser (AC-4, AC-7)
   - [x] `UserButton` trigger prop so the rail opens the panel without navigating (AC-8)
   - [x] Dialog beside the thread in ChatShell, with focus return, internal scroll, reduced motion, bilingual close label (AC-8, AC-10)
   - [x] Server redirect from /settings, plus the bad value strip and the push then replace history rules (AC-7, AC-8)
   - [x] Access states: sign in prompt, unverified, drawer close, parameter dropped on sign out (AC-8, AC-9)
- [ ] Verify it: `/verify-release settings as a chat modal`
- [ ] Test it: `/test-engineer settings as a chat modal`
- [ ] Review it (fresh model): `/peer-review settings as a chat modal`
- [ ] Document it: `/tech-writer settings as a chat modal`
Spec 0007 (`../specs/0001-ui-rebuild/0007-shell/index.md`), amended 2026-09-30 (AC-7 to AC-10 are new) · code in `src/components/chat/chat-shell.tsx`, `src/components/user-button.tsx`, `src/components/ui/dialog.tsx`, `src/app/(chat)/settings/page.tsx`, `src/lib/search-params.ts`, `src/lib/i18n/dictionary.ts`

### 7. Lean settings · done
One quiet page: name, language toggle, password change, sign out, with instant save notes in both languages.
**Done when:** a user can edit profile, switch EN/FR, change password, and sign out without leaving the page.
- [x] Design it (spec): `/solution-architect lean settings`
- [x] Build it: `/feature-build lean settings` (with shell child, AC-4)
- [x] Verify it: `/verify-release lean settings`
Spec 0007 (`docs/specs/0001-ui-rebuild/0007-shell/index.md`) · code in `src/app/settings/`

### 8. WhatsApp guide · done
Three steps plus save number plus sample prompts for text, image, and phone lookup, in both languages, with tap to open chat.
**Done when:** a user can learn the WhatsApp flow, save the number, and start a check from the page.
- [x] Design it (spec): `/solution-architect whatsapp guide`
- [x] Build it: `/feature-build whatsapp guide` (with shell child, AC-5)
- [x] Verify it: `/verify-release whatsapp guide`
Spec 0007 (`docs/specs/0001-ui-rebuild/0007-shell/index.md`) · code in `src/components/guide-trials.tsx`, `src/app/api/guide/number/`, wired into `src/app/whatsapp/page.tsx`

## Throughout

### 9. Visual polish (tokens + seal + shadcn) · done
Dossier identity on the shadcn base: archival paper tokens, Fraunces display plus Public Sans body plus Plex Mono filing labels, Verdict Seal stamp moment, structure from `button`/`card`/`badge`/`input`/`textarea`/`tabs`/`progress`, focus and reduced motion respected.
**Done when:** all rebuilt screens share one style, verdicts stamp memorably, and phone plus desktop plus keyboard plus reduced motion all pass.
- [x] Designed in umbrella spec Design section + applied across builds 0002–0007 (no separate spec needed)
Spec 0001 (`docs/specs/0001-ui-rebuild/index.md` Design section)

## Path 5: immerse

### 10. Dedicated chat layout · done
Own route group shell for chat: no marketing header or footer, full height rail plus thread plus dossier, user card with settings at the rail foot, new chats unfiled unless a folder is picked, per folder create plus move to folder.
**Done when:** `/chat` renders its own immersive shell with the dossier light theme, folders hold chats, and the user card opens settings.
- [x] Design it (spec): `/solution-architect chat layout`
- [x] Build it: `/feature-build chat layout`
   - [x] Proxy routing plus protection (AC-4, AC-5)
   - [x] Group shells plus user card plus folder actions (AC-1, AC-2, AC-3)
- [x] Verify it: `/verify-release chat layout`
Spec 0008 (`docs/specs/0001-ui-rebuild/0008-chat-layout.md`)

### 11. Virtual thread + realtime sync · done
Windowed thread (50 per page, 3 in DOM, scroll anchored) with poll plus focus plus SSE freshness, so long histories stay smooth and multi tab edits appear.
**Done when:** first load shows the latest page, scrolling up pages older turns in while far pages leave the DOM, and new turns arrive without reload.
- [x] Design it (spec): `/solution-architect thread sync`
- [x] Build it: `/feature-build thread sync`
   - [x] Older pages endpoint (AC-1, AC-2, AC-6)
   - [x] Windowed thread UI (AC-2, AC-3, AC-4)
   - [x] Stream endpoint plus client (AC-5)
- [x] Verify it: `/verify-release thread sync`
Spec 0009 (`docs/specs/0001-ui-rebuild/0009-thread-sync.md`)

## Path 6: harden

### 13. Proxy edge rate limits · in-progress
Enforce abusive IP caps at the proxy edge from spec 0008 follow-up, Arcjet per route stays authoritative.
Done when: abusive IPs are capped before render without touching legit traffic.
- [x] Design it (spec): `/solution-architect proxy edge rate limits`
- [ ] Build it: `/feature-build proxy edge rate limits`
   - [ ] Matcher plus windows plus tiers plus identity (AC-1, AC-2, AC-3, AC-5)
   - [ ] Capped responses plus headers plus slow down page (AC-4)
   - [ ] Logging plus dev mode plus fail open alert (AC-5, AC-6)
- [ ] Verify it: `/verify-release proxy edge rate limits`
- [ ] Test it: `/test-engineer proxy edge rate limits`
Spec 0010 (`docs/specs/0001-ui-rebuild/0010-proxy-edge-limits.md`)

### 14. Thread window tuning from data · planned
Tune the 50 by 3 thread window from real thread lengths after launch, from spec 0009 follow-up.
Done when: the window matches measured p99 threads with smooth scroll retained.
- [ ] Build it: `/feature-build thread window tuning`

### 15. Share message rewrite · in-progress
Rewrite the share message to be calm, emoji free, and human looking. The verdict leads, evidence follows, and a clear action step closes. No emojis, no all caps, no AI slop.
**Done when:** the share message reads like a concerned friend who checked something, not like a security system firing an alarm.
- [x] Design it (spec): `/solution-architect share message rewrite`
- [x] Build it: `/feature-build share message rewrite`
   - [x] Rewrite renderAlert with new format (AC-1, AC-2, AC-3, AC-4, AC-14, AC-15, AC-16)
   - [x] Add conditional sections for contact and evidence (AC-5, AC-6, AC-7, AC-8, AC-9)
   - [x] Add verdict specific tail sections (AC-10, AC-11, AC-12, AC-13)
- [ ] Verify it: `/verify-release share message rewrite`
- [ ] Test it: `/test-engineer share message rewrite`
- [ ] Review it (fresh model): `/peer-review share message rewrite`
- [ ] Document it: `/tech-writer share message rewrite`
Spec 0011 (`docs/specs/0001-ui-rebuild/0011-share-message-rewrite/index.md`)

## Path 7: WhatsApp

The number a message arrives from is the whole identity. Nothing else is collected, so nothing else can stand in the way of someone who needs help. Send the feature rows in order, each one leaves WhatsApp usable. Rows 19 and 20 come first because the platform changed under us and because the endpoint is fully public.

### 19. WhatsApp platform rules and cost · in-progress
Meta now charges per message for our own replies, the pinned API version has expired, and free form text only reaches a person for 24 hours after they write to us. Pin a current API version in one constant, put billing and a monthly budget in place, and record the window per thread so no reply is ever attempted outside it.
**Done when:** every Meta call goes through one pinned current version, the account has a payment method so replies are not stopped at delivery, the free monthly allowance and the per message cost are written down as our cap, and a reply that would land outside the 24 hour window is refused at our edge with a clear reason instead of failing at Meta.
- [x] Design it (spec): `/solution-architect whatsapp platform rules and cost`
- [x] Build it: `/feature-build whatsapp platform rules and cost`
   - [x] Pin the version and open the module (AC-1)
   - [x] Migrate, then open the window per thread (AC-2, AC-3)
   - [x] Count the month, cap the reply, send the cap note once a month (AC-4, AC-5, AC-6, AC-7)
   - [x] Drop the fake success and hold one message per sender (AC-10, AC-11)
   - [x] Give the reply a phone format and restore French accents (AC-8, AC-9)
- [ ] Verify it: `/verify-release whatsapp platform rules and cost`
- [ ] Test it: `/test-engineer whatsapp platform rules and cost`
   - [x] Window, cap, timezone and phone format logic (`whatsapp-platform.test.ts`)
   - [x] Send, media download, credentials and the development pretend send (`whatsapp-send.test.ts`)
   - [x] The webhook's signature checks, redelivery and ignore paths (`whatsapp-webhook.test.ts`)
   - [x] The cap's conditional write, the notice claim and the decision writers (`whatsapp-decisions.test.ts`)
   - [x] Fix the fake success: a send is confirmed only by Meta's message id (`/fault-fix`)
- [ ] Review it (fresh model): `/peer-review whatsapp platform rules and cost`
- [ ] Document it: `/tech-writer whatsapp platform rules and cost`
Spec 0015 (`docs/specs/0001-ui-rebuild/0015-whatsapp-platform-rules-and-cost/index.md`) · code in `src/lib/whatsapp/` (graph, config, thread, cap, send, media, event), `src/app/api/public/whatsapp/webhook/route.ts`, `src/inngest/functions/process-whatsapp-message.ts`, `src/lib/rules/engine.ts`, `prisma/schema.prisma` · tests in `src/tests/whatsapp-platform.test.ts`, `whatsapp-send.test.ts`, `whatsapp-webhook.test.ts`, `whatsapp-decisions.test.ts`

### 20. Untrusted content hardening · planned
Every WhatsApp message is attacker controlled text or an attacker controlled image arriving on a fully public endpoint, so treat the model's instruction boundary as breakable by design. Strip invisible and tag block characters on the way in and on the way out, filter images as well as text, keep every credential and send outside the model, and treat any written memory as privileged.
**Done when:** invisible characters, tag blocks and hidden instructions in a flyer or a message cannot reach the model context, the model holds no credential and cannot send anything itself, a durable note written from a message carrying instructions is refused, and a suite of known injection and jailbreak attempts is a standing test.
- [ ] Design it (spec): `/solution-architect untrusted content hardening`

### 21. WhatsApp sender identity · planned
Every incoming number becomes a thread key, normalised to Cameroon format, alongside Meta's own business scoped user id which survives a number change. Unknown senders get an anonymous record and guest treatment, never a wall. Linking starts in the app: save the number in settings, the app sends a one time code into WhatsApp, the sender echoes it back, attempts capped. Numbers are shared in families and get reassigned, so the code is what earns the attach. A reply may offer the link once per thread, naming what the person gets (history kept, a higher daily allowance, the same thread on the web), with no urgency and no push.
**Done when:** every number opens a thread, a number change keeps the same thread through Meta's own id, an unknown sender gets a full answer with nothing asked first, a saved number attaches only after one confirmation from WhatsApp, the offer never repeats and never rides on a high risk verdict, and unlinking is one tap.
- [ ] Design it (spec): `/solution-architect whatsapp sender identity`

### 22. WhatsApp answer parity · planned
The worker runs the turn the web chat already runs: flagged and approved registry lookups, web research, the reviewed answer prompt, then the rules engine seals the verdict on top. One shared renderer for both surfaces, so no slop, no emoji and no second format ever reach a phone. A high risk reply carries no link and no offer, because a link inside a scam alert spends the trust the alert depends on.
**Done when:** a WhatsApp reply carries the same verdict, evidence and voice as the web answer in French and English, the verdict still comes only from the rules engine, and a high risk alert is a clean warning with nothing attached to it.
- [ ] Design it (spec): `/solution-architect whatsapp answer parity`

### 23. WhatsApp rate and abuse guard · planned
The webhook fails closed outside development instead of skipping the signature check, the signature is compared over the raw body in constant time with a replay window, and every number gets a daily cap, a polite reply at the cap, and a stop keyword honoured at once. Arcjet stays authoritative on the web; this is the WhatsApp wall, and it is also our cost control now that each reply is billed.
**Done when:** an unsigned, misdated or secretless payload is refused, a captured payload cannot be replayed, a capped sender gets a clear bilingual note, "stop" ends replies, and no single request can drain paid inference, spend past budget, or get the business number banned.
- [ ] Design it (spec): `/solution-architect whatsapp rate and abuse guard`

### 24. WhatsApp thread memory · planned
Keep every exchange per number and maintain a short durable note holding language, topics and verdicts already given, so a follow up lands and the bot never contradicts itself days later. The note is written by our own code from structured facts, never by free prose from the model, because a note that carries instructions poisons every later turn.
**Done when:** "and what about this number 699 12 34 56?" is answered in light of what came before, the chosen language sticks across turns, an earlier verdict is never quietly reversed, and a message trying to plant a rule in the note leaves no trace.
- [ ] Design it (spec): `/solution-architect whatsapp thread memory`

### 25. WhatsApp checks recorded · planned
Each WhatsApp check writes the same verification record the web chat writes, in the language actually sent, so stats, moderation and history all see it.
**Done when:** a WhatsApp check shows up in admin stats and moderation, the record keeps the language it was answered in, and a person can carry the thread into the app when they want to.
- [ ] Design it (spec): `/solution-architect whatsapp checks recorded`

### 26. WhatsApp media handling · planned
Cap image size and payload, refuse a document in plain words, keep a checked flyer as moderation evidence, and never answer about a message the extractor could not read.
**Done when:** an oversized flyer, a PDF and a captionless photo each get a truthful bilingual reply, the flyer is stored as evidence, and nothing produces a verdict from empty text.
- [ ] Design it (spec): `/solution-architect whatsapp media handling`

### 27. WhatsApp delivery reliability · planned
Make the send idempotent across retries, write the failure state the schema already promises, read the Meta response body, and take the real outcome from the status webhook instead of assuming a 200 means delivered.
**Done when:** a retry never double texts a person, a permanently failing event is marked failed and visible, a reply Meta refused inside the window never claims to have been sent, and missing credentials fail loud instead of pretending a mock dispatch worked.
- [ ] Design it (spec): `/solution-architect whatsapp delivery reliability`

### 28. WhatsApp guide truth · in-progress
The guide page and the landing mockup render from the real renderer instead of hardcoded emoji replies, so what we advertise is exactly what the bot sends.
**Done when:** the simulator on /whatsapp matches a real reply in format, and no hardcoded all caps or emoji string is left in the interface.
**Note:** built as step 1 of spec 0016 (row 31), which needed it fixed before it could send anyone into WhatsApp. This row stays the owner. The hardcoded emoji replies are gone and the simulator renders `whatsappReply`; still to do: the landing mockup, and verification.
- [x] Build it: `/feature-build whatsapp guide truth`

### 29. WhatsApp launch readiness · planned
Run history in admin, a credential health check that fails loud, webhook and worker test coverage, subscriptions to the policy and status webhooks so a restriction is seen the day it lands, and a go live checklist that matches the code.
**Done when:** an operator can see every event and its outcome, missing credentials and a missing payment method are caught before launch, an account restriction reaches admin, and the critical webhook and worker paths carry test scenarios.
- [ ] Design it (spec): `/solution-architect whatsapp launch readiness`

### 30. Graph API version expiry guard · planned
The Meta API version is a constant on purpose, so nothing warns us when it nears its sunset. Add a check that fails inside 90 days of a published expiry, and a written bump procedure so the fix is one file edit.
**Done when:** the check runs in CI and fails inside 90 days of a published sunset date for the pinned version, the bump is documented as a single constant edit plus a deploy, and the current version is verified as not near expiry.
- [ ] Design it (spec): `/solution-architect graph api version expiry guard`

### 31. WhatsApp chat button · in-progress
A real chat button that opens WhatsApp already talking to CheckAm, in the user's own language, in the landing hero, on small screens as a floating button, and on the guide page. It uses the click to chat code we hold, so the number leaves the page source and desktop users get a WhatsApp Web path. Step 1 of its build also lands the guide truth work from row 28, because shipping a button into a guide that misrepresents the reply is worse than leaving it alone.
**Done when:** one tap from the landing page opens a branded WhatsApp chat with CheckAm in French or English, our number is in no page's HTML, the guide page shows the reply the bot actually sends, and nothing about the bot, the window, the cap or the send path changed.
- [x] Design it (spec): `docs/specs/0001-ui-rebuild/0016-whatsapp-click-to-chat-cta/index.md`
- [x] Guide page truth (scope 28, step 1 of the spec build)
- [x] Chat destination constant and bilingual copy
- [x] Chat button in the hero and on the guide page
- [x] Floating button on small screens, mounted once in the site layout
- [x] Tests for the destination, the labels, the language and the number
- [x] Build it: `/feature-build whatsapp chat button` · code in `src/lib/whatsapp/click-to-chat.ts`, `src/components/whatsapp/`, `src/app/(site)/layout.tsx`, `src/app/(site)/whatsapp/page.tsx`

### 32. WhatsApp warm chat tone · in-progress
First check in a thread keeps the full verdict shape with a warm opener and closer in the thread language. Later turns in the same open window drop the title and stay short and chatty, while the verdict itself stays clear and firm.
**Done when:** a first check still reads as a full verdict with evidence, a follow up in the same window reads as a short warm note with no repeat title, and both languages feel human on a phone.
- [x] Design it (spec): `/solution-architect whatsapp warm chat tone`
- [x] Build it: `/feature-build whatsapp warm chat tone`
  - [x] Migration plus tone fields and cleared on new window (AC-6, AC-7)
  - [x] Renderer with follow up flag plus warm copy in both languages (AC-1, AC-2, AC-4, AC-9)
  - [x] Worker first versus follow up path with claim signal and language store (AC-3, AC-5, AC-6)
  - [x] Reaction ack plus empty ask plus untouched system notes with tests (AC-5, AC-7, AC-8)
- [x] Verify it: `/verify-release whatsapp warm chat tone`
- [x] Test it: `/test-engineer whatsapp warm chat tone`
- [x] Review it (fresh model): `/peer-review whatsapp warm chat tone`
- [x] Document it: `/tech-writer whatsapp warm chat tone`
Spec 0017 (`../specs/0001-ui-rebuild/0017-whatsapp-warm-chat-tone/index.md`) · code in `src/lib/rules/engine.ts`, `src/lib/whatsapp/tone.ts`, `src/lib/whatsapp/thread.ts`, `src/lib/whatsapp/event.ts`, `src/inngest/functions/process-whatsapp-message.ts`, `prisma/schema.prisma`

### 33. WhatsApp human voice · in-progress
Row 32 made the chat warm but the reply still reads like a script: a branded title, a staging host, a stock closer, and doubled safety lines. This rewrites the reply in the web answer voice, verdict in plain words first, then evidence, then action, with only a small analyzed by note at the end. Builds on row 32, keeps its short follow up shape.
**Done when:** a WhatsApp verdict reads like the web verdict in both languages, with no brand title, no preview host, no stock closer, and no repeated line, while the verdict still comes only from the rules engine.
- [x] Design it (spec): `/solution-architect whatsapp human voice`
- [x] Build it: `/feature-build whatsapp human voice`
  - [x] Renderer verdict first with leads plus signoff, retire opener, title, host, closer, doubled hotline (AC-1, AC-9, AC-10)
  - [x] Signal align plus simulator shorts and empty ask plus tests (AC-3, AC-5, AC-8, AC-10)
- [ ] Verify it: `/verify-release whatsapp human voice`
- [ ] Test it: `/test-engineer whatsapp human voice`
- [ ] Review it (fresh model): `/peer-review whatsapp human voice`
- [ ] Document it: `/tech-writer whatsapp human voice`
Spec 0017, shared with row 32 (`../specs/0001-ui-rebuild/0017-whatsapp-warm-chat-tone/index.md`) · code in `src/lib/rules/engine.ts`, `src/lib/whatsapp/tone.ts`, `src/tests/whatsapp-tone.test.ts`, `src/tests/whatsapp-platform.test.ts`, `src/tests/whatsapp-chat-button.test.tsx`

### 34. Language respect across chat and WhatsApp · in-progress
Reply in the language you used, remember a fixed choice when you set one, and use the same rule on web chat and WhatsApp.
**Done when:** a hi gets an English reply and a bonjour gets a French reply, a fixed choice stays fixed even when you switch input language, and both chat and WhatsApp follow the same rule.
You may think of detection as guessing English or French from your words, and preference as your saved choice that stays until you change it.
- [x] Design it (spec): `/solution-architect language respect across chat and WhatsApp`
- [x] Build it: `/feature-build language respect across chat and WhatsApp`
    - [x] Guesser plus ask gate on web (AC-1, AC-5, AC-11)
    - [x] Triples migration plus settings fan out (AC-4, AC-6, AC-7)
    - [x] Worker parity plus silent window plus recorded language (AC-2, AC-3, AC-6, AC-9)
    - [x] Prompt slot plus mixed evidence plus model down fallback (AC-8, AC-10, AC-11)
- [ ] Verify it: `/verify-release language respect across chat and WhatsApp`
- [x] Test it: `/test-engineer language respect across chat and WhatsApp`
- [ ] Review it (fresh model): `/peer-review language respect across chat and WhatsApp`
- [ ] Document it: `/tech-writer language respect across chat and WhatsApp`
Spec 0018 (`../specs/0001-ui-rebuild/0018-language-respect-chat-whatsapp/index.md`) · code in `src/lib/i18n/preference.ts`, `src/lib/i18n/detect.ts`, `src/lib/i18n/dictionary.ts`, `src/app/api/chat/transport/route.ts`, `src/inngest/functions/process-whatsapp-message.ts`, `src/lib/whatsapp/event.ts`, `src/lib/whatsapp/thread.ts`, `prisma/schema.prisma`

### 35. Calm check for benign chat · in-progress
Small talk, greetings and product questions get a warm helpful reply with no verdict and no alarm, on web and WhatsApp alike. True checks keep the full verdict shape.
**Done when:** a hello or How does it work gets a friendly answer with no CAUTION and no share block, while a true claim still gets evidence and a verdict from rules.
- [x] Design it (spec): `/solution-architect calm check for benign chat`
- [x] Build it: `/feature-build calm check for benign chat`
    - [x] Shared helper plus copy deck in EN and FR (`AC-1`, `AC-2`, `AC-3`, `AC-4`)
    - [x] Web chat wiring with calm reply and no share row (`AC-1`, `AC-2`, `AC-6`, `AC-7`)
    - [x] WhatsApp worker wiring with full verdict for checks (`AC-3`, `AC-4`, `AC-5`, `AC-6`, `AC-7`)
    - [x] Guide truth plus benign or check counts (`AC-6`, `AC-8`)
- [ ] Verify it: `/verify-release calm check for benign chat`
- [ ] Test it: `/test-engineer calm check for benign chat`
- [ ] Review it (fresh model): `/peer-review calm check for benign chat`
- [ ] Document it: `/tech-writer calm check for benign chat`
Spec 0019 (`../specs/0001-ui-rebuild/0019-calm-check-benign-chat/index.md`) · code in `src/lib/chat/benign.ts`, `src/app/api/chat/transport/route.ts`, `src/inngest/functions/process-whatsapp-message.ts`, `src/app/(site)/whatsapp/page.tsx`

## Deferred

Out of scope for the current build pass, kept so the plan stays honest.
- **Guest folders / shared chats**: folders stay private for now · needs a decision
- **Richer settings**: theme, notices, data export, delete account · needs a decision
- **Product analytics**: measure activation and habit · needs a decision
- **Voice notes and transcription**: a voice note gets a graceful bilingual reply asking for text or a picture; transcribing FR and EN voice notes is a roadmap item open for contributors · from this pass
- **Reaching out first**: any message we send outside a live reply needs an approved template and is billed per message from October 2026, so no reminders, no check back later, no campaigns · from this pass · needs a decision
- **Mutual TLS on the webhook**: Meta supports it, the HMAC signature is what protects us today · needs a decision
- **Pinned checks above every section**: pinning only reorders within a folder section today · from spec 0013 · needs a decision
- **Exact folder delete count**: the rail is cursor paged so the count is a lower bound · from spec 0013 · needs a decision
- **Hardcoded English in the shared dialog wrapper**: `src/components/ui/dialog.tsx` renders a fixed `Close` label for every consumer; spec 0007 passes a bilingual one in for the settings dialog only, the wrapper itself still needs fixing · from spec 0007
- **Unverified reader can change settings**: the form is reachable before email verification, looser than the chat write path which refuses · from spec 0007 · needs a decision
- **Panel parameter shape**: an enum carrying one value may be more than a boolean, decide when a second panel exists · from spec 0007 · needs a decision
- **Split spec 0007**: the shell and the settings reach are two decisions in one file, split if either grows · from spec 0007 · needs a decision
- **`tokenUse` on a message row is read but never written**: nothing writes it, so no accounting depends on it, yet `tokenUse` is still selected on every thread read · from spec 0014 · needs a decision
- **The chat client never seeds the AI SDK's own message state**: the thread renders from fetched pages, so SDK features that read that state (`regenerate`, `resumeStream`) cannot work and spec 0014 routed around it · from spec 0014 · needs a decision
- **`AGENTS.md` has no `## Agent skills` section**: `ai-sdk`, `frontend-design` and `tailwindcss` are installed and shaped spec 0014 but are not referenced from any context file · from spec 0014
- **Test scenarios for shipped shell work**: AC-3, AC-5 and AC-6 shipped with no critical test scenario, so they have nothing to verify against if revisited · from spec 0007
- **The long French safety paragraphs**: `src/lib/rules/engine.ts` carries safety text up to 980 characters each, which is what forces the 1,600 character reply ceiling in spec 0015 and pushes a scam alert past one phone screen; a tighter rewrite would let the alert fit without dropping evidence · from spec 0015 · needs a decision
- **The WhatsApp guide contradicts the bot format**: `src/app/(site)/whatsapp/page.tsx` hardcodes French replies with emoji bullets, which spec 0015 forbids; row 28 owns the fix · from spec 0015

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Every other box is an execution box and `/solution-architect` never ticks one.

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/solution-architect` first; otherwise straight to `/feature-build`.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre-workflow) and `dropped` (de-scoped, kept for history).
- **Workflow** (header line) is the project default, what runs after `/feature-build`: **GA** = `/verify-release`, `/test-engineer`, a fresh model `/peer-review`, then `/tech-writer`.
