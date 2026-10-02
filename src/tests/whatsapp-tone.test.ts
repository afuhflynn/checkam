import { describe, expect, it } from "vitest";
import {
  renderWhatsAppEmptyAsk,
  renderWhatsAppFollowUp,
  runRulesEngine,
} from "../lib/rules/engine";
import { isNewClaimText } from "../lib/whatsapp/tone";

const EMOJI = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

const SCAM_TEXT = `
  AVIS DE RECRUTEMENT SPÉCIAL DES 325 INSTITUTEURS AU MINESEC 2025.
  Les candidats retenus doivent envoyer les frais de dossier de 25 000 FCFA par Orange Money au 699 12 34 56.
`;

function scam() {
  return runRulesEngine({
    text: SCAM_TEXT,
    claimedEntity: "MINESEC",
    phoneNumbers: ["699123456"],
    emails: [],
    amount: "25000 FCFA",
  });
}

describe("spec 0017 AC-1: full reply carries a warm opener and closer", () => {
  it("opens warm, keeps the titled header, and closes before the action block", () => {
    const full = scam();
    for (const body of [full.whatsappReply.en, full.whatsappReply.fr]) {
      const blocks = body.split("\n\n");
      expect(blocks[1]).toMatch(/Scam alert|Alerte arnaque/);
      expect(blocks[blocks.length - 1]).toMatch(/8202/);
      expect(body).not.toMatch(EMOJI);
      expect(body).not.toMatch(/[─━―]/);
      expect(body.length).toBeLessThanOrEqual(1600);
    }
    expect(full.whatsappReply.en).toContain("Thanks for checking");
    expect(full.whatsappReply.en).toContain("anything else you want checked");
    expect(full.whatsappReply.fr).toContain("Merci pour votre message");
  });
});

describe("spec 0017 AC-2, AC-4, AC-5: short follow up shape", () => {
  it("drops the title and evidence for a high risk reminder but keeps the action lines", () => {
    for (const language of ["en", "fr"] as const) {
      const short = renderWhatsAppFollowUp({ language, verdict: "HIGH_RISK" });
      expect(short).not.toMatch(/Scam alert|Alerte arnaque/);
      expect(short).not.toMatch(/• /);
      expect(short).toMatch(/Thanks for letting me know|Merci de me l/);
      expect(short).toMatch(/8202/);
      expect(short).toMatch(/Forward this|Faites suivre/);
      expect(short).not.toMatch(EMOJI);
    }
  });

  it("keeps caution and official shorts under about 400 characters with no hotline", () => {
    for (const verdict of ["CAUTION", "VERIFIED_OFFICIAL"] as const) {
      for (const language of ["en", "fr"] as const) {
        const short = renderWhatsAppFollowUp({ language, verdict });
        expect(short.length).toBeLessThanOrEqual(400);
        expect(short).not.toContain("8202");
        expect(short).not.toMatch(/Scam alert|Alerte arnaque/);
      }
    }
  });

  it("builds the high risk short from the same generic safety note as the full", () => {
    expect(renderWhatsAppFollowUp({ language: "en", verdict: "HIGH_RISK" })).toContain(
      "Do not send money, documents, or any code",
    );
    expect(renderWhatsAppFollowUp({ language: "fr", verdict: "HIGH_RISK" })).toContain(
      "N'envoyez ni argent, ni documents",
    );
  });
});

describe("spec 0017 AC-9: opener and closer survive the ceiling", () => {
  it("keeps the opener first and the closer with the action block when over the ceiling", () => {
    const overCeiling = runRulesEngine({
      text: "Envoyez une photo intime nude sinon je vais publier à tout le monde vos photos. Ils menacent de diffuser dans 24h si vous ne payez pas 500 000 FCFA par Orange Money au 691 234 567. Ils ont le mot de passe et le code OTP de mon compte.",
      claimedEntity: "MINESEC",
      phoneNumbers: ["691234567", "677987654", "655111222", "690112233"],
      emails: ["recrutement2025@gmail.com"],
      amount: "500 000 FCFA",
    });
    expect(overCeiling.verdict).toBe("HIGH_RISK");
    const body = overCeiling.whatsappReply.fr;
    expect(body.length).toBeLessThanOrEqual(1600);
    const blocks = body.split("\n\n");
    expect(blocks[0]).toBe("Merci pour votre message, je l'ai examiné pour vous.");
    expect(body).toContain("Je peux vérifier un autre message si vous voulez.");
    expect(body.trimEnd().endsWith("vos proches.")).toBe(true);
  });
});

describe("spec 0017 AC-8: empty ask carries no verdict", () => {  it("asks for text or a picture in both languages without judging", () => {
    for (const language of ["en", "fr"] as const) {
      const ask = renderWhatsAppEmptyAsk(language);
      expect(ask).not.toMatch(/Scam alert|Alerte arnaque|Caution|Attention/);
      expect(ask.length).toBeLessThan(400);
    }
    expect(renderWhatsAppEmptyAsk("en")).toContain("clear picture");
    expect(renderWhatsAppEmptyAsk("fr")).toContain("photo claire");
  });
});

describe("spec 0017 AC-3: new claim signal", () => {
  it("treats phones, amounts, links, emails, media text and long text as new claims", () => {
    expect(isNewClaimText("Appelle le 699 12 34 56 vite")).toBe(true);
    expect(isNewClaimText("Envoyez 25 000 FCFA par momo")).toBe(true);
    expect(isNewClaimText("Voir https://example.com/offre pour gagner")).toBe(true);
    expect(isNewClaimText("Écris à contact@example.com pour le dossier")).toBe(true);
    expect(isNewClaimText("ok", { hasMediaText: true })).toBe(true);
    expect(isNewClaimText("x".repeat(141))).toBe(true);
  });

  it("treats short thanks and empty text as reactions, failing to full nowhere", () => {
    expect(isNewClaimText("Merci beaucoup")).toBe(false);
    expect(isNewClaimText("Thanks!")).toBe(false);
    expect(isNewClaimText("ok")).toBe(false);
    expect(isNewClaimText("")).toBe(false);
    expect(isNewClaimText(undefined)).toBe(false);
  });

  it("splits exactly at the length boundary, 140 is a reaction and 141 is a claim", () => {
    expect(isNewClaimText("x".repeat(140))).toBe(false);
    expect(isNewClaimText("x".repeat(141))).toBe(true);
  });
});
