# 0016. A WhatsApp chat button that starts the conversation in one tap

**Date**: 2026-10-01
**Status**: In Progress
**Scope feature**: 31 (WhatsApp chat button, Path 7)
**Build approach**: Journey (project default, from `docs/scope/scope.md`)

## Summary

WhatsApp is the surface most of our users already live on, and today the site can only offer it as a number to save or a page to read. We hold a WhatsApp click to chat code, `JW4YDECEFLJQN1`, which opens a branded landing page with an **Open app** button and a **Continue to WhatsApp Web** button, needs no app install on desktop, and does not expose our phone number in the page source. This spec puts a real chat button in the interface, in the user's own language, in the three places intent is highest, and fixes the guide page that currently advertises a reply shape the bot never sends.

## Requirements

**User stories**:
- As someone on a phone who just received a suspicious message, I want one button that opens WhatsApp already talking to CheckAm, so that I do not have to save a number, find the chat and type a first message.
- As someone at a desktop who has no phone in hand, I want the button to reach WhatsApp Web, so that I can check a message without installing anything.
- As a French speaking user, I want the button and the message I land in to be in French, so that the answer I get back is in the language I read.
- As the operator, I want our phone number kept out of the page source, so that scrapers cannot harvest it and turn it into a spam list.

**Acceptance criteria** (the contract, each independently checkable):

- **AC-1**: One exported constant holds the click to chat URL, and every chat button in the interface reads that constant. No page builds a `wa.me` URL from the phone number for a chat entry point.
- **AC-2**: A chat button appears in the landing hero beside the existing primary and secondary calls to action, and it is a real link with an accessible name that says it opens WhatsApp, not a click handler with no destination.
- **AC-3**: A floating chat button is present on every public page on small screens, sits at the bottom right above the safe area, and is the only floating element there. It is hidden from assistive technology when the hero button for the same destination is already in view, so a screen reader is not offered the same action twice on the landing page.
- **AC-4**: The guide page at `/whatsapp` carries the chat button as its primary action, above the simulator, because that page's whole purpose is to start a conversation.
- **AC-5**: Button labels are bilingual and follow the language already chosen in the interface: "Vérifier sur WhatsApp" in French and "Check on WhatsApp" in English. No hardcoded English string reaches a French user.
- **AC-6**: The WhatsApp landing page the code opens carries the CheckAm name and logo, and the pre-filled message invites the user to paste the suspicious message. The pre-filled message is not empty and is under 500 characters.
- **AC-7**: The pre-filled message inside the link is written in the language of the button that opened it, so a user who taps the French button and sends without editing receives a French reply. This is checked against `detectMessageLanguage` on the real string, not by reading the copy.
- **AC-8**: The number `WHATSAPP_NUMBER` is not present in the HTML of any public page, and the click to chat code is the only WhatsApp destination a chat entry point uses. A test fails the build if a chat entry point reintroduces a number based `wa.me` link.
- **AC-9**: Every button carries an icon plus a text label, never an icon alone, so the destination is clear without colour and readable to a screen reader.
- **AC-10**: The buttons meet the project's contrast and focus requirements, are reachable by keyboard alone, show a visible focus ring, and respect `prefers-reduced-motion` on the hover lift.
- **AC-11**: The floating button never covers the primary call to action, the ANTIC hotline banner, the cookie or consent affordance, or the chat composer, at any viewport from 320 pixels wide up.
- **AC-12**: The guide page simulator renders from `whatsappReply`, the same field the bot sends, in both languages. The hardcoded emoji and asterisk sample replies at `src/app/(site)/whatsapp/page.tsx:14` and `:26` are deleted, so the guide no longer advertises a shape the product forbids.
- **AC-13**: No new endpoint, no new environment value, no new table, and no change to the webhook, the window, the cap or the send path. This feature is links and copy only.

## Decision

**Chosen option**: Option 1, one constant, three placements, language in the label.

The click to chat code goes into a single exported constant in `src/lib/whatsapp`, which spec 0015 already made the only door to Meta. Three placements read it: the landing hero, a floating button on small screens, and the guide page. The language lives in the button label rather than in the pre-filled message, because the message inside the code cannot be overridden with `?text=` (verified: appending `?text=` leaves the built in message in place), so the only lever we hold at the call site is which button the user presses and what we tell them. That is honest about what we control.

**Implementation skills**: `frontend-design` (`/home/afuhflynn/.agents/skills/frontend-design/`) · `tailwindcss` (`/home/afuhflynn/.agents/skills/tailwindcss/`)

## Feature design

**Data model sketch**: none. No table, no column, no migration. This feature adds links and copy.

