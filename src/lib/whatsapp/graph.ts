/**
 * The single door to the Meta Graph API (spec 0015, AC-1).
 *
 * The version is a constant on purpose. Meta retires a version on a published
 * date and every call against it fails rather than degrades, and v19.0 expired
 * on 2026-05-21. An environment override is exactly how that value drifts back
 * to a dead version, so the only supported way to change it is to edit this
 * file and deploy. The host appears here and nowhere else in `src/`, which a
 * test enforces.
 */
export const GRAPH_API_VERSION = "v26.0";

const GRAPH_HOST = "graph.facebook.com";

/** Build a versioned Graph URL for a path such as `<phoneNumberId>/messages`. */
export function graphUrl(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return `https://${GRAPH_HOST}/${GRAPH_API_VERSION}/${clean}`;
}
