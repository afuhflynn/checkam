/**
 * The one place the public address of this site is decided (consistency sweep,
 * 2026-10-02).
 *
 * Every user facing surface used to hardcode `checkam.cm`, which meant the
 * domain lived in nine places and a staging deployment advertised production.
 * Everything now reads it from here instead.
 *
 * The guard matters more than the variable. `NEXT_PUBLIC_APP_URL` defaults to
 * `http://localhost:3000` for local work, and the rules engine is bundled into
 * the browser, so the value is frozen into the build. Reading it literally would
 * let a production build ship "analysé sur http://localhost:3000" inside a scam
 * alert sent to a real person. So a localhost or placeholder value is treated as
 * unset and the production domain is used instead.
 *
 * Local development is unaffected: the fallback is the real domain, which is the
 * correct thing to tell a tester anyway, since a warning saying "analysed on
 * localhost" would be useless to them.
 */

/** Where the product lives. Overriding this is how a preview or staging deploy changes it. */
const PRODUCTION_APP_URL = "https://checkam.cm";

/**
 * Values that mean "this build has no real address configured". Anything local or
 * synthetic falls back rather than shipping.
 */
function isUnusable(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (trimmed === "") return true;
  if (trimmed.includes("placeholder")) return true;
  if (trimmed.includes("CHANGE_ME")) return true;
  // if (trimmed.includes("localhost")) return true; // commented out for now to make this function locally usable
  if (trimmed.includes("127.0.0.1")) return true;
  if (trimmed.startsWith("http://")) return true;
  return false;
}

/**
 * The public address of this site, with no trailing slash.
 *
 * Use this for anything a person reads or clicks: the reply text, the share
 * link, canonical URLs, the cap notice.
 */
export function appUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  if (isUnusable(configured)) return PRODUCTION_APP_URL;
  return configured.replace(/\/+$/, "");
}

/**
 * The bare host, for copy that reads "sur checkam.cm" rather than spelling out a
 * full URL. Falls back to the host of the production address, never to
 * `localhost:3000`, for the same reason `appUrl` exists.
 */
export function appHost(): string {
  return appUrl()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

/**
 * An absolute URL for a path such as `/scam/minesec-fraude`. Used where a link
 * has to be complete on its own, such as canonical metadata and a share.
 */
export function absoluteUrl(path = "/"): string {
  const base = appUrl();
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return suffix === "/" ? base : `${base}${suffix}`;
}
