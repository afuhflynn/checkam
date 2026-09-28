# 0001 rationale - UI rebuild

## Context

CheckAm verifies scams with a deterministic rules engine; the intake hub, registry, WhatsApp channel, and admin moderation exist and work. Missing: account depth (no Google, no mail sender), persistent chat (no session tables), agent behavior (no tools), and one visual voice across landing, chat, settings, and guide. The engineer chose: password + Google, guest 2 tries per day then sign in wall, Nodemailer through Inngest (verify + reset + welcome), agent with Tavily + local lookups behind reviewed prompts, lean settings + WhatsApp guide, Journey slices with GA rigor, no references section.

## Options considered

- **Skateboard (thin whole first):** ships a clickable shell fast but leaves auth and mail half done; rejected because trust flows must work fully before chat opens.
- **Tracer Bullet (vertical slices per layer):** steady production style but splits the user flow across many threads; rejected because the value here is the end to end path, not layer coverage.
- **Journey (chosen):** Path 2 auth + mail, Path 3 chat + agent, Paths 1 + 4 shell, polish throughout. Each phase is usable and demoable; matches how the engineer described the product.
- **Mail providers:** Nodemailer over a new external API because the engineer named it and Postgres + Inngest already cover queueing; SMTP keys stay in env, never in code.
- **Guest policy:** 2 per day (browser id + IP hash) reconciles “2 tries” with “daily cap”: generous enough to convert, cheap enough to absorb abuse, tunable from logs.
- **Visuals:** dossier identity (paper, stamp, perforation, mono filing labels) over the shadcn base instead of a generic cream + serif marketing look or a dark acid neon look; the stamp is the one risk, everything else stays quiet.

## Rationale

Identity first (auth + mail) because chat history and abuse limits need a user row. Model before shell because folders, messages, and caps shape every screen. Agent after shell because tools need a thread to live in. Shell last because landing, settings, and guide can only be finished once the flows they lead to exist. GA tail on auth, mail, and agent because those carry trust, money adjacent decisions, and PII.
