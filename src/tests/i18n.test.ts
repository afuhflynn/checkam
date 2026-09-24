import { describe, expect, it } from "vitest";
import { detectMessageLanguage } from "../lib/i18n/detect";

describe("WhatsApp language detection", () => {
  it("detects French via diacritics", () => {
    expect(
      detectMessageLanguage("Avis de recrutement des 325 instituteurs. Envoyez 25 000 FCFA."),
    ).toBe("fr");
  });

  it("detects French via stopwords without accents", () => {
    expect(
      detectMessageLanguage("Pardon mon frere, veuillez renvoyer les fonds sur ce numero."),
    ).toBe("fr");
  });

  it("detects English messages", () => {
    expect(
      detectMessageLanguage(
        "Hello, you have received money in your account. Please send it back urgently.",
      ),
    ).toBe("en");
  });

  it("defaults to French when there is no signal", () => {
    expect(detectMessageLanguage("699 12 34 56")).toBe("fr");
    expect(detectMessageLanguage("")).toBe("fr");
    expect(detectMessageLanguage(undefined)).toBe("fr");
  });
});
