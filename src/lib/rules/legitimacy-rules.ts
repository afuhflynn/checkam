// Legitimacy signals: positive evidence that lowers risk instead of only
// counting red flags. Rules still decide; these facts only reduce the score
// and add specific bullets. Never overrides HIGH_RISK triggers.

export interface LegitSignal {
  key: string;
  en: string;
  fr: string;
}

const FREE_PROVIDERS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.fr",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "yandex.com",
]);

const URGENCY_PATTERN =
  /\b(urgent|urgently|hurry|hurries|within (24|48) hours|dans les (24|48) heures|act now|agissez vite|last chance|dernière chance|express|immédiat|immediately)\b/i;

const PAYMENT_HINT =
  /(momo|mobile money|orange money|mtn|virement|transfert|bank transfer|afc|fcfa|xaf|pickup|western union|moneygram|payment|paiement|frais|bitcoin|crypto|usdt)/i;

export function evaluateLegitimacy(
  text: string,
  emails: { original: string; domain: string }[],
): LegitSignal[] {
  const signals: LegitSignal[] = [];
  const lower = text.toLowerCase();

  const established = emails.filter((e) => e.domain && !FREE_PROVIDERS.has(e.domain.toLowerCase()));
  if (established.length > 0) {
    const domains = [...new Set(established.map((e) => e.domain.toLowerCase()))];
    const mentioned = domains.filter((d) => {
      const root = d.split(".").slice(-2, -1)[0] || d;
      return lower.includes(root);
    });
    if (mentioned.length > 0) {
      signals.push({
        key: "domain-match",
        en: `The message came from ${mentioned.join(", ")}, the same domain it names.`,
        fr: `Le message est arrivé de ${mentioned.join(", ")}, le même domaine qu'il cite.`,
      });
    } else {
      signals.push({
        key: "established-domain",
        en: `It was sent from ${domains.join(", ")} rather than a free mailbox like Gmail.`,
        fr: `Il a été envoyé depuis ${domains.join(", ")} plutôt que depuis une boîte gratuite comme Gmail.`,
      });
    }
  }

  if (!PAYMENT_HINT.test(text)) {
    signals.push({
      key: "no-payment",
      en: "The message does not ask you for money or bank details.",
      fr: "Le message ne vous demande ni argent ni coordonnées bancaires.",
    });
  }

  if (!URGENCY_PATTERN.test(text)) {
    signals.push({
      key: "no-urgency",
      en: "There is no deadline or pressure pushing you to decide quickly.",
      fr: "Aucun délai ni aucune pression pour décider vite.",
    });
  }

  return signals;
}
