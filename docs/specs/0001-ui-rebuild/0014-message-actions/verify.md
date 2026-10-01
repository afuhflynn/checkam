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