**Constants** (in `src/lib/whatsapp`, alongside the version pin from spec 0015):

| Name | Value | Notes |
| --- | --- | --- |
| `CLICK_TO_CHAT_URL` | `https://wa.me/message/JW4YDECEFLJQN1` | the only chat destination any button uses |
| `CLICK_TO_CHAT_LABEL` | `{ fr, en }` | the button label, one per language |
| `CLICK_TO_CHAT_HINT` | `{ fr, en }` | the accessible name and the `aria-label`, one per language |

**API surface**: no new endpoint. The existing `GET /api/guide/number` keeps serving the display number and the save-the-number flow, and is left alone. The buttons are rendered from a server safe constant at build time, so no client fetch is involved in opening a chat.

**Components**:

| Component | Placement | Notes |
| --- | --- | --- |
| `WhatsAppChatButton` | hero, guide page | variant `solid` or `outline`, icon plus label, real `<a>` |
| `WhatsAppFloatButton` | every public page, `sm` and below | fixed bottom right, WhatsApp green, icon plus short label |

`WhatsAppFloatButton` mounts once in the public layout at `src/app/(site)/layout.tsx`, not per page, so no page can forget it.

**Value sourcing**:

| Action | Value produced or displayed | Source |
| --- | --- | --- |
| Open a chat | the destination URL | the `CLICK_TO_CHAT_URL` constant, never assembled from the number |
| Label the button | the visible text | `CLICK_TO_CHAT_LABEL`, chosen by the `language` already in the i18n context |
| Name the button for a screen reader | the accessible name | `CLICK_TO_CHAT_HINT`, same language choice |
| Name the button for a crawler | the `aria-label` | the same hint, so the link is not announced as a bare URL |
| Show the guide's sample reply | the reply text | `whatsappReply` from `runRulesEngine`, the same field the worker sends |
| Choose the sample reply's language | `fr` or `en` | the language already in the i18n context, not a fresh detector call |

**Key invariants**:

- The click to chat code is a constant. Nothing reads it from the environment, so it cannot be changed by a deploy accident and cannot drift back to a number based link.
- No chat entry point ever builds a `wa.me` URL from `WHATSAPP_NUMBER`. That value stays for the save the number flow on the guide page, which is a different job.
- The label language and the accessible name language always agree, so a French user never sees an English button beside a French page.
- The guide page simulator and the bot read the same field. If they ever disagree, the simulator is wrong.
- No button covers another control. The floating button yields to the hero button and to the hotline banner.

**Security model**: no new authorization surface and no new data. The change is a static link and a label. It does reduce exposure, because a number based `wa.me` link puts `WHATSAPP_NUMBER` in the HTML of every page that carries one, and the code form does not. It adds no secret, since the click to chat code is a public identifier, not a credential, and it is not the `WHATSAPP_PHONE_NUMBER_ID` used for sending.

**Configuration required**: none. The code is a constant, deliberately, for the same reason the API version is a constant in spec 0015: an environment value is how a value silently drifts.

**Critical test scenarios**:
- The constant is the only chat destination: a test scans public components for a number based `wa.me` link and fails if one appears in a chat entry point. It matches the number based form specifically, so `verdict-card.tsx`, `scam-dossier.tsx` and `thread-view.tsx`, which build share links with no recipient, are not false positives. Satisfies **AC-1**, **AC-8**.
- Label language follows the interface: with the context set to `fr` the rendered label is the French string, and with `en` it is the English string, asserted on rendered output rather than on the dictionary. Satisfies **AC-5**.
- The pre-filled message is a language the detector agrees with: run `detectMessageLanguage` on the exact string inside the live link and assert it returns the language of the button that opens it. This is the criterion that would have caught the original problem, where the English built in message made a French user receive an English reply. Satisfies **AC-6**, **AC-7**.
- The guide simulator matches the bot: render the guide with a known input, take the sample reply it shows, and assert it equals `whatsappReply` for the same input and language, and that no emoji or asterisk reaches it. Satisfies **AC-12**.
- The number is not in the HTML: request the landing page and the guide page, and assert `WHATSAPP_NUMBER` appears in neither body. Satisfies **AC-8**.
- Keyboard and contrast: every button is reachable by keyboard, has a visible focus ring, and its label and accessible name are non empty in both languages. Satisfies **AC-9**, **AC-10**.
- The floating button yields: at 320 pixels wide the hero primary call to action, the ANTIC banner and the chat composer are all still clickable, checked by hit testing rather than by reading the class names. Satisfies **AC-11**.
- Reduced motion: with `prefers-reduced-motion: reduce` the hover lift does not animate. Satisfies **AC-10**.

