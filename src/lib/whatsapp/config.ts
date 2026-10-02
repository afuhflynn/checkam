/**
 * WhatsApp configuration and clock helpers (spec 0015).
 *
 * Every environment read for the WhatsApp path lives here so the parsing rules
 * are written once: what a junk value falls back to, and which defaults keep
 * the default configuration free.
 */

/** Meta's free allowance: service messages per business phone number per month. */
export const META_FREE_SERVICE_MESSAGES_PER_MONTH = 1000;

/** The customer service window. Any inbound message opens it, and it is 24h. */
export const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

const DEFAULT_TIMEZONE = "Africa/Douala";

/**
 * Total replies allowed per phone number per month. The default is exactly
 * Meta's free allowance, so the default configuration cannot be billed.
 *
 * Unlike the Tavily budget parser, 0 is honoured: an operator must be able to
 * silence the bot. Only a value that is not a usable whole number falls back.
 */
export function monthlyReplyCap(): number {
  const raw = process.env.WHATSAPP_MONTHLY_REPLY_CAP;
  if (raw === undefined || raw.trim() === "") {
    return META_FREE_SERVICE_MESSAGES_PER_MONTH;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return META_FREE_SERVICE_MESSAGES_PER_MONTH;
  }
  return Math.floor(parsed);
}

/**
 * Slots held back from the cap so a person who messages after the cap is
 * reached gets an explanation instead of silence. They are still inside the
 * cap, so the total never exceeds it and the default stays free.
 */
export function capNoticeReserve(): number {
  const cap = monthlyReplyCap();
  return Math.min(25, Math.floor(cap / 4));
}

/** The timezone Meta resets the monthly allowance in. */
export function accountTimezone(): string {
  const raw = process.env.WHATSAPP_ACCOUNT_TIMEZONE?.trim();
  if (!raw) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: raw });
    return raw;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/** Offset of a timezone from UTC, in milliseconds, at a given instant. */
function timezoneOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const found = parts.find((p) => p.type === type);
    return found ? Number(found.value) : 0;
  };
  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour") % 24,
    read("minute"),
    read("second"),
  );
  return asUtc - at.getTime();
}

/** The month key we bill against, for example `2026-10`, in account time. */
export function monthKey(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: accountTimezone(),
    year: "numeric",
    month: "2-digit",
  }).formatToParts(at);
  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}`;
}

/** The UTC instant at which a month key starts in account time. */
export function monthStartUtc(month: string): Date {
  const timeZone = accountTimezone();
  const naive = Date.parse(`${month}-01T00:00:00Z`);
  if (Number.isNaN(naive)) return new Date(naive);
  let start = new Date(naive - timezoneOffsetMs(new Date(naive), timeZone));
  // One refinement pass, so a month that starts on a daylight saving change
  // still lands on the right instant.
  start = new Date(naive - timezoneOffsetMs(start, timeZone));
  return start;
}

export function phoneNumberId(): string | null {
  const raw = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  return raw && !raw.includes("placeholder") ? raw : null;
}

function apiToken(): string | null {
  const raw = process.env.WHATSAPP_API_TOKEN?.trim();
  return raw && !raw.includes("placeholder") ? raw : null;
}

/** True only when a real send is possible. Never log the token itself. */
export function hasSendCredentials(): boolean {
  return apiToken() !== null && phoneNumberId() !== null;
}

export function authHeader(): string {
  const token = apiToken();
  if (!token) throw new Error("WHATSAPP_API_TOKEN is not configured");
  return `Bearer ${token}`;
}
