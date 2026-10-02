# 0014 verify: message actions and re ask

Verification steps for [`index.md`](index.md). Each step names the acceptance criteria it proves. Run against a real signed in reader and a real guest, on phone and desktop, in both languages.

## Setup

- A signed in verified reader with a session holding at least two question and answer pairs.
- A guest with a fresh guest key, who has one try left.
- An answer containing a fenced code block, a link and a bulleted list.
- Two browser tabs on the same session, to test the stale target refusal.

## Copy

1. On every message, the ones you sent and the answers, an action row is present in the page, not only after hovering. Verifies **AC-1**, **AC-4**.
2. Copy an answer containing a fenced block, a link and a bulleted list. The clipboard holds the words only, with no fence markers, no asterisks and no URL where the link text was. Verifies **AC-1**.
3. The copy icon becomes a check for about a second and returns to a copy icon. Verifies **AC-3**.
4. Copy one of your own messages. The clipboard holds your own text as plain words. Verifies **AC-1**.
5. Deny clipboard permission, then copy. The existing bilingual failure message appears and the icon does not flip. Verifies **AC-3**.
6. Copy a code block. The clipboard holds only that block, with no language marker and no fence. Verifies **AC-2**.
7. There is exactly one copy control on a code block, not two. Verifies **AC-2**, **AC-13**.
8. Switch to French and hover or focus a code block. Its titles read in French, not the library's English. Verifies **AC-2**.
9. Repeat the label and tooltip checks for every new control in French. Verifies **AC-4**.
10. With no mouse at all, tab from the top of the thread until each control takes focus, then press Enter. Every control is reachable and operable. Verifies **AC-4**.

## Re ask

11. Only the most recent settled answer carries a re ask. Every earlier answer carries copy only. Verifies **AC-6**.
12. Start a long answer and watch it stream. No action row appears. It appears once the answer settles. Verifies **AC-5**.
13. Re ask the most recent answer. While the new answer streams, the answer being replaced is not also on screen. Verifies **AC-7**.
14. When the stream settles, the thread shows exactly one answer to that question, the fresh one, in the same position, with no reload. Verifies **AC-7**.
15. Reload the page anyway. The thread still shows one answer to that question. Verifies **AC-7**, **AC-8**.
16. Tap re ask again while the first is still running. The control is disabled, shows progress, and the thread ends with one answer, not a race. Verifies **AC-11**.
17. Stop the network mid re ask. The control leaves its running state and the reader is not left stuck. Verifies **AC-11**.
18. As a guest on the last try, re ask. The reader sees the guest wall, not the generic failure message, and no answer is replaced. Verifies **AC-9**, **AC-11**.

## Stale target

19. Open one session in two tabs. In the first tab, send a new message so the second tab's newest answer is no longer the last live answer. In the second tab, re ask the answer it shows as newest. The request is refused, no row is stamped, and the thread still shows one answer per question. Verifies **AC-15**.

## Persistence and accounting

20. Re ask twice in a row. In the database there are three answer rows, two stamped superseded, and the thread shows one. Verifies **AC-8**.
21. Confirm the two superseded rows still carry their `toolCalls`, and that the daily Tavily budget reflects all three turns rather than one. Verifies **AC-8**, **AC-9**.
22. Load a session long enough to page older turns. A cursor paged older page also shows only live rows. Verifies **AC-8**.
23. Re ask an answer whose verdict was already shared. The previously shared verdict link still resolves after the answer is replaced. Verifies **AC-10**.
24. Confirm the verdict lookup path was not filtered along with the thread path, by re checking step 23 after a full page reload. Verifies **AC-8**, **AC-10**.

## Disabled states

25. Put a photo in the composer with no typed text and send. Re ask is disabled and states why, and pressing it sends no request. Verifies **AC-12**.

## Security

26. Ask a reader to re ask in a session belonging to someone else, passing that session's answer id as `supersedeId`. The request is refused and nothing changes. Verifies **AC-14**.
27. Confirm a re ask reaches the existing transport route only, with no new endpoint, and that the rate limiter and the Tavily budget behave exactly as for a normal turn. Verifies **AC-14**.

## Surface

28. Compare the rendered answer before and after the build. Lists, code blocks, tables, math and diagrams look the same, with the action row as the only addition. Verifies **AC-13**.
29. Enable reduced motion and walk the copy confirmation and the re ask progress state. No motion is forced. Verifies **AC-4**.
30. On a phone, confirm every control meets the touch target size, none is clipped by the thread edges, and a tap reaches copy and re ask with no hover. Verifies **AC-4**.

## Automated tests

