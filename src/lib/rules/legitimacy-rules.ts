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

  const established = emails.filter(
    (e) => e.domain && !FREE_PROVIDERS.has(e.domain.toLowerCase()),
  );
  if (established.length > 0) {
    const domains = [...new Set(established.map((e) => e.domain.toLowerCase()))];
    const mentioned = domains.filter((d) => {
      const root = d.split(".").slice(-2, -1)[0] || d;
      return lower.includes(root);
    });
    if (mentioned.length > 0) {
      signals.push({
        key: "domain-match",
        en: `Sender domain matches the organization named in the message (${mentioned.join(", ")}).`,
        fr: `Le domaine expéditeur correspond à l'organisation citée dans le message (${mentioned.join(", ")}).`,
      });
    } else {
      signals.push({
        key: "established-domain",
        en: `Sent from an established domain (${domains.join(", ")}), not a free mailbox.`,
        fr: `Envoyé depuis un domaine établi (${domains.join(", ")}), pas une boîte gratuite.`,
      });
    }
  }

  if (!PAYMENT_HINT.test(text)) {
    signals.push({
      key: "no-payment",
      en: "No payment request found: no amount, no MoMo number, no transfer instruction.",
      fr: "Aucune demande de paiement : ni montant, ni numéro MoMo, ni instruction de transfert.",
    });
  }

  if (!URGENCY_PATTERN.test(text)) {
    signals.push({
      key: "no-urgency",
      en: "No urgency pressure found: no deadline threat pushing a fast decision.",
      fr: "Aucune pression d'urgence : aucune menace de délai qui force une décision rapide.",
    });
  }

  return signals;
}
