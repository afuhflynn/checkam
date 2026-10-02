import { extractEmails } from "../rules/email-rules";
import { MONEY_AMOUNT } from "../rules/engine";
import { extractCameroonPhoneNumbers } from "../rules/phone-normalizer";

/**
 * Cheap new claim signal (spec 0017). Decides from the raw text alone, with no
 * model call, whether an inbound message carries a fresh claim that earns a
 * full verdict. Anything uncertain reads as a new claim: the build fails to
 * full, never to short, so a fresh scam never gets a stale stored verdict.
 */

const LINK_PATTERN = /https?:\/\/|www\.|\b[a-z0-9-]+\.(cm|com|net|org|info|biz|me|io)\b/i;
/** Above this length a message is always a claim, never a reaction. */
const NEW_CLAIM_LENGTH = 140;

export function isNewClaimText(
  text: string | undefined | null,
  opts?: { hasMediaText?: boolean },
): boolean {
  // Extracted image text is always a claim, even when short.
  if (opts?.hasMediaText) return true;
  const body = (text ?? "").trim();
  if (body.length === 0) return false;
  if (body.length > NEW_CLAIM_LENGTH) return true;
  if (LINK_PATTERN.test(body)) return true;
  if (MONEY_AMOUNT.test(body)) return true;
  if (extractCameroonPhoneNumbers(body).length > 0) return true;
  if (extractEmails(body).length > 0) return true;
  return false;
}
