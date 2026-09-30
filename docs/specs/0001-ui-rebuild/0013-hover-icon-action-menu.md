# 0013. Hover icon action menu for the chat rail

**Date**: 2026-09-29

## Summary

Every check and folder in the chat rail keeps its title readable, with one action icon that appears on hover, on keyboard focus, and on the check you are inside. That icon opens a dropdown holding rename, share, pin, move and delete, each with a real text label. This replaces spec 0012, whose inline labelled buttons were measured collapsing the title to zero width and would not open at all on a phone.

## Context

The rail is 256 pixels wide on desktop and a drawer on a phone. Spec 0012 put four text labelled buttons on every row. Runtime verification measured those labels at 232 pixels inside roughly 240 pixels of usable width, which left the title button at zero pixels. The row rendered its actions with no way to tell which check they belonged to. The same build's mobile menu never opened at all: it tracked its own open flag while the underlying menu primitive kept its own, so opening mounted a menu that was already closed.

Three further facts from that verification and from reading the rail shape this design. Deleting a check runs a database update, and the session timestamp updates itself on every write, so an undone delete returns the row to the top of its pinned group rather than to its exact previous index. The undo marker is valid for 30 days and single use, so what actually limits an undo is how long the toast stays on screen, not a short timer. And the rail groups sessions into folders in the browser, which throws away the order the API returns, so pinning only reorders within a section rather than lifting a check to the top of the whole rail.

The actions themselves all work and were confirmed at runtime: rename saves, escape cancels, pin moves a row, delete confirms and offers undo, and a shared link opens the reader's own check while returning a plain not found for anyone else. That work is worth keeping. What is being replaced is only how the actions are reached.

## Requirements

**User stories**:
- As someone returning to their checks, I want to read each check's title clearly so that I know which one I am about to open.
- As someone tidying my history, I want one obvious place per row holding rename, share, pin, move and delete so that I do not have to guess at symbols.
- As someone using a keyboard or a screen reader, I want the same actions as everyone else so that nothing is hover only.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: A check row shows its title at all times. Measured at rail width in both languages with a 120 character title, the title button is wider than zero pixels and the text is truncated with an ellipsis. Truncation is expected; a collapsed button is not.
- **AC-2**: One action icon appears on a row when the pointer is over it, when it has keyboard focus, and on the check that is currently open. The icon is always present in the DOM and always focusable, hidden only visually, so Tab always reaches it. Tap or Enter opens the menu.
- **AC-3**: The menu is built from the existing shadcn DropdownMenu wrapper and holds labelled items: Rename, Share, Pin or Unpin, Move to, Delete. No raw symbol is the only carrier of meaning.
- **AC-4**: Choosing Rename closes the menu and turns the title into an input in place. The input grows with the typed text so nothing is hidden while typing, stops growing at the row's own width, and scrolls horizontally past that point.
- **AC-5**: The rename saves on blur or Enter, never while typing. Escape restores the title from when editing began and closes the field. There are no Save or Cancel buttons.
- **AC-6**: Clearing the field and clicking away restores the previous title and shows the empty title message. An empty title is never sent. A failed request does the same and shows the save failed message, a different string from the empty one.
- **AC-7**: Share copies a link that opens that check and confirms it. The link opens only the reader's own check, so anyone else gets a plain not found.
- **AC-8**: Pin and Unpin move the check to the top of its own section, most recently pinned first, and never out of the folder that holds it. Folders themselves sort pinned first in the rail. A pinned check shows a Lucide star in its own narrow leading column, never inside the title text, and a screen reader announces it as pinned. The menu item reads Unpin when already pinned.
- **AC-9**: Delete asks for confirmation, removes the item, and offers Undo while the toast is on screen. For a check, Undo brings it back with its title, folder and pinned state intact, at the top of its pinned section rather than at its exact previous index. Deleting a folder also deletes the checks inside it, and Undo restores both.
- **AC-10**: Move to opens a nested submenu listing No folder first, then your folders in rail order, with the check's current folder shown but not selectable. With no folders the submenu holds only No folder. Guests never see Move to, because moving a check into a folder is refused for them.
- **AC-11**: Folder rows hold New check here, Rename, Pin or Unpin, and Delete. No Share on a folder.
- **AC-12**: Every string this feature renders is bilingual, English and French, with French the default. That includes the folder delete confirmation count, which today is a hardcoded English word and an undercount taken from the loaded rail rather than the whole account.
- **AC-13**: The menu is reachable and operable by keyboard alone: the icon takes focus, Enter or Space opens it, arrow keys move between items, Escape closes it and returns focus to the icon.
- **AC-14**: Deleting a check or folder in one tab announces it to the other tabs over a BroadcastChannel. A menu open on a row that vanished this way closes quietly and discards any pending rename.
- **AC-15**: Icons come from lucide-react and carry no accessible name of their own, since the adjacent label does.
- **AC-16**: The menu honours reduced motion. It keeps the wrapper's default zoom and fade but adds motion safe, so a reader who asks for reduced motion sees the menu appear without scaling or sliding.
- **AC-17**: The menu is never clipped by the rail's scroll container. A menu opened on the last row of a long rail is fully visible, escaping the rail and sitting beside the row.

