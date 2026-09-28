// Domain trust, in one place.
//
// This used to live inline in two spots as `endsWith(".gov.cm") || endsWith(".cm")`,
// which treated every .cm domain as a Cameroon government domain. A scammer who
// registers any .cm name therefore minted himself a VERIFIED_OFFICIAL verdict
// with score 5. Since this product's whole promise is that a green result means
// stop worrying, a check that certifies scams is worse than no check at all.

// Host equals a government domain, or is a subdomain of one. Never a bare
// suffix test: "minfopra.gov.cm.evil.com" ends with "gov.cm" only by accident.
export function isCameroonGovHost(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/\.$/, "");
  if (!h) return false;
  const base = h.split(":")[0] ?? h;
  return base === "gov.cm" || base.endsWith(".gov.cm");
}

// A .cm domain that merely resembles an institution, e.g. recruitment-minesec.cm
// or minesec.cm.attacker.net. Callers use this to explain a near miss to the
// reader, so the names stay deliberately broad.
export function looksCameroonian(cmHost: string): boolean {
  const h = cmHost.trim().toLowerCase().replace(/\.$/, "");
  return h === "cm" || h.endsWith(".cm");
}

// Hosts extracted from URLs and bare www references in a message. Used to tell
// "this message points at" from "this message mentions", which is the
// difference between a real official channel and a scammer quoting one.
export function extractHosts(text: string): string[] {
  const hosts = new Set<string>();
  const patterns = [/\bhttps?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi, /\bwww\.([a-z0-9-]+\.[a-z]{2,})/gi];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const host = match[1]?.toLowerCase();
      if (host) hosts.add(host);
    }
  }
  return [...hosts];
}
