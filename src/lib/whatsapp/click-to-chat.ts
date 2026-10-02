/**
 * The click to chat entry point (spec 0016, AC-1).
 *
 * This is WhatsApp's code based deep link, not the number based `wa.me/<number>`
 * form. Two reasons it is the only chat destination we use:
 *
 * 1. The number stays out of the page source. A number based link puts
 *    `WHATSAPP_NUMBER` in the HTML of every page that carries one, which is a
 *    harvesting target for the people most likely to be scammed here.
 * 2. It lands on a branded page with both an "Open app" and a
 *    "Continue to WhatsApp Web" button, so a desktop visitor with no phone in
 *    hand still has a path.
 *
 * It is a constant rather than an environment value for the same reason
 * `GRAPH_API_VERSION` is: a value that can drift is a value that will drift.
 */

/** The one URL every chat button in the interface points at. */
export const CLICK_TO_CHAT_URL = "https://wa.me/message/JW4YDECEFLJQN1";

/**
 * The visible label, one per language.
 *
 * The message inside the link is fixed by Meta and cannot be overridden with
 * `?text=`, so the label is the only language lever we hold at the call site.
 * It follows the language already chosen in the interface, so a French speaker
 * is offered a French button rather than an English one.
 */
export const CLICK_TO_CHAT_LABEL = {
  fr: "Vérifier sur WhatsApp",
  en: "Check on WhatsApp",
} as const;

/**
 * The accessible name. Kept separate from the label because a screen reader
 * benefits from hearing the destination ("opens WhatsApp") rather than the
 * instruction alone, and because a bare link with no name is announced as a URL.
 */
export const CLICK_TO_CHAT_HINT = {
  fr: "Ouvrir une discussion WhatsApp avec CheckAm",
  en: "Open a WhatsApp chat with CheckAm",
} as const;

/**
 * The anchor the in page hero button carries, so the float button can watch it.
 * When that button is already on screen the float button steps out of the
 * accessibility tree, because offering the same destination twice on one page
 * makes a screen reader user choose between two identical links (AC-3).
 */
export const CLICK_TO_CHAT_ANCHOR_ID = "whatsapp-chat-cta";