## Options considered

### Option 1: One hover icon opening a dropdown

A single icon per row, hidden visually until hover, focus, or the open row, opening a dropdown of labelled actions built from the existing shadcn wrapper.

**Pros**:
- Leaves the whole rail width for the title, which was the actual failure.
- One component, so desktop and phone cannot drift apart in labels or behaviour.
- The wrapper already handles focus trapping, arrow keys, escape, typeahead and outside click.
- Scales to more actions without widening the row.

**Cons**:
- One extra tap on a phone compared to always visible icons.
- Less discoverable than buttons that are always on screen.

### Option 2: Always visible icon per row

The same dropdown, but the icon never hides.

**Pros**:
- Nothing is hidden, so nothing is undiscoverable.
- No hover state to build or test.

**Cons**:
- Spends rail width permanently on every row to solve a problem only hover created.
- Densifies a rail that already scrolls.

### Option 3: Keep inline labelled buttons, shorten the labels

Single letter labels like R, S, P, D in the row.

**Pros**:
- Smallest change to what already exists.
- No menu at all.

**Cons**:
- Single letters are the same guessing problem as the symbols 0012 set out to remove, only shorter.
- Still consumes rail width, so the title stays at risk.
- Cannot hold Move to, which needs a list of folders.

## Decision

**Chosen option**: Option 1: One hover icon opening a dropdown

Every row shows its title plus one Lucide action icon that is always in the DOM, revealed on hover, on focus, and on the open check. The icon opens a dropdown built from the existing shadcn DropdownMenu wrapper, holding Rename, Share, Pin or Unpin, Move to as a nested submenu, and Delete, each with a text label. The row mounts exactly one menu root and holds no open state of its own.

## Rationale

The force that decided this is width. The rail is 256 pixels and four text labels measured 232 of the roughly 240 usable pixels, so the title collapsed to nothing. Any design that puts labels directly in the row competes with the title for the same pixels, so the labels have to move off the row. A dropdown puts the labels somewhere they have room to be read while giving the title the whole rail.

That alone does not pick the trigger, because hover alone would hide the actions from keyboard and touch users, and the rail is the product's primary navigation for returning users. Keeping the icon in the DOM at all times and revealing it visually on hover, focus and the open check makes the affordance available to every input method without spending width on rows nobody is pointing at. Hiding it by unmounting would quietly break Tab, which is why the spec names the mechanism rather than the intention.

The wrapper is chosen over hand rolling because spec 0012's mobile menu failed precisely by duplicating open state that the menu primitive already owns. That failure is now an invariant and a build task rather than a footnote, because it is the one defect in this feature that a green test suite did not catch.

Rename becoming an input with no buttons follows from the same width pressure: a Save and Cancel pair inside a 256 pixel row is what pushed the labels over the edge. Committing on blur or Enter removes the buttons, keeps the field in place of the text it replaces, and means nothing is sent until the edit is finished, which is what lets an empty title be rejected cleanly rather than half saved.

