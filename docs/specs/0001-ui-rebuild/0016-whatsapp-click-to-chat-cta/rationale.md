# 0016. Rationale: a WhatsApp chat button that starts the conversation in one tap

## Context

The product has a WhatsApp surface that works, and a website that cannot really offer it. The bot reads a pasted message, runs the rules engine, and answers on a phone in properly accented French. Spec 0015 made that surface safe to turn on: one pinned Meta version, our own 24 hour window, a monthly cap that defaults to free, and a reply rendered for a phone. Verification of 0015 on 2026-10-01 confirmed twelve of thirteen acceptance criteria against the running app, with AC-11 failing.

None of that is reachable from the interface. The landing page has no chat button. The nav's WhatsApp link points at `/whatsapp`, which is a guide page, not a conversation. The guide page offers a phone number to save, and that is the whole of it. So the surface we have done the most work on is the surface our visitors have the least route to.

The route we already have is a number based link. `GET /api/guide/number` at `src/app/api/guide/number/route.ts:13` builds `https://wa.me/237654335150` from `WHATSAPP_NUMBER`, and `src/components/guide-trials.tsx:44` appends a pre-filled message to it. That works, with three problems. It puts our phone number in the HTML of every page that carries one, which is a harvesting target. It gives desktop users a bare number, because `wa.me` on a desktop browser asks them to install the app or find the contact themselves. And it asks a first time user to do three things, save a contact, find the chat, and invent a first message, where the whole product is one pasted message.

The operator holds a click to chat code, `JW4YDECEFLJQN1`, which is the newer code based form. I opened it in a real browser during verification. It redirects to `api.whatsapp.com/message/JW4YDECEFLJQN1?autoload=1&app_absent=0` and renders a landing page carrying the CheckAm name, the CheckAm logo, the pre-filled message "Hello CheckAm, I want to verify a suspicious message I just received.", an **Open app** button and a **Continue to WhatsApp Web** button. That is a branded page, a desktop path, and no number in our HTML.

One property of that link shaped this whole spec. The pre-filled message is baked into the code and **cannot be overridden from the call site**. I appended `?text=TESTOVERRIDE` and the landing page still showed the original English sentence. So we do not choose what message a user receives by editing a URL; we choose it by choosing which code Meta minted, and the code we hold mints English.

That interacts with how the product already works, and badly. `detectMessageLanguage` picks the reply language from the inbound text, and spec 0015 made that deliberate: one sender, one language, never both. I ran the real string through the real detector:

```
the code link's built-in prefill  -> reply language: en
French speaker who edits it       -> reply language: fr
```

So a French speaking user, who is the majority language in the country this product is for, taps a button labelled in French, sends the English message we handed them without editing, and receives an English answer. The reply is internally consistent, which is what 0015 asked for, and consistently in the wrong language for that person. This is the kind of defect that only shows up when you actually run the string through the actual code, which is why it is written into AC-7 as a detector assertion rather than a copy review.

## Options considered

### Option 1: One constant, three placements, language in the label

Put the code in a single exported constant in `src/lib/whatsapp`, render a solid button in the hero and on the guide page plus a floating button on small screens, and put the language in the label rather than in the message.

**Pros**:
- One constant, so no page can drift back to a number based link, and a test can enforce it.
- The label is the only language lever we actually hold, so the spec stops pretending the message is ours to set.
- The branded landing page and the desktop path come for free, because they are properties of the code.
- Number leaves the page source as a side effect, not as a separate task.

**Cons**:
- The pre-filled message stays English, so the language gap is reduced and not closed.
- A floating button is a persistent claim on a design language the project keeps quiet, and it is the piece most likely to be wrong.
- Three placements is three things to keep consistent in two languages.

### Option 2: Skip the code, improve the number based link

Keep `wa.me/237654335150` and add `?text=` in the language of the button.

**Pros**:
- Nothing new to hold, the number is already in the environment.
- The pre-filled message genuinely is ours, so the French user gets a French first message and a French reply. This fixes the language problem completely.
- No branded landing page, so the first thing a user sees is their own empty chat box.

**Cons**:
- The number stays in the HTML, which is the thing the code form exists to solve.
- Desktop users get a raw number.
- The pre-filled text is still a prompt the user must edit before they paste their scam, so the friction is only partly gone.

