import { describe, expect, it } from "vitest";
import { detectMessageLanguage, detectMessageLanguageWithSignal } from "../lib/i18n/detect";
import { matchFixPhrase, parseAskAnswer, resolveReplyLanguage } from "../lib/i18n/preference";

describe("spec 0018: greeting detection carries signal", () => {
  it("covers: AC-11 reads hi as English with signal instead of silent French", () => {
    expect(detectMessageLanguage("hi")).toBe("en");
    expect(detectMessageLanguageWithSignal("hi")).toEqual({
      language: "en",
      hasSignal: true,
    });
  });

  it("covers: AC-11 reads bonjour as French with signal", () => {
    expect(detectMessageLanguageWithSignal("bonjour")).toEqual({
      language: "fr",
      hasSignal: true,
    });
  });

  it("covers: AC-5 marks emoji only input as signal free", () => {
    expect(detectMessageLanguageWithSignal("🙏🙏")).toEqual({
      language: "fr",
      hasSignal: false,
    });
  });
});

describe("spec 0018: fix phrases match accent blind with longest win", () => {
  it("covers: AC-4 matches a French phrase without accents", () => {
    expect(matchFixPhrase("Reponds en francais stp")).toBe("fr");
  });

  it("covers: AC-4 matches an English phrase", () => {
    expect(matchFixPhrase("Please reply in English")).toBe("en");
  });

  it("covers: AC-4 matches case blind", () => {
    expect(matchFixPhrase("ENGLISH ONLY PLEASE")).toBe("en");
  });

  it("covers: AC-4 longest match wins over a shorter one", () => {
    expect(matchFixPhrase("answer in english, english only from now")).toBe("en");
  });

  it("covers: AC-4 returns null when nothing matches", () => {
    expect(matchFixPhrase("is this a scam")).toBeNull();
  });

  it("covers: AC-4 returns null for empty input", () => {
    expect(matchFixPhrase("")).toBeNull();
    expect(matchFixPhrase(null)).toBeNull();
  });
});

describe("spec 0018: resolution order", () => {
  it("covers: AC-2 fixed choice beats fresh detection", () => {
    expect(
      resolveReplyLanguage({
        fixed: "en",
        text: "ceci est une arnaque",
        shortTurn: false,
        storedHeuristic: null,
        askSent: false,
        detected: { language: "fr", hasSignal: true },
      }),
    ).toEqual({ language: "en", shouldAsk: false, fixedByPhrase: null });
  });

  it("covers: AC-1 asks once when nothing is known and the ask never went out", () => {
    expect(
      resolveReplyLanguage({
        fixed: null,
        text: "🙏",
        shortTurn: true,
        storedHeuristic: null,
        askSent: false,
        detected: { language: "fr", hasSignal: false },
      }).shouldAsk,
    ).toBe(true);
  });

  it("covers: AC-5 falls back silently once the ask already went out", () => {
    expect(
      resolveReplyLanguage({
        fixed: null,
        text: "🙏",
        shortTurn: true,
        storedHeuristic: null,
        askSent: true,
        detected: { language: "fr", hasSignal: false },
      }),
    ).toEqual({ language: "en", shouldAsk: false, fixedByPhrase: null });
  });

  it("covers: AC-5 prefers the stored heuristic over bare English in the fallback", () => {
    expect(
      resolveReplyLanguage({
        fixed: null,
        text: "🙏",
        shortTurn: true,
        storedHeuristic: "fr",
        askSent: true,
        detected: { language: "fr", hasSignal: false },
      }).language,
    ).toBe("fr");
  });

  it("covers: AC-4 sets fixed from a phrase on short turns", () => {
    expect(
      resolveReplyLanguage({
        fixed: null,
        text: "please reply in english",
        shortTurn: true,
        storedHeuristic: null,
        askSent: false,
        detected: { language: "en", hasSignal: true },
      }),
    ).toEqual({ language: "en", shouldAsk: false, fixedByPhrase: "en" });
  });

  it("covers: AC-4 ignores phrases on turns carrying claim markers", () => {
    expect(
      resolveReplyLanguage({
        fixed: null,
        text: "send english money to 699123456",
        shortTurn: false,
        storedHeuristic: null,
        askSent: false,
        detected: { language: "en", hasSignal: true },
      }).fixedByPhrase,
    ).toBeNull();
  });
});

describe("spec 0018: ask answers", () => {
  it("covers: AC-1 reads EN as English and FR as French", () => {
    expect(parseAskAnswer("EN")).toBe("en");
    expect(parseAskAnswer("FR")).toBe("fr");
  });

  it("covers: AC-1 reads accented answers", () => {
    expect(parseAskAnswer("français")).toBe("fr");
    expect(parseAskAnswer("anglais")).toBe("en");
  });

  it("covers: AC-1 leaves mixed or empty answers unset", () => {
    expect(parseAskAnswer("EN and FR both fine")).toBeNull();
    expect(parseAskAnswer("ok thanks")).toBeNull();
  });
});