Pinning is scoped to a section rather than the whole rail because the rail groups by folder in the browser. Claiming a pin lifts a check to the top would be a criterion the code cannot satisfy, and an unsatisfiable criterion is worse than no criterion.

## Feature design

**Data model sketch**:

No change. `ChatSession` already carries `title`, `folderId`, `pinned`, `deletedAt` for soft delete, and `updatedAt` with Prisma's automatic update. `ChatFolder` carries the same shape. The undo marker already encodes kind, id and delete timestamp, which is everything restore needs. No migration, no new column.

**State transitions** (row presentation):

A row is in exactly one of: reading (title shown, icon present but visually hidden unless hovered, focused, or the open check), renaming (title replaced by a growing input), or acting (a menu is open on this row). Entering renaming happens from the menu and closes the menu. Leaving renaming happens on Enter, on blur, or on Escape, and in every case the committed title is either the typed value or the title captured when renaming began. A row deleted while renaming or acting goes straight to reading and is then removed, discarding the edit.

**API surface**:

No new endpoints. Every call the menu makes already exists and was exercised at runtime.

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/chat/sessions/[id] | GET | id (path) | session id, title, folderId, pinned, updatedAt | actor scoped | 404 not found |
| /api/chat/sessions/[id] | PATCH | title (1 to 120), pinned (bool), folderId (cuid or null) | updated session | actor scoped | 404, 422 invalid patch, 401 signed out for folder move, 422 no folder |
| /api/chat/sessions/[id] | DELETE | id (path) | undoToken | actor scoped | 404 |
| /api/chat/restore | POST | token | restored | token plus actor scope | 410 expired, 409 already restored, 404 |
| /api/chat/folders/[id] | PATCH | name (1 to 80), pinned (bool) | updated folder | owner only | 404, 422 |
| /api/chat/folders/[id] | DELETE | id (path) | undoToken | owner only | 404 |

The GET on a session is what a shared link depends on. It is scoped to the resolved actor, and verification confirmed a request with no cookie at all returns 404 rather than a row.

**Cross tab signalling**:

A `BroadcastChannel` named for chat invalidations. A successful delete posts the kind and the id. Every tab listening reconciles its rail by that id: a row still present is removed, and if a menu or a rename was open on that row, both are closed and the pending edit discarded. One tab is the source of truth for its own actor, and a guest's cookie is shared across their tabs, so a post can never cross an account boundary.

**Failure modes and ordering rules**:

- Pressing Enter in the rename field must not also trigger the menu's own close sequence. The menu is already closed by the time rename begins, and the field handles Enter itself.
- The delete confirmation opens after the menu has fully closed, never while a menu is still open, so the two overlays never stack.
- A failed rename leaves the row showing its previous title and the save failed message, never a title the server refused.
- Deleting a folder cascades to its checks, so Undo on a folder restores the folder and every check inside it.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Render the title | Check or folder name | `ChatSession.title` / `ChatFolder.name`, from the existing sessions and folders queries |
| Show the pinned star | Whether the row is pinned, announced to screen readers | `ChatSession.pinned` / `ChatFolder.pinned` column, plus a pinned label from the i18n dictionary |
| Menu item labels | Rename, Share, Pin, Unpin, Move to, No folder, Delete, New check here, Actions, Folder actions | i18n dictionary in `src/lib/i18n/dictionary.ts`, already added for these keys |
| Empty title message | Text shown when the field is cleared | i18n key `chatRenameEmpty`, kept |
| Save failed message | Text shown when the request is refused or times out | i18n key `chatRenameFailed`, to be added, deliberately distinct from the empty message |
| Folder delete count | Number shown in the folder delete confirmation | Count of loaded sessions with that folder id, bounded by the cursor paged rail, stated as a lower bound rather than a total |
| Rename input width | Grows with typed length, stops at the row's own width, scrolls past it | Measured from the typed text against the row's client width, not a character count and not a fixed value |
| Revert title on cancel or invalid input | The title before editing began | Captured in row state when rename mode opens, not refetched |
| Share link | Link that opens this check | Current origin plus `/chat?s=` plus `session.id`, read by the existing `?s=` parameter |
| Undo marker | Token for restore | The `undoToken` in the DELETE response |
| Move to submenu entries | Folder names, current folder marked, No folder first | The existing folders query, with the row's own `folderId` compared against each entry |
| Ordering within a section | Which pinned row sorts first | `pinned` then `updatedAt` then `id` in the existing sessions query, applied inside each folder section and inside the unfiled section |

