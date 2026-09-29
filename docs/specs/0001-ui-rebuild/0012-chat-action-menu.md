# 0012. Chat history action menu

**Date**: 2026-09-29
**Status**: Proposed

## Summary

The chat history action menu currently uses raw symbols (star, pencil, X, dropdown) with no clear labels. Users cannot tell what each button does without guessing. This spec replaces the symbol based menu with clear text labels (Rename, Share, Pin, Delete) so users know exactly what each action does. The menu works for both folders and sessions, is bilingual, and is accessible.

## Context

The chat history UI is in `src/components/chat/chat-shell.tsx`. The current action menu for chat history items uses raw symbols: a star for pin, a pencil for rename, an X for delete, and a dropdown for move to folder. These symbols are not self explanatory. Users cannot tell what each button does without hovering or guessing. The menu is also not accessible: buttons have no text labels, only aria labels that may not be read by all screen readers.

The chat history is the primary navigation surface for returning users. A confusing action menu makes the product feel unfinished and untrustworthy. The fix is to replace the symbol based menu with clear text labels that explain each action.

## Requirements

**User stories**:
- As a user, I want clear text labels on the chat history action menu so that I know what each button does without guessing.
- As a user, I want to rename, share, pin, and delete any chat history item from a clear action menu.
- As a user, I want the action menu to work in both English and French.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: Each chat history item shows a clear action menu with text labels (Rename, Share, Pin, Delete). No raw symbols without labels.
- **AC-2**: The Share action copies a link to the clipboard and shows a confirmation toast.
- **AC-3**: The Pin action moves the item to the top of the list and shows a visual indicator.
- **AC-4**: The Rename action turns the title into an inline editable input field. Press Enter to save, Escape to cancel.
- **AC-5**: The Delete action removes the item and shows a toast with an Undo button.
- **AC-6**: The action menu works for both folders and sessions.
- **AC-7**: The action menu is bilingual (EN and FR).
- **AC-8**: The action menu is accessible (keyboard navigable, ARIA labels, focus states).

## Options considered

### Option 1: Text label buttons

Replace each symbol button with a text label button (Rename, Share, Pin, Delete). Each button has a clear text label and an optional icon.

**Pros**:
- Clear and self explanatory.
- Accessible by default (text labels are read by screen readers).
- Easy to implement (just replace the button content).

**Cons**:
- Takes more horizontal space than icon only buttons.
- May feel cluttered on mobile.

### Option 2: Icon plus label

Keep the icons but add text labels beside them. Each button has an icon and a text label.

**Pros**:
- Familiar visual cue plus clear meaning.
- More compact than text only labels.

**Cons**:
- Takes even more horizontal space than text only labels.
- May feel cluttered on mobile.

### Option 3: Dropdown menu

Replace the individual buttons with a single menu button (three dots) that opens a dropdown with all actions.

**Pros**:
- Cleanest look (only one button visible).
- Scales well if more actions are added later.

**Cons**:
- Requires an extra tap to see the actions.
- Less discoverable (users may not know the menu exists).
- Harder to make accessible (dropdown menus are tricky for screen readers).

## Decision

**Chosen option**: Option 1: Text label buttons

Replace each symbol button with a text label button (Rename, Share, Pin, Delete). Each button has a clear text label and an optional icon.

**Implementation skills**: none detected

## Rationale

The core problem is that users cannot tell what each button does without guessing. Text labels solve this directly and are the most accessible option. The icon plus label option (Option 2) was considered and rejected because it takes too much horizontal space, especially on mobile. The dropdown menu option (Option 3) was considered and rejected because it requires an extra tap and is less discoverable.

Text label buttons are the simplest solution that solves the problem. They are accessible by default, easy to implement, and work well on both desktop and mobile. The horizontal space concern is mitigated by using compact buttons with short labels.

## Feature design

**Data model sketch**:

No database changes. The action menu uses the existing `pinned` field on `ChatFolder` and `ChatSession`. The Share action generates a link client side using the current URL plus the session ID.

**State transitions**: not applicable.

**API surface**: no new endpoints. The action menu calls existing API endpoints:
- `PATCH /api/chat/sessions/[id]` for rename and pin
- `DELETE /api/chat/sessions/[id]` for delete
- `PATCH /api/chat/folders/[id]` for rename and pin
- `DELETE /api/chat/folders/[id]` for delete

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Rename | New title text | User input (inline edit) |
| Share (session) | Shareable link to session | Client side generation from current URL plus session ID |
| Share (folder) | Shareable link to filtered folder view | Client side generation from current URL plus folder ID |
| Pin | Pinned state (boolean) | Toggle existing `pinned` field |
| Delete | Deletion confirmation with undo | Existing delete mutation with undo toast (5 second window) |

**Key invariants**:
- The action menu never shows raw symbols without text labels.
- The action menu is always bilingual (EN and FR).
- The action menu is always accessible (keyboard navigable, ARIA labels, focus states).
- The Share action always copies a link to the clipboard and shows a confirmation toast.
- The Share link requires authentication. Unauthenticated users see a sign in prompt.
- The Pin action always toggles the pinned state and moves the item to the top of the list.
- Pinned items sort by most recently pinned first (LIFO).
- The Rename action always validates the input (no empty strings, max 120 chars).
- The Delete action always shows a toast with an Undo button.
- Undo restores the item to its original position, pinned status, and title.
- On mobile, the action menu collapses into a dropdown. On desktop, text labels are always visible.

**Security model**: The Share link requires authentication. Unauthenticated users see a sign in prompt. The link exposes only the shared session or folder, not the full chat history.

**Configuration required**: none.

**Critical test scenarios**:
- Happy path: user renames a chat, the title updates inline. Verifies **AC-4**.
- Happy path: user shares a chat, the link is copied to the clipboard and a toast appears. Verifies **AC-2**.
- Happy path: user pins a chat, the item moves to the top of the list. Verifies **AC-3**.
- Happy path: user deletes a chat, the item is removed and a toast with Undo appears. Verifies **AC-5**.
- Edge case: user tries to rename a chat to an empty string, the input is rejected. Verifies **AC-4**.
- Edge case: user tries to pin a chat that is already pinned, the item is unpinned. Verifies **AC-3**.
- Edge case: user tries to delete the active chat, the chat is deleted and the main view closes. Verifies **AC-5**.
- Accessibility: all action menu buttons are keyboard navigable and have ARIA labels. Verifies **AC-8**.

## Build plan

1. Replace the symbol based action menu in `src/components/chat/chat-shell.tsx` with text label buttons (Rename, Share, Pin, Delete). Add proper ARIA labels and keyboard navigation. Satisfies **AC-1**, **AC-6**, **AC-7**, **AC-8**.
2. Implement the Share action: generate a shareable link client side, copy it to the clipboard, and show a confirmation toast. Satisfies **AC-2**.
3. Implement the Pin action: toggle the pinned state, move the item to the top of the list, and show a visual indicator. Satisfies **AC-3**.
4. Implement the Rename action: turn the title into an inline editable input field, validate the input (no empty strings, max 120 chars), and save on Enter. Satisfies **AC-4**.
5. Implement the Delete action: remove the item and show a toast with an Undo button. Satisfies **AC-5**.

## Consequences

**Positive**:
- Users can tell what each button does without guessing.
- The menu is accessible by default.
- The menu is bilingual.
- The menu works for both folders and sessions.

**Negative / tradeoffs**:
- Text label buttons take more horizontal space than icon only buttons.
- The menu may feel cluttered on mobile.

**Neutral**:
- No database changes.
- No new dependencies.
- No API changes.

## Follow-up

- [ ] Consider adding a dropdown menu option for mobile if the text label buttons feel too cluttered on small screens.