- Component tests for the action row: the control is a real button, its click copies, the icon checks then reverts, and the failure path shows the bilingual message. Verifies **AC-1**, **AC-3**.
- Component test asserting the Markdown to plain conversion drops fences, marks and URLs while keeping link text and the inner text of a fenced block. Verifies **AC-1**.
- Component test asserting the action row is in the page without any hover or focus, since a synthetic event cannot prove a tap and the element being present is the part that can be proven. Verifies **AC-4**.
- Server test that the thread read path filters superseded rows, and an explicit test that the four paths which must not filter still resolve: the verdict lookup, the Tavily budget, the sequence assignment and the guest counter. Verifies **AC-8**, **AC-10**.
- Server test that a re ask stamps the previous row and inserts the new one in one transaction, that the sequence does not collide, and that the verdict reference is untouched. Verifies **AC-7**, **AC-10**.
- Server test that a re ask against a stale target is refused with 409 and changes nothing. Verifies **AC-15**.
- Server test that the guest counter counts user rows plus superseded assistant rows, including the wall boundary. Verifies **AC-9**.

## Commands

- `pnpm typecheck` → clean
- `pnpm test` → all green
- `pnpm db:migrate --name add_chat_message_superseded_at` (or the applied migration folder) → the `chat_messages` table carries a nullable `supersededAt`, and every existing row reads back as live. Verifies **AC-8**.
- `POST /api/chat/transport` with a `supersedeId` naming a row that is not the latest live answer of the session → 409 `stale_supersede`, and no row is stamped. Verifies **AC-15**.
- `POST /api/chat/transport` with a `supersedeId` from another reader's session → 409, never a stamp. Verifies **AC-14**, **AC-15**.
- `GET /api/chat/sessions/<id>/messages` on a session holding superseded rows → the response carries only live rows, on the first page and on a cursor paged older page. Verifies **AC-8**.
- After a re ask, query `chat_messages` → the replaced row has `supersededAt` set, keeps its `toolCalls` and its `verificationId`, and its `seq` is lower than the new row's. Verifies **AC-8**, **AC-10**.

## Value sourcing (one step per row of the spec's Value sourcing table)

- Copy a message → the clipboard text is the row's `text` converted from Markdown, never the stored string. Paste it into a plain text editor and confirm no Markdown marker of any kind survives. Verifies **AC-1**.
- Copy a code block → the clipboard holds that block's source and nothing from the rest of the answer. Verifies **AC-2**.
- Copy confirmation → the check appears from local component state and returns to the copy icon on its own after about one second, with no server round trip. Verifies **AC-3**.
- Copy failure → the notice reads the existing `copyFailed` string, in the reader's language. Verifies **AC-3**.
- Every new label (copy, copied, re ask, re ask working, re ask unavailable reason) reads from the dictionary in both language halves. Toggle the language and read each one. Verifies **AC-1**, **AC-4**.
- Code control titles → they come from Streamdown's own `translations` prop in both languages, and Streamdown still renders the block itself (no `components` override anywhere). Verifies **AC-2**, **AC-13**.
- Which answer gets re ask → the client picks the last assistant row, and the server refuses anything else, so a second reader or a second tab cannot leave two live answers to one question. Verifies **AC-6**, **AC-15**.
- Re ask charge → the guest counter reads user rows plus superseded assistant rows. Check the count in the database and against the tries left line in the rail, before and after a re ask. Verifies **AC-9**.
- Supersede stamp → the replaced row's `supersededAt` is the time the server accepted the re ask, not the client's clock. Check it against the row's `createdAt` ordering. Verifies **AC-7**, **AC-8**.
- The answer being replaced → the `supersedeId` on the request is a cuid that belongs to the caller's own session; a cuid from another session is refused. Verifies **AC-14**, **AC-15**.
- Verdict on a replaced answer → the old row's `verificationId` is untouched and still resolves through `/api/chat/verdict`. Verifies **AC-10**.

## Acceptance-criteria coverage map

- AC-1: Copy steps 1–4, 14, Value sourcing copy, Value sourcing conversion shapes
- AC-2: Copy steps 6–8, 28, Value sourcing code block, Value sourcing titles
- AC-3: Copy steps 3, 5, Value sourcing confirmation, Value sourcing failure
- AC-4: Copy steps 1, 9–10, 22, 29–30, Surface 29–30, Value sourcing labels
- AC-5: Re ask step 12
- AC-6: Re ask step 11, Stale target 19, Value sourcing which answer
- AC-7: Re ask 13–15, Persistence 20, Value sourcing supersede stamp
- AC-8: Migration, Persistence 20–22, filter tests, Value sourcing supersede stamp, budget
- AC-9: Persistence 21, guest wall 18, counter tests, Value sourcing charge
- AC-10: Persistence 23–24, Value sourcing verdict
- AC-11: Re ask 16–18, guest wall 18
- AC-12: Disabled states 25, Value sourcing re ask unavailable
- AC-13: Copy 7, Surface 28, Value sourcing titles
- AC-14: Security 26–27, Value sourcing answer being replaced
- AC-15: Stale target 19, Security 26, Value sourcing which answer / answer being replaced