**Key invariants**:
- The title button is never zero pixels wide. If the label set ever crowds it again, the labels move, not the title.
- The action icon is always mounted and always focusable. It is hidden with opacity and never unmounted, so Tab can reach it on every row at all times.
- Each row mounts exactly one menu root and holds no open state of its own. A local flag mirroring open is forbidden, because that is the defect that shipped in spec 0012.
- No action is reachable only by hover. Hover, keyboard focus and tap all reach the same menu.
- Every menu item carries a text label in both languages. No raw symbol is the only carrier of meaning, and the pinned star sits in its own column rather than inside the title text.
- No rename request is sent while the user is still typing.
- An empty or whitespace only title is never sent to the API.
- A failed rename request leaves the row showing its previous title, never a title the server refused.
- The menu never depends on the rail's scroll container for visibility.
- Every string rendered by this feature exists in both languages, including the folder delete count.

**Security model**:

No new exposure. The menu operates only on rows the resolved actor already owns or created as a guest, and every endpoint it calls is scoped the same way. The shared link is the one path that carries a check's content in a URL, and it is scoped by the GET: another reader receives a 404, not a row. The BroadcastChannel carries only a kind and an id, never content, and stays within one browser profile so it cannot cross an account. No new environment variables, no credentials, no compliance scope, since this touches no payment, health, or identity data beyond what the reader already holds.

**Configuration required**: none.

**Critical test scenarios**:
- Happy path: hover a row, the icon appears, open it, choose Rename, type, click away, and the title updates. Verifies **AC-1**, **AC-2**, **AC-4**, **AC-5**.
- Happy path: open the menu on a check and choose Share, then open the copied link in the same session and confirm that check opens. Verifies **AC-7**.
- Happy path: pin a check that sits inside a folder and confirm it moves to the top of that folder's section, not out of the folder, and that its menu item reads Unpin. Verifies **AC-8**.
- Happy path: delete a check, confirm, and use Undo from the toast. Verifies **AC-9**.
- Happy path: open the menu on a folder row and confirm it lists New check here, Rename, Pin or Unpin and Delete, and no Share. Verifies **AC-11**.
- Structure: read the rendered row and confirm every action item has a text label, and that the pinned star is a labelled icon outside the title text. Verifies **AC-3**, **AC-15**.
- Structure: switch the language cookie and confirm the menu labels, the pinned announcement and the folder delete count all change. Verifies **AC-12**.
- Failure case: clear the rename field completely and click away. The row restores its previous title, shows the empty title message, and no request is sent. Verifies **AC-6**.
- Failure case: make the rename request fail. The row shows its previous title and the save failed message, which is a different string from the empty one. Verifies **AC-6**.
- Failure case: while a menu is open on a check, delete that check from a second tab. The menu closes and no rename is sent. Verifies **AC-14**.
- Failure case: with reduced motion requested at the system level, open the menu and confirm it appears without scaling or sliding. Verifies **AC-16**.
- Auth: request a shared link with no session cookie. The response is a plain not found and no row renders. Verifies **AC-7**.
- Auth: as a guest, open a check menu and confirm Move to is absent. Verifies **AC-10**.
- Accessibility: reach the icon with Tab alone from a cold load without hovering, open with Enter, move with arrow keys, close with Escape, and confirm focus returns to the icon. Verifies **AC-13**, **AC-2**.
- Edge case: open the menu on the last row of a long rail and confirm it is fully visible rather than clipped. Verifies **AC-17**.
- Edge case: sign in, create one folder, open Move to on a check inside it, and confirm that folder is shown but not selectable while No folder remains first. Verifies **AC-10**.