### Option 3: One button, no language branching, English message everywhere

Ship the code link with one label per language but no attempt to influence the message, and accept that first contact is English.

**Pros**:
- Simplest possible thing. One button, one link.
- No claim about language correctness to test or maintain.

**Cons**:
- Knowingly sends the majority language users into an English first exchange on a product whose entire value is being trusted. A user who cannot read the first message may abandon before pasting the scam, which is the one outcome worse than no button.
- Fails AC-7 as written, so the criterion would have to be weakened to match the code rather than the code changed to match the criterion.

### Option 4: Embed a chat widget

A third party widget, or the WhatsApp Business chat launcher, embedded on our pages.

**Pros**:
- Looks like a product rather than a link, and some widgets show a typing indicator and unread state.
- Vendors offer attribution, which we do not have.

**Cons**:
- A third party script on every page, in a product for people who have been targeted by fraud, asking them to trust an embedded frame with their conversation. That is a bad fit on trust grounds alone.
- We would learn nothing about the conversation, because it runs in their widget, and our rules engine and our evidence are the product.
- The widget needs its own credentials and its own failure modes, and it is a dependency to keep alive forever.
- Attribution is a nice to have we do not yet need. We do not have volume to attribute.

## Why Option 1

Option 2 solves the language problem better and fails the privacy and desktop problems. Option 1 solves privacy and desktop and reduces the language problem to the one lever we hold, which is the label. Option 3 is honest about doing nothing but ships a known wrong language to the majority of our users.

The deciding factor is what each option makes us responsible for. Option 1 makes us responsible for a label, a link and a page, all of which we fully control and can test. The English pre-filled message is Meta's copy on Meta's code, and the honest move is to name it, assert the part we do control, and file the rest as a follow up with Meta rather than quietly accepting it. That is the same posture spec 0015 took with the Cameroon rate card: do not write down a number we cannot source.

Two ordering decisions fall out of this. The guide page fix is step 1, ahead of the buttons, because that page currently advertises a reply with emoji and asterisk bold that spec 0015 forbids, and adding a button that sends people into WhatsApp while the guide misrepresents the reply is worse than the current state. And AC-11 should be fixed before this ships, because the failure mode of a volume lever on a system where one sender can get two overlapping replies is visible to the user at exactly the moment we are asking them to trust us.

## Risks

- **The floating button reads as noise.** One persistent element on every page against a deliberately quiet design. Mitigation: it is the first thing to cut, and the follow up says so.
- **A dead code.** If the code is revoked or the number is ported, every button on the site breaks at once, silently, because a link that 404s still looks like a button. Mitigation: the constant is one place, so repair is one edit, and the guide page's save the number flow stays as a working fallback.
- **Desktop is the awkward case.** WhatsApp Web requires a scan or a login. The landing page handles it with its own button, so our link does not have to, but the first time user still meets a WhatsApp screen we do not control. Accepted, and better than a bare number.
- **Volume against a cap.** A good week can reach 1,000 replies and start sending cap notices. That is 0015 working as designed, but this feature makes it more likely to happen sooner. Worth watching the usage row, which 0015 built for exactly this.

## References

- WhatsApp Help Center, "How to use click to chat", `faq.whatsapp.com/en/general/26000030`: the documented `wa.me/<number>` and `?text=` forms. The code based form used here is not in this page, which is why the decision rests on the observed redirect rather than on documentation.
- Observed 2026-10-01 in a real browser: `wa.me/message/JW4YDECEFLJQN1` to `api.whatsapp.com/message/JW4YDECEFLJQN1?autoload=1&app_absent=0`, rendering the name, logo, pre-filled message and both buttons. Appending `?text=TESTOVERRIDE` did not change the pre-filled message.
- WhatsApp Business Messaging Policy, `whatsappbusiness.com/policy`: replies may be sent free form within 24 hours of a user message, and automation in that window must keep a clear escalation path. CheckAm's ANTIC hotline line and its web chat are that path, which is why the reply format keeps them (spec 0015 AC-8).
- Project evidence for the language gap: `detectMessageLanguage` on the link's built in message returns `en`; on a French paste it returns `fr`.
