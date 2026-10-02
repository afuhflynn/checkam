# Verify: WhatsApp chat button · spec 0016

_Steps derived from spec 0016 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._

**Read this first.** This feature is links and copy, so almost everything is a browser check, not a database check. Nothing here sends a real message: the click to chat link opens WhatsApp, and sending requires a real person on a real phone. To see where the link goes, open it in a browser and read the landing page, or check that the button's `href` is the constant.

The link cannot be exercised headlessly end to end, because the last hop is the WhatsApp app. Treat "the button opens the right landing page" as the ceiling of what automation can prove, and check the rest by reading the rendered DOM.

## Commands

- [ ] `pnpm typecheck` → clean, no errors
- [ ] `pnpm lint` → clean
- [ ] `pnpm test` → all pass, including the new destination scan and language assertions
- [ ] `npx biome check src/lib/whatsapp src/components src/app/\(site\)` → clean
- [ ] `grep -rn "wa.me/" src/components src/app` → every hit is a share link with no recipient, none is a chat entry point built from the number → AC-1, AC-8
- [ ] `grep -rn "CLICK_TO_CHAT_URL" src/` → one definition, every button reads it → AC-1

## UI / manual

- [ ] Landing page, hero → a WhatsApp chat button sits beside "Start a Free Check" and "Browse Scam Registry", with an icon and a text label → AC-2
- [ ] The hero chat button's `href` is exactly `https://wa.me/message/JW4YDECEFLJQN1` → AC-1
- [ ] Switch the interface to French, reload → the hero button reads "Vérifier sur WhatsApp" and the page around it is French → AC-5
- [ ] Switch back to English → the button reads "Check on WhatsApp" → AC-5
- [ ] Open the button's `href` in a browser → the landing page shows the CheckAm name, the logo, a pre-filled message and both an "Open app" and a "Continue to WhatsApp Web" button → AC-6
- [ ] Read the pre-filled message on that landing page → it is not empty, it invites the user to paste the suspicious message, and it is under 500 characters → AC-6
- [ ] Run `detectMessageLanguage` on the exact pre-filled message string → the language it returns is the language of the button that opens the link. This is the criterion that catches an English message sent to a French user → AC-7
- [ ] `/whatsapp` → the chat button is the primary action, above the simulator → AC-4
- [ ] `/whatsapp`, in both languages → the sample reply shown matches `whatsappReply` for the same input, and carries no emoji and no asterisk → AC-12
- [ ] `/whatsapp` source at `src/app/(site)/whatsapp/page.tsx` → the hardcoded `MINSEC_REPLY_FR` and `MINSEC_REPLY_EN` constants are gone → AC-12
- [ ] Any public page at 390 pixels wide → the floating button sits bottom right above the safe area, with icon and short label → AC-3
- [ ] Landing page at 390 pixels → the floating button is not announced to a screen reader, because the hero button already offers the same destination. Check in the accessibility tree, not by eye → AC-3
- [ ] Any other public page at 390 pixels → the floating button is present and announced → AC-3
- [ ] Tab through the landing page → every chat button takes focus, shows a visible focus ring, and Enter opens it → AC-10
- [ ] With `prefers-reduced-motion: reduce` → the hover lift does not animate → AC-10
- [ ] At 320 pixels wide → the hero primary call to action, the ANTIC hotline banner and the chat composer are all still clickable, with the floating button overlapping none of them. Hit test, do not read the class names → AC-11
- [ ] Render each button in both languages and read its `aria-label` → non empty, and in the same language as its visible label → AC-9
- [ ] `curl -s http://localhost:3000/ | grep -c "237654335150"` → 0. Same for `/whatsapp` and `/verify` → AC-8
- [ ] Confirm no new endpoint, environment value or migration was added: `git status --short` shows only components, the dictionary, the module constant and docs → AC-13

## Acceptance-criteria coverage

- AC-1 covered by the constant grep and the hero `href` check
- AC-2 covered by the hero button check
- AC-3 covered by the floating button checks at 390 pixels and the accessibility tree check
- AC-4 covered by the guide page button check
- AC-5 covered by both language checks on the hero
- AC-6 covered by the landing page read and the pre-filled message check
- AC-7 covered by the detector run on the real string
- AC-8 covered by the `wa.me` grep and the number leakage checks
- AC-9 covered by the icon plus label and `aria-label` checks
- AC-10 covered by the keyboard, focus ring and reduced motion checks
- AC-11 covered by the 320 pixel hit test
- AC-12 covered by the guide simulator checks and the deleted constants
- AC-13 covered by the git status check

## Blocked by design

These cannot be automated and are the engineer's to run, or to accept as not done:

- A real person on a real phone taps the button and receives a real reply. This is the only step that touches the live product from the user's side, and it needs a phone with WhatsApp installed and a number you control.
- A desktop user reaches WhatsApp Web from the button and completes a check there. Worth one manual pass, because the desktop path is a reason this feature exists and nothing here proves it.
- Whether the floating button reads as useful or as noise. That is a judgement, and the follow up says to cut it if traffic says it is never tapped.