## Build plan

1. Replace the row and the hand rolled menu with a row that renders the title at full width plus one Lucide icon. The icon is always mounted and always focusable, revealed by opacity on group hover and on focus visible, and present on the open check. It opens a dropdown built from the existing shadcn DropdownMenu wrapper, which the row must use as a single root with no local open state of its own. Keep menu content unmounted until it opens so a long rail does not mount one menu per row. Delete the hand rolled Menu and ActionList components. Honour reduced motion on the content. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-16**, **AC-17**.
2. Rebuild rename as a growing input in place of the title, with no buttons: width follows the typed text up to the row's own width and scrolls past it, commit happens on blur or Enter, Escape restores the title captured when editing began, and an empty or whitespace only value restores it and shows the empty title message without sending a request. A failed request restores it and shows the distinct save failed message. Enter must not also fire the menu close sequence. Satisfies **AC-4**, **AC-5**, **AC-6**.
3. Wire Share, Pin and Unpin, the nested Move to submenu with No folder first and the current folder unselectable, and Delete with its confirmation and undo through the new menu, reusing the existing calls. Hide Move to for guests. Folders get New check here, Rename, Pin or Unpin and Delete, with no Share. Sort pinned first inside each folder section and inside the unfiled section, and sort folders by pinned. Satisfies **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**.
4. Move the pinned star out of the title text into a narrow leading column as a labelled Lucide icon, so it no longer steals width from the title. Satisfies **AC-8**.
5. Add a BroadcastChannel for chat invalidations, posted after a successful delete, with every tab reconciling its rail by id and closing any menu or rename on a row that vanished. Satisfies **AC-14**.
6. Add the keyboard contract, so the icon takes focus, Enter or Space opens, arrows move between items, and Escape closes and returns focus to the icon. Ensure the delete confirmation opens only after the menu has fully closed. Satisfies **AC-13**.
7. Supply every label in English and French from the i18n dictionary, including a bilingual folder delete count and a pinned announcement, and add the save failed key. Keep the empty title key. Remove the now unused Save key. Satisfies **AC-12**.

## Consequences

**Positive**:
- The title is readable on every row, which is the thing 0012 broke.
- One component serves desktop and phone, so the two cannot drift apart in labels or behaviour.
- Every action reaches keyboard and touch users, not only a mouse.
- Reuses a menu wrapper the project already ships and already uses elsewhere.

**Negative / tradeoffs**:
- On a phone, opening the menu costs one more tap than an always visible icon would.
- The actions are one level deeper, so a first time user has to find them once.
- The growing input needs a measured width, which is more work than a fixed width input.
- Pinning only reorders within a section, so a pinned check inside a folder does not rise above unpinned checks in other folders. Lifting it across the whole rail would mean splitting pinned into its own section, which is a larger change to the rail's shape.
- The folder delete count is a lower bound, not the account's total, because the rail only holds what it has paged in. Saying so in the copy is better than a number that looks exact and is not.
- The BroadcastChannel adds a second, browser local path for noticing deletions alongside the 30 second poll. Two mechanisms can disagree, so the channel carries the prompt to reconcile and the poll remains the backstop.

**Neutral**:
- No schema change and no migration.
- No new endpoint and no new dependency.
- Menu content unmounts until opened, so a long rail mounts triggers rather than menus.

## Follow-up:

- [ ] The settings modal on the chat route (scope feature 17) will add another consumer of this rail's row pattern. Settle it before either builds, so the row and the menu end up as one component rather than two.
- [ ] Pinning only reorders within a section. If lifting a pinned check above every other section matters, that is a change to how the rail is shaped and wants its own decision rather than a tweak here.
- [ ] The folder delete count undercounts because the rail is cursor paged. A dedicated count endpoint would make it exact, and is worth doing only if people act on the number.
