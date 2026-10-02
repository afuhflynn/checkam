# Rationale: 0017. Warm chat tone for WhatsApp replies

## Context

Every WhatsApp inbound runs the same path today. The worker extracts facts with the model (fact pull only, never a verdict), runs the rules engine, and sends `whatsappReply` from `src/lib/rules/engine.ts`. That reply always opens with a titled header plus an intro line, then evidence, contact lines, and a closing action block. There is no memory of what came before in the thread, so a follow up like thanks gets another full titled alert.

The forces that shape this choice are trust plus cost plus safety. A stiff repeat title makes the bot feel robotic and makes people less likely to forward a real alert to family. Each reply is billed per message now, and each model call costs inference, so a pure reaction should not pay for a full extraction it does not need. Safety cannot bend for warmth. A high risk alert must still carry its action lines, and both languages (French and English) must feel human on a phone screen.

## Options considered

### Option 1: Fix in place with deterministic template

Extend the current renderer with a follow up flag. The rules engine builds both shapes from the same verdict plus evidence, using fixed warm openers and closers in both languages. The worker decides first versus follow up from small thread fields and passes the flag in.

1. Pro: one source of truth for verdict wording, so full and short can never disagree.
2. Pro: no new service or model call, so cost and failure surface stay flat.
3. Con: warm wording is fixed copy, so it cannot riff on what the person just said.
4. Con: renderer gains a branch, so future voice edits must check both shapes.

### Option 2: Model drafts the short note

Keep the full shape deterministic and let the model draft the short follow up around the stored verdict. The template supplies verdict plus action lines, the model supplies the warm connective tissue.

1. Pro: most human feel, since wording can echo the last turn.
2. Pro: no copy to maintain for every small tone tweak.
3. Con: risk of verdict drift, since free prose can soften or restate risk.
4. Con: extra inference cost on exactly the turns this spec wants to make cheap, plus a new failure path when the model call fails.

### Option 3: Strangler with parallel renderer

Build a new renderer module beside the old one, dual run both for a period, compare outputs, then cut over and retire the old path.

1. Pro: safest cutover story, since old output stays live until the new one proves itself.
2. Pro: clean seam if the voice later grows into a full conversational layer.
3. Con: two renderers to maintain during the overlap, with double test surface.
4. Con: overkill for a small additive branch, slows a change the current module can absorb.

## Rationale

The product rule that the model extracts facts but never decides the verdict points straight at a deterministic short note. Option 2 would put free prose next to risk wording on the cheapest turns, which is exactly where drift would hide. Option 3 buys cutover safety this change does not need, since the edit is additive and the old full path stays the default for every new check. Fixed copy in both languages keeps review honest, keeps the 1600 character ceiling logic in one place, and lets the worker save money by skipping extraction when there is nothing new to extract.

## Voice revision (row 33)

Shipping the warm shape taught us warmth alone does not read human. The opener plus title plus intro triple greets, the brand header advertises, a preview host leaks where it should never appear, the closer begs for more work, and the hotline repeats itself. The revision keeps the machinery (marker, gate, language, shorts) and replaces only the full voice with the web answer shape: verdict first in plain words, at most two signals, action, one small signoff. Research backs each cut: verdict first survives chat preview truncation, no title or stock closer in texts, identity lives in the profile not the body, attribution belongs at the end, and scam warnings earn trust through plain explanations from a known sender rather than banners.

## Voice research

Read only landscape check, 2026-10-02, for the revision above:

1. Verdict first: chat preview truncates the rest, so the result belongs in the first sentence.
2. One idea per bubble, no branded title header, no stock hello or goodbye in texts.
3. Bot upfront honesty about limits beats repeated identical lines.
4. On WhatsApp, identity lives in the profile plus verified badge, not in body headers. In session replies stay free form and non promotional. Attribution belongs at the end as a short sender line.
5. Forwarded tags alone barely move belief; sender identity and plain explanations do. Copy must stay paste ready plain text with no header art.
6. Short sentences around fifteen words, active voice, no jargon, source stated in full.

Sources named by the check: Nielsen Norman Group chatbots and tone studies, GOV.UK Service Manual on texts, digital.gov plain language principles, WhatsApp Business messaging policy and template rules, Everyday Misinformation Project survey, Tandoc Singapore study, ACM India field study on corrections, MIT social debunking review.