**Out of scope**: a QR code, an ads that click to WhatsApp campaign, attribution or UTM tracking on the inbound message, a second click to chat code with French copy, and any change to the bot's reply content.

## Build plan

Ordered so each step is usable on its own. Step 1 alone makes the guide page honest, which is the most urgent item because it is currently a public contradiction.

1. [x] Fix the guide page truth. Replace both hardcoded sample replies at `src/app/(site)/whatsapp/page.tsx:14` and `:26` with a `whatsappReply` render, so the guide shows the shape the bot actually sends. Delete the emoji constants. Satisfies **AC-12**.
2. [x] Open the module surface. Add `CLICK_TO_CHAT_URL`, `CLICK_TO_CHAT_LABEL` and `CLICK_TO_CHAT_HINT` to `src/lib/whatsapp`, and the two bilingual dictionary keys the components read. Satisfies **AC-1**, **AC-5**.
3. [x] Build `WhatsAppChatButton` and place it in the hero and on the guide page. Real link, icon plus label, language from context. Satisfies **AC-2**, **AC-4**, **AC-9**, **AC-10**.
4. [x] Build `WhatsAppFloatButton` and mount it once in the public layout for small screens, hidden from assistive technology on the landing page where the hero button already offers the same destination. Satisfies **AC-3**, **AC-11**.
5. [x] Lock it in. Add the destination scan, the language assertions, the detector assertion and the number leakage test, then walk the acceptance criteria in a real browser at 320, 390 and 1280 pixels. Satisfies **AC-6**, **AC-7**, **AC-8**.

## Consequences

**Positive**:
- The highest intent action on the site becomes one tap, on the surface most of our users already have installed.
- Our phone number leaves the HTML of every public page.
- Desktop users, who cannot use the app, get a working path through WhatsApp Web.
- The guide page stops contradicting the bot, which is the kind of thing that costs trust with exactly the people we are trying to protect.

**Negative / tradeoffs**:
- This is a volume lever pointed at a system with two known problems. Spec 0015 verification found AC-11 failing, so one sender can currently receive two overlapping replies, and the 1,000 reply monthly cap means a good week can hit the ceiling and start sending cap notices. Shipping a growth button while those are open is a deliberate choice, and it is why the recommendation is to fix AC-11 first.
- The pre-filled message inside the link is English, and we cannot override it at the call site. A French user who taps and sends without editing gets an English first message and therefore an English reply, because the reply language follows the inbound text. Step 5 of the build asserts the language we can control and the follow up tracks the copy we cannot.
- A floating button on every page is a persistent visual claim on a design language the project has kept deliberately quiet. It is the one element here that fights the existing design, and it should be the easiest thing to drop if it reads as noise.
- Bilingual copy is doubled by construction, so every new label is a translation obligation, not a one off string.

**Neutral**:
- No new dependency, no new endpoint, no migration, no environment value.
- `GET /api/guide/number` and the save the number flow are untouched. Saving a number is still useful, it is just no longer the only path.
- The share links in `verdict-card.tsx`, `scam-dossier.tsx` and `thread-view.tsx` keep their current no recipient form, since sharing a warning to a chosen contact is a different action from starting a check.

## Follow-up

- [ ] Ask Meta to regenerate the click to chat link with a French pre-filled message, or mint a second code with French copy, so the common path is right without depending on the user editing the message. This is the real fix for the language gap and it is not ours to implement.
- [ ] Measure where chat button taps land. `wa.me` is a Meta hosted redirect and no referrer survives it, so attribution needs a first party short link that stamps a click id into the message. Only worth it once there is volume to attribute.
- [ ] A QR code for print, on a flyer or a poster at a university or a quarter. The same constant works, and it is the natural companion to this feature.
- [ ] Reconsider the floating button once there is real traffic. If it is never tapped it is costing the design and should go.
- [ ] `mprocs.yaml` still does not start `inngest:dev`, so `pnpm dev:all` leaves the worker not running, and `pnpm inngest:dev` segfaults on this machine. That is an Inngest setup problem, recorded in the spec 0015 verification, not part of this feature, but it blocks local work on anything WhatsApp.
- [ ] `INNGEST_DEV` is set nowhere. The SDK currently auto detects the local dev server, so nothing is broken, but the current Inngest docs ask for it explicitly and auto detection only works on a default host.
- [ ] No `checkpointing` `maxRuntime` and no `maxDuration` on the Inngest route, which the Inngest docs recommend for serverless deploys and which sit in the same area as the AC-11 failure.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
