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
    expect(result.whatsappWarning.fr).toContain("ALERTE ARNAQUE");
    expect(result.whatsappWarning.en).toContain("SCAM ALERT");
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

  it("marks genuine MINFOPRA communiqué on official domain as VERIFIED_OFFICIAL", () => {
    const officialText = `
      COMMUNIQUÉ DU MINFOPRA: Ouverture du concours d'entrée à l'ENAM session 2025.
      Dépôt des dossiers et quittance du Trésor Public sur le portail officiel: http://www.minfopra.gov.cm.
    `;

    const result = runRulesEngine({
      text: officialText,
      claimedEntity: "MINFOPRA",
    });

    expect(result.verdict).toBe("VERIFIED_OFFICIAL");
    expect(result.score).toBeLessThanOrEqual(15);
    expect(result.officialEntity?.acronym).toBe("MINFOPRA");
    expect(result.officialWebsite).toBe("http://www.minfopra.gov.cm");
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
