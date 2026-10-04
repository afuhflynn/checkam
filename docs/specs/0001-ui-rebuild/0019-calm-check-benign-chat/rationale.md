# Rationale: 0019. Calm check for benign chat

## Context

You see two sore spots today. A short hello on web gets a long CAUTION with a share row, even though there is no money talk and no link and no request in it. How does it work on WhatsApp gets a cold ask for full text plus a phone number, even though you asked how to use the product.

Every message now flows through the same check path. Short text with no signal still lands on CAUTION. That default protects you from scams but it scares you on benign talk. You also want the whole chat to feel relaxed, not strict all the time, like other assistants you enjoy.

The consequence of leaving this as is 程s low trust. You may stop pasting true claims because early turns felt alarming. You may also miss real risk because everything sounds alarming, so nothing sounds alarming.

## Options considered

### Option 1: Shared helper with rules first

One small helper decides benign or check from raw text alone, before any model call, on both surfaces. Rules stay final for true checks. Benign turns skip extraction and verdict. Copy lives in one place in both languages.

**Pros**:

1. Fast and testable, with no extra model cost for hellos.
2. One fix everywhere, so web and WhatsApp cannot drift apart.

**Cons**:

1. Word lists need care in EN and FR, so short slang may need tuning.
2. A tricky claim phrased as small talk could read as benign until tuning catches it.

### Option 2: Model intent each turn

Each inbound turn asks the model whether it is small talk or a claim, then routes to calm or check.

**Pros**:

1. More human on edge phrasing, with less list care.

**Cons**:

1. Adds cost and wait to every hello, including the cheapest turns.
2. A model call before rules weakens your promise that rules decide risk alone.

### Option 3: Split web and WhatsApp

Web gets the calm path now, WhatsApp keeps the current path until later.

**Pros**:

1. Smaller first ship, with less coordination across surfaces.

**Cons**:

1. Two tones live at once, so trust feels uneven and the guide cannot match both.
2. Parity work you already ship must be redone to reunite them.

## Rationale

You chose wide benign cover with warm short replies and a short explainer that invites a try. You also want chat to feel like other assistants, relaxed unless risk is present. A shared helper fits that force best because it answers hellos at once with no model wait and no verdict noise, while any signal of value at stake still takes the full check path. The model path would feel smart on edges but it taxes every hello and blurs who decides risk. The split path ships faster on one surface but it leaves you with two voices, which is the exact uneven feel you asked to remove.
