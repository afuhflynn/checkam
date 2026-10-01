# 0014 rationale: message actions and re ask

Decision record for [`index.md`](index.md). Read by humans and by a later `/solution-architect` on update or supersede, never during a build.

## Context

The thread renders answers well and does almost nothing with them. A reader who has just been told a phone number is a scam has no way to take that answer anywhere: the existing copy paths in the codebase are the rail Share action, the verdict card, the WhatsApp guide number and the intake paste handler, none of which copy an answer. The product's whole purpose is forwarding a warning to someone, and forwarding currently means retyping.

The pieces for this already exist and are unused. `src/components/ai-elements/message.tsx` exports `MessageActions` at line 70 and `MessageAction` at line 85, each already carrying a tooltip and a screen reader label. `thread-view.tsx` imports only `Message`, `MessageContent` and `MessageResponse`. So the action primitives are written and simply not rendered.

Two further findings shaped the design more than expected. First, rich text rendering is already live and so is code block copy: `MessageResponse` wraps Streamdown with the cjk, code, math and mermaid plugins, and Streamdown renders its own copy button on every code block by default, which `MessageResponse` does not turn off. The question was never whether to add a code block copy button but whether to leave the one that ships.

Second, the obvious way to re ask is wrong for this client. The installed AI SDK v7 exposes a `regenerate` function and sends a first class `regenerate-message` trigger, which is the path this design originally chose. It cannot work here. `thread-view.tsx:430` creates `useChat` with only an `id` and a transport, with no initial messages, and renders the thread from pages fetched over HTTP. The SDK's own message state is therefore empty on every cold load, so `regenerate()` cannot find the message to replace and throws. The ids are also in different namespaces, a Prisma cuid on the row and a client generated id in the SDK. And `TransportSchema` at `transport/route.ts:20` declares only `sessionId`, `userSeq`, `locale` and `messages`, so a trigger sent by the SDK would be stripped by Zod and the server would see an ordinary turn.

Storage is the remaining real constraint. `ChatMessage` carries `@@unique([sessionId, seq])` and `transport/route.ts` assigns the next sequence as the last one plus one, so there is no branch column and nowhere to keep two answers to one question. Two accounting details matter. `tokenUse` is only ever selected and never written, so no real budget depends on it. The budget that does exist is the daily Tavily call count, read from `toolCalls` in `src/lib/agent/tools.ts`. And `counter.ts` derives the guest daily cap by counting `role: "user"` rows rather than from any counter table, though the transport inlines its own equivalent count and does not call that helper.

One force is recent and specific. The rail menu shipped in feature 16 as a bare Radix item, which renders a div, so tapping Settings on a phone did nothing while the mouse path worked everywhere and passed every check. Any new control inside the thread must be reachable by tap from the start.

## Options considered

### Option 1: Wire what exists, one nullable column, one field on the transport request (chosen)

Use the vendored action primitives, leave code block copy to Streamdown, add `supersededAt` to `ChatMessage`, keep the replaced row, and drive a re ask by resending the preceding question through the existing `sendMessage` with one added body field, `supersedeId`, naming the answer row to replace.

**Pros**:
- No new dependency and no new table. The primitives, the clipboard writes and the rich text pipeline already exist.
- The re ask needs no seeding of SDK state, no mapping between id namespaces, and no change to how the conversation is modelled client side.
- It keeps the existing refresh path, since `onFinish` already calls `syncNew`.
- Keeping the replaced row preserves its `toolCalls`, so the budget and the guest wall stay honest.

**Cons**:
- The filter rule is asymmetric. Four read paths must deliberately not filter, and two of them fail silently rather than loudly.
- Superseded rows accumulate, and the guest counter stops equalling the message count.
- One documented field is added to the transport body, which is the thing a pure SDK path would have avoided.

### Option 2: Make the SDK's own regenerate work

Seed `useChat` state from the database on load, add `trigger` and `messageId` to `TransportSchema`, and map SDK message ids onto database row ids.

**Pros**:
- Uses the framework's first class path rather than a field of our own.
- Would make `resumeStream` and any other SDK feature that reads that state available later.

**Cons**:
- Requires the conversation to exist twice, once in the SDK's state and once in the fetched pages, and the two must never drift.
- Needs an id mapping layer between cuids and SDK generated ids.
- Changes the transport contract to match the SDK rather than the other way round, for a client that deliberately does not keep SDK state.

### Option 3: Persist branches and let the reader flip between answers

Add a branch or variant column, widen the unique to `[sessionId, seq, variant]`, and use the vendored `MessageBranch` primitives so the reader can step between answers.

**Pros**:
- Keeps both readings, which is the strongest form of the comparison a wrong verdict needs.
- The branch primitives already exist and already render an "n of m" selector.

**Cons**:
- Changes the sequence model and every read that assumes one answer per sequence number, for a reader who mostly wants the fresh answer.
- Makes the thread longer and the mental model heavier, on a surface whose whole job is to stay calm.

### Option 4: Replace by deleting the old row

Implement "in place" as a delete plus an insert, with no new column at all.

**Pros**:
- Simplest possible change. No migration and no filter, and the thread stays clean by construction.

**Cons**:
- Destroys the `toolCalls` record, so the Tavily budget under counts and the spend stops agreeing with the history.
- A verdict already shared by someone stops resolving once its answer row is gone, which is the one link that matters in this product.
- The failure is silent. Nothing errors, the numbers just drift.

## Rationale

Option 1 wins on reuse, and reuse turned out to be the whole story. Most of what was asked for already exists: the action primitives are written and unrendered, Streamdown already renders rich text and already renders a code block copy button, and the clipboard writes exist in five places. An independent critique pass also confirmed that copying code blocks was already shipped, so that work is deleted rather than built.

Option 1 wins more decisively on mechanism. The first version of this spec chose the SDK's `regenerate`, and that was wrong, because this client has never kept the SDK's message state and cannot. Resending the preceding question with one extra field reaches the same server behaviour with none of the id mapping, none of the duplicated conversation state, and no dependence on SDK semantics this app does not otherwise use. Option 2 buys a framework feature the app has no use for beyond this one button.

Option 3 is the strongest answer to the question a reader actually asks, which is whether the first answer was wrong. It loses on cost and on surface area: it changes the sequence model that four read paths already depend on, and it makes the thread heavier for the common case of simply wanting a second reading. It is the better design if branch comparison ever becomes a headline feature. It is not the better design for this one.

Option 4 is disqualified by accounting. It looks like the cheapest path and it is the only one that quietly breaks a limit which exists to protect the service, and it breaks a link someone may have already sent to a family member. A failure that produces wrong numbers rather than an error is the worst kind.

On the reader experience, replacing in place is right because the thread is a question and an answer, and a re ask is the same question asked again. Keeping the answer next to it would be a branch view, which is a different feature.

The asymmetric filter rule is the real cost of this design and is written out explicitly in the spec rather than left to the builder, because the two failure modes are quiet: a filtered budget under counts, and a filtered verdict lookup breaks a link already sent to somebody. Naming the four paths that must not filter is worth more than the elegance of a uniform rule.

The tap constraint from feature 16 is why the controls are specified as always mounted rather than revealed only on hover. It is cheap to build correctly and expensive to retrofit.
