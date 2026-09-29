import { describe, expect, it } from "vitest";
import { runRulesEngine } from "../lib/rules/engine";
import { normalizeCameroonPhone } from "../lib/rules/phone-normalizer";

describe("CheckAm Rules Engine", () => {
  it("flags fake MINESEC 325 teachers recruitment flyer as HIGH_RISK", () => {
    const fakeMinesecText = `
      AVIS DE RECRUTEMENT SPÉCIAL DES 325 INSTITUTEURS AU MINESEC 2025.
      Les candidats retenus doivent envoyer les frais de dossier de 25 000 FCFA par Orange Money au 699 12 34 56.
      Contact du secrétariat: minesec.recrutement2025@gmail.com
    `;

    const result = runRulesEngine({
      text: fakeMinesecText,
      claimedEntity: "MINESEC",
      phoneNumbers: ["699123456"],
      emails: ["minesec.recrutement2025@gmail.com"],
      amount: "25000 FCFA",
    });

    expect(result.verdict).toBe("HIGH_RISK");
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.category).toBe("CIVIL_SERVICE");
    expect(result.evidenceBullets.en.length).toBe(3);
    expect(result.evidenceBullets.fr.length).toBe(3);
    // Should flag free gmail address
    expect(result.evidenceBullets.fr.some((b) => b.includes("email gratuite non officielle"))).toBe(
      true,
    );
    // Should contain WhatsApp alert template
    expect(result.whatsappWarning.fr).toContain("Alerte arnaque");
    expect(result.whatsappWarning.en).toContain("Scam alert");
    expect(result.anticHotline).toBe("8202");
  });

  it("flags 75,000 FCFA Orange Money reversal SMS scam as HIGH_RISK", () => {
    const reversalSmsText = `
      Transfert réussi. Vous avez reçu 75 000 FCFA de NKODO PIERRE (698001122).
      Pardon mon frère, c'est une erreur de transfert, veuillez renvoyer les 75000 FCFA sur ce numéro s'il vous plaît.
    `;

    const result = runRulesEngine({
      text: reversalSmsText,
      phoneNumbers: ["698001122"],
    });

    expect(result.verdict).toBe("HIGH_RISK");
    expect(result.category).toBe("MOBILE_MONEY");
    expect(result.evidenceBullets.en.some((b) => b.includes("reversal fraud"))).toBe(true);
  });

  it("flags Express Canada Visa 14 days scam as HIGH_RISK", () => {
    const canadaVisaText = `
      OFFRE D'EMPLOI ET VISA CANADA EXPRESS EN 14 JOURS GARANTI.
      L'Ambassade du Canada au Cameroun recrute 50 chauffeurs et infirmiers. Billet d'avion offert et logement gratuit.
      Envoyez vos frais de timbre express de 150 000 FCFA par MTN MoMo au 677 44 55 66.
    `;

    const result = runRulesEngine({
      text: canadaVisaText,
      phoneNumbers: ["677445566"],
    });

    expect(result.verdict).toBe("HIGH_RISK");
    expect(result.category).toBe("VISA_TRAVEL");
    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  it("marks a communiqué from a government sender address as VERIFIED_OFFICIAL", () => {
    const officialText = `
      COMMUNIQUÉ DU MINFOPRA: Ouverture du concours d'entrée à l'ENAM session 2025.
      Dépôt des dossiers et quittance du Trésor Public sur le portail officiel.
    `;

    const result = runRulesEngine({
      text: officialText,
      claimedEntity: "MINFOPRA",
      emails: ["concours@minfopra.gov.cm"],
    });

    expect(result.verdict).toBe("VERIFIED_OFFICIAL");
    expect(result.score).toBeLessThanOrEqual(15);
    expect(result.officialEntity?.acronym).toBe("MINFOPRA");
  });
});

// The old official path accepted any .cm domain and accepted a bare mention of
// a ministry URL, so a scammer could certify himself. These pin the refusals.
describe("Official verdict cannot be self granted", () => {
  it("refuses a mention of a ministry URL with no sender evidence", () => {
    const result = runRulesEngine({
      text: "Bonjour, voici mon CV. Verifiez mon dossier sur www.minfopra.gov.cm et repondez moi sur WhatsApp.",
      claimedEntity: "MINFOPRA",
    });
    expect(result.verdict).not.toBe("VERIFIED_OFFICIAL");
  });

  it("refuses a scammer who quotes the real ministry link", () => {
    const result = runRulesEngine({
      text: "Salut, inscription confirmee. Portail officiel: https://www.minfopra.gov.cm . Contactez la facade sur mon numero 690112233.",
      claimedEntity: "MINFOPRA",
    });
    expect(result.verdict).not.toBe("VERIFIED_OFFICIAL");
  });

  it("refuses an attacker registered .cm lookalike", () => {
    const result = runRulesEngine({
      text: "Bonjour, votre dossier est accepte. Envoyez vos pieces a contact@recrutement-minesec.cm pour confirmation.",
      emails: ["contact@recrutement-minesec.cm"],
    });
    expect(result.verdict).not.toBe("VERIFIED_OFFICIAL");
    expect(result.evidenceBullets.en.some((b) => b.includes("recrutement-minesec.cm"))).toBe(true);
  });

  it("does not treat a plain .cm sender as a government sender", () => {
    const result = runRulesEngine({
      text: "E-mail officiel: contact@minesec.cm. Merci de confirmer.",
      emails: ["contact@minesec.cm"],
    });
    expect(result.verdict).not.toBe("VERIFIED_OFFICIAL");
  });
});

describe("Topic coverage beyond jobs", () => {
  it("flags a scholarship that demands a release fee", () => {
    const result = runRulesEngine({
      text: "Félicitations, vous êtes sélectionné pour une bourse. Frais de traitement de la bourse : payez 120 000 FCFA pour libérer les fonds avant le 15 mars.",
      emails: ["awards@university-intl.com"],
    });

    expect(result.category).toBe("EDUCATION");
    expect(result.verdict).toBe("HIGH_RISK");
  });

  it("flags being recruited to receive and forward other people's money", () => {
    const result = runRulesEngine({
      text: "Recois l'argent sur mon compte, garde 10 pour cent et transfere le reste au tiers. Commission de 5% par transfert.",
      phoneNumbers: ["691234567"],
    });

    expect(result.category).toBe("MONEY_LAUNDERING");
    expect(result.verdict).toBe("HIGH_RISK");
  });

  it("treats an impersonation claim as a caution on its own, not a slam dunk", () => {
    const result = runRulesEngine({
      text: "Bonjour, je suis le ministre. Merci de me rappeler.",
    });

    expect(result.category).toBe("IMPERSONATION");
    // Impersonation language alone must not cross the decisive 45 point bound,
    // or every ministry mention would be a HIGH_RISK.
    expect(result.verdict).toBe("CAUTION");
  });

  it("flags a prize with a delivery fee", () => {
    const result = runRulesEngine({
      text: "Felicitations! Vous avez gagne la loterie. Payez les frais de livraison du lot.",
    });

    expect(result.category).toBe("PRIZE");
  });
});

describe("Evidence separated from generic advice", () => {
  it("does not pad the finding list with advisories", () => {
    const result = runRulesEngine({
      text: "Bonjour, pouvez-vous me rappeler demain ?",
    });

    // Nothing concrete was found, so the honest answer is an empty list plus a
    // next step, not three invented findings.
    expect(result.evidenceBullets.en).toHaveLength(0);
    expect(result.safetyNote.en).toContain("too short to judge");
  });

  it("keeps the tone index aligned with the finding lists", () => {
    const result = runRulesEngine({
      text: "AVIS DE RECRUTEMENT SPECIAL DES 325 INSTITUTEURS AU MINESEC 2025. Frais de dossier de 25 000 FCFA par Orange Money au 699 12 34 56.",
      claimedEntity: "MINESEC",
      emails: ["minesec.recrutement2025@gmail.com"],
    });

    expect(result.evidenceTones).toHaveLength(result.evidenceBullets.en.length);
    expect(result.evidenceTones.every((tone) => tone === "warning")).toBe(true);
  });

  it("marks facts that eased the score as reassuring", () => {
    const result = runRulesEngine({
      text: "Dear Flynn, Thank you for requesting your copy of the Anzisha Application Guide. Contact hello@anzisha.org if you have questions.",
      emails: ["hello@anzisha.org"],
    });

    expect(result.evidenceTones).toContain("reassuring");
  });

  it("gives a HIGH_RISK check a stop-and-report note", () => {
    const result = runRulesEngine({
      text: "Transfert réussi. Vous avez reçu 75 000 FCFA de NKODO PIERRE (698001122). Pardon mon frère, c'est une erreur de transfert, veuillez renvoyer les 75000 FCFA sur ce numéro s'il vous plaît.",
      phoneNumbers: ["698001122"],
    });

    expect(result.verdict).toBe("HIGH_RISK");
    expect(result.safetyNote.en).toContain("8202");
    expect(result.safetyNote.fr).toContain("8202");
  });
});

describe("Forwardable notices", () => {
  const result = runRulesEngine({
    text: "AVIS DE RECRUTEMENT DES 325 INSTITUTEURS MINESEC. Frais de dossier 25 000 FCFA par Orange Money au 699 12 34 56.",
    claimedEntity: "MINESEC",
    emails: ["recrutement@gmail.com"],
    phoneNumbers: ["699123456"],
    amount: "25000 FCFA",
  });

  it("marks the WhatsApp rendering and leaves the plain one bare", () => {
    expect(result.whatsappWarning.en).toContain("*");
    expect(result.whatsappWarningPlain.en).not.toContain("*");
  });

  it("carries the verdict header and the next step in both renderings", () => {
    for (const text of [result.whatsappWarning.en, result.whatsappWarningPlain.en]) {
      expect(text).toContain("Scam alert - CheckAm Cameroon");
      expect(text).toContain("8202");
      expect(text).toContain("699123456");
    }
  });

  it("uses no emojis in the share message", () => {
    expect(result.whatsappWarning.en).not.toMatch(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u);
    expect(result.whatsappWarning.fr).not.toMatch(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u);
  });

  it("skips the bullet section when there are no evidence bullets", () => {
    const thin = runRulesEngine({ text: "Bonjour, merci." });
    expect(thin.whatsappWarningPlain.en).not.toContain("\n- ");
    expect(thin.whatsappWarningPlain.en).toContain("This message was analyzed on checkam.cm:");
  });

  it("shows all phone numbers comma separated", () => {
    const multiPhone = runRulesEngine({
      text: "Scam message",
      phoneNumbers: ["699123456", "677987654", "655111222"],
    });
    expect(multiPhone.whatsappWarning.en).toContain("699123456");
    expect(multiPhone.whatsappWarning.en).toContain("677987654");
    expect(multiPhone.whatsappWarning.en).toContain("655111222");
  });

  it("shows only the first email when no phone number is found", () => {
    const multiEmail = runRulesEngine({
      text: "Scam message",
      emails: ["first@scam.com", "second@scam.com"],
    });
    expect(multiEmail.whatsappWarning.en).toContain("first@scam.com");
    expect(multiEmail.whatsappWarning.en).not.toContain("second@scam.com");
  });

  it("includes the entity line when an official entity is identified", () => {
    expect(result.whatsappWarning.en).toContain("MINESEC");
  });

  it("includes the amount line when an amount is found", () => {
    expect(result.whatsappWarning.en).toContain("25000 FCFA");
  });

  it("includes the payment method line when found in evidence", () => {
    expect(result.whatsappWarning.en).toContain("Mobile Money");
  });

  it("replaces em dashes with hyphens", () => {
    const emDashResult = runRulesEngine({
      text: "This is a test — with an em dash",
    });
    expect(emDashResult.whatsappWarning.en).not.toContain("—");
    expect(emDashResult.whatsappWarning.en).not.toContain("–");
  });

  it("includes the forward prompt only on HIGH_RISK", () => {
    expect(result.whatsappWarning.en).toContain("Forward this to your family");
    const cautionResult = runRulesEngine({
      text: "Bonjour, je suis le ministre. Merci de me rappeler.",
    });
    expect(cautionResult.whatsappWarning.en).not.toContain("Forward this to your family");
  });

  it("includes the ANTIC hotline only on HIGH_RISK", () => {
    expect(result.whatsappWarning.en).toContain("Report it free on the ANTIC hotline, 8202.");
    const cautionResult = runRulesEngine({
      text: "Bonjour, je suis le ministre. Merci de me rappeler.",
    });
    expect(cautionResult.whatsappWarning.en).not.toContain("Report it free on the ANTIC hotline, 8202.");
  });

  it("uses a lighter safety note for VERIFIED_OFFICIAL", () => {
    const officialResult = runRulesEngine({
      text: "COMMUNIQUÉ DU MINFOPRA: Ouverture du concours d'entrée à l'ENAM session 2025.",
      claimedEntity: "MINFOPRA",
      emails: ["concours@minfopra.gov.cm"],
    });
    expect(officialResult.whatsappWarningPlain.en).toContain("Official communication - CheckAm");
    expect(officialResult.whatsappWarningPlain.en).not.toContain("Report it free on the ANTIC hotline");
    expect(officialResult.whatsappWarningPlain.en).not.toContain("Forward this to your family");
  });
});

// The literal trigger list cannot cover every phrasing. These tests pin the
// structural layer, which recognises the shape of a scheme: a rewrite of the
// same scam must still be caught, and ordinary messages must not be.
describe("Structural scam detection", () => {
  const caught = [
    {
      name: "mule offer, reworded away from the literal triggers",
      text: "Bonjour, on me propose de recevoir des transferts sur mon compte Mobile Money et de garder 10 pour cent. Est-ce legitime ?",
      category: "MONEY_LAUNDERING",
      verdict: "HIGH_RISK",
    },
    {
      name: "mule offer in English",
      text: "We would like you to receive client payments on your personal account and forward the rest to us. You keep 5 percent per transfer.",
      category: "MONEY_LAUNDERING",
      verdict: "HIGH_RISK",
    },
    {
      name: "fee demanded before a release, with no topic word to name it",
      text: "Votre dossier est retenu. Envoyez les frais de dossier pour obtenir la liberation de vos fonds.",
      category: "OTHER",
      verdict: "HIGH_RISK",
    },
    {
      name: "someone speaking for the national cyber agency",
      text: "Je vous appelle au nom de l'ANTIC. Merci de confirmer votre identité.",
      category: "IMPERSONATION",
      verdict: "CAUTION",
    },
    {
      name: "asking for a one time code",
      text: "Bonjour, pour valider votre dossier, envoyez moi le code OTP que vous venez de recevoir.",
      category: "MOBILE_MONEY",
      verdict: "HIGH_RISK",
    },
  ];

  for (const { name, text, category, verdict } of caught) {
    it(`catches ${name}`, () => {
      const result = runRulesEngine({ text });
      expect(result.category).toBe(category);
      expect(result.verdict).toBe(verdict);
    });
  }

  // A structural layer is only worth having if it stays quiet on ordinary
  // traffic. Every message here once passed as a low-stakes CAUTION.
  const innocent = [
    "Merci pour votre message, je vous réponds demain matin.",
    "Dear Flynn, here is the Anzisha Application Guide you asked for. Contact hello@anzisha.org with questions.",
    "Votre demande de bourse a été enregistrée. Vous recevrez une réponse par e-mail officiel.",
    "Bonjour, pouvez-vous me rappeler demain vers 15h ?",
    "I would like to apply for the position. Please send me the application form.",
  ];

  for (const text of innocent) {
    it(`does not invent a scheme: ${text.slice(0, 44)}`, () => {
      const result = runRulesEngine({ text });
      expect(result.verdict).not.toBe("HIGH_RISK");
    });
  }

  it("does not let a money mule read as reassuring", () => {
    const result = runRulesEngine({
      text: "Un ami me propose de recevoir de l'argent sur mon compte et d'en garder 10 pour cent avant de transferer le reste.",
    });
    // Legitimacy relief must not soften a real scheme into a low score.
    expect(result.score).toBeGreaterThanOrEqual(45);
  });

  it("lets the topical layer name the category when both layers fire", () => {
    // The structural layer sees the shape, the keyword layer knows the topic.
    const result = runRulesEngine({
      text: "Bourse d'études garantie. Frais de traitement de la bourse : envoyez 120 000 FCFA pour obtenir la liberation des fonds.",
    });
    expect(result.category).toBe("EDUCATION");
    expect(result.verdict).toBe("HIGH_RISK");
  });
  it("does not let a real ministry address carry a Mobile Money demand", () => {
    const result = runRulesEngine({
      text: "COMMUNIQUE MINFOPRA. Payez 25000 FCFA par Orange Money au 699123456 pour votre dossier.",
      claimedEntity: "MINFOPRA",
      emails: ["concours@minfopra.gov.cm"],
    });
    // A genuine sender address is the only thing that opens the official path,
    // so a payment demand on top of it must close it again. No institution
    // collects a dossier fee by Mobile Money to a person.
    expect(result.verdict).not.toBe("VERIFIED_OFFICIAL");
    expect(
      result.evidenceBullets.en.some(
        (b) => b.includes("Mobile Money") && b.includes("personal number"),
      ),
    ).toBe(true);
  });
});

// Blackmail, sextortion and phishing are not scams, and the reader needs
// different advice. Telling someone being extorted to "confirm before you act"
// is useless; the one thing they must hear is that paying does not stop it.
describe("Coercive threats", () => {
  const threats: [string, string, string][] = [
    [
      "sextortion, demand for an intimate image",
      "Bonjour, envoie moi une photo nue et je garde ca secret. Si tu refuses je publie tout.",
      "SEXTORTION",
    ],
    [
      "sextortion, threat to publish existing photos",
      "I have your private photos. Pay 50000 FCFA within 48 hours or I will publish them to everyone.",
      "EXTORTION",
    ],
    [
      "blackmail with a deadline",
      "Si tu n envoies pas 200000 fcfa, je publie toutes tes photos a tout le monde sous 24h.",
      "EXTORTION",
    ],
    [
      "blackmail with a threatened report",
      "Menace : tu ne paies pas, je te denonce a la police sous 48h.",
      "EXTORTION",
    ],
    [
      "phishing page harvesting credentials",
      "Votre carte sera bloquee. Cliquez ici https://banque-secure.cm et saisissez vos identifiants.",
      "PHISHING",
    ],
  ];

  for (const [name, text, category] of threats) {
    it(`detects ${name}`, () => {
      const result = runRulesEngine({ text });
      expect(result.category).toBe(category);
      expect(result.verdict).toBe("HIGH_RISK");
    });
  }

  it("says paying does not stop it, and to keep the evidence", () => {
    const result = runRulesEngine({
      text: "I have your private photos. Pay 50000 FCFA within 48 hours or I will publish them.",
    });
    expect(result.safetyNote.en).toContain("rarely stops them");
    expect(result.safetyNote.en).toContain("screenshot");
    expect(result.safetyNote.en).toContain("8202");
  });

  it("routes a minor to an adult and child protection", () => {
    const result = runRulesEngine({
      text: "Bonjour, envoie moi une photo nue et je garde ca secret. Sinon je publie tout.",
    });
    expect(result.safetyNote.en).toContain("under 18");
    expect(result.safetyNote.en).toContain("child protection");
    expect(result.safetyNote.fr).toContain("moins de 18 ans");
  });

  it("tells a phishing target not to use the link", () => {
    const result = runRulesEngine({
      text: "Votre carte sera bloquee. Cliquez ici https://banque-secure.cm et saisissez vos identifiants.",
    });
    expect(result.safetyNote.en).toContain("Do not click the link");
    expect(result.safetyNote.fr).toContain("Ne cliquez pas sur le lien");
  });

  it("does not cry threat on ordinary messages", () => {
    for (const text of [
      "Merci pour votre message, a bientot.",
      "Je vous propose un emploi, envoyez votre CV a jobs@entreprise.cm.",
      "Votre dossier a bien ete recu, nous vous repondrons sous 72h.",
      "Transfert recu, merci.",
    ]) {
      expect(runRulesEngine({ text }).category).not.toMatch(/EXTORTION|SEXTORTION|PHISHING/);
    }
  });
});

describe("Cameroon Phone Normalizer", () => {
  it("normalizes standard MTN 9-digit format", () => {
    const res = normalizeCameroonPhone("+237 677 12 34 56");
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe("+237677123456");
    expect(res.operator).toBe("MTN");
  });

  it("normalizes Orange 9-digit format with spaces", () => {
    const res = normalizeCameroonPhone("699-00-11-22");
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe("+237699001122");
    expect(res.operator).toBe("ORANGE");
  });

  it("normalizes Camtel numbers", () => {
    const res = normalizeCameroonPhone("237 222 10 20 30");
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe("+237222102030");
    expect(res.operator).toBe("CAMTEL");
  });
});

describe("Legitimacy relief", () => {
  const anzishaText =
    "Dear Flynn, Thank you for requesting your copy of the Anzisha Application Guide. Download the Application Guide in English. If you have any further questions about Anzisha, please email hello@anzisha.org and a member of the Anzisha Team will get back to you as soon as possible. The Anzisha Team";

  it("scores a legit mail with matching domain well below generic caution", () => {
    const result = runRulesEngine({
      text: anzishaText,
      emails: ["hello@anzisha.org"],
    });

    expect(result.verdict).toBe("CAUTION");
    expect(result.score).toBeLessThan(45);
    expect(result.evidenceBullets.en.some((b) => b.includes("anzisha.org"))).toBe(true);
  });

  it("keeps red flags above legit softeners", () => {
    const result = runRulesEngine({
      text: anzishaText,
      emails: ["hello@anzisha.org"],
      phoneNumbers: ["699123456"],
      isKnownFlaggedInDb: true,
    });

    expect(result.verdict).toBe("HIGH_RISK");
    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  it("passes researched sources through with unsafe urls stripped", () => {
    const result = runRulesEngine({
      text: anzishaText,
      emails: ["hello@anzisha.org"],
      webCorroboration: {
        foundOfficialSource: true,
        sources: [
          { title: "Anzisha", url: "https://anzisha.org" },
          { title: "Evil", url: "javascript:alert(1)" },
          { title: "Anzisha", url: "https://anzisha.org" },
        ],
      },
    });

    expect(result.sources).toEqual([{ title: "Anzisha", url: "https://anzisha.org" }]);
    expect(
      result.evidenceBullets.en.some((b) => b.toLowerCase().includes("found this on the web")),
    ).toBe(true);
  });
});
