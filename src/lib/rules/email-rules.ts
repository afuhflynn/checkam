export const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.fr",
  "hotmail.com",
  "hotmail.fr",
  "outlook.com",
  "outlook.fr",
  "live.com",
  "yopmail.com",
  "proton.me",
  "protonmail.com",
  "mail.com",
  "mail.ru",
  "aol.com",
  "zoho.com",
  "gmx.com",
  "gmx.fr",
  "icloud.com",
]);

export interface ExtractedEmail {
  original: string;
  domain: string;
  isFreeDomain: boolean;
  isOfficialGovDomain: boolean;
}

export function extractEmails(text: string): ExtractedEmail[] {
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const matches = text.match(emailRegex) || [];

  const results: ExtractedEmail[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const lower = match.toLowerCase().trim();
    if (!seen.has(lower)) {
      seen.add(lower);
      const domain = lower.split("@")[1] || "";
      const isFree = FREE_EMAIL_DOMAINS.has(domain);
      const isGov = domain.endsWith(".gov.cm") || domain.endsWith(".cm");

      results.push({
        original: lower,
        domain,
        isFreeDomain: isFree,
        isOfficialGovDomain: isGov,
      });
    }
  }

  return results;
}

export function evaluateEmailLegitimacy(
  emails: ExtractedEmail[],
  claimedEntityAcronym?: string | null,
): {
  hasFreeEmailForGovEntity: boolean;
  evidenceBulletEn: string | null;
  evidenceBulletFr: string | null;
} {
  if (!emails.length) {
    return {
      hasFreeEmailForGovEntity: false,
      evidenceBulletEn: null,
      evidenceBulletFr: null,
    };
  }

  const freeEmails = emails.filter((e) => e.isFreeDomain);

  if (freeEmails.length > 0 && claimedEntityAcronym) {
    const first = freeEmails[0];
    const emailSample = first ? first.original : "unknown";
    return {
      hasFreeEmailForGovEntity: true,
      // No asterisks: this string is forwarded to Facebook and SMS as plain
      // text, where emphasis markers read as noise.
      evidenceBulletEn: `Uses a free email address (${emailSample}) instead of an address on a gov.cm or cm domain.`,
      evidenceBulletFr: `Utilise une adresse email gratuite non officielle (${emailSample}) au lieu d'un domaine gouvernemental authentique (*.gov.cm ou *.cm).`,
    };
  }

  return {
    hasFreeEmailForGovEntity: false,
    evidenceBulletEn: null,
    evidenceBulletFr: null,
  };
}
