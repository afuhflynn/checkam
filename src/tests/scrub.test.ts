import { describe, expect, it } from "vitest";
import { scrubVerdictWords } from "../lib/agent/runner";

// The scrubber used to drop an entire answer on any occurrence of "official",
// "verified" or "safe". Since the subject matter is ministries, embassies and
// scholarships, that threw away almost every grounded answer and shipped the
// boilerplate fallback instead. These tests pin both halves of the contract:
// real verdict claims are rejected, descriptive language survives.

describe("Verdict scrubber rejects pronouncements", () => {
  const rejected = [
    "This is a scam, do not pay.",
    "This looks official and genuine.",
    "It is legitimate and safe to apply.",
    "C'est une arnaque, ne payez rien.",
    "This offer is legitimate and verified.",
    "The scholarship is genuine.",
    "You are safe with this employer.",
    "It is a guaranteed official recruitment.",
    "Ne vous inquiétez pas, c'est sûr.",
    "This is not a scam.",
    "This is safe to pay.",
  ];

  for (const text of rejected) {
    it(`rejects: ${text}`, () => {
      expect(scrubVerdictWords(text)).toBeNull();
    });
  }
});

describe("Verdict scrubber allows description", () => {
  const allowed = [
    "The address is a Gmail account, not a ministry domain.",
    "I could not find this on the official site.",
    "This is not an official channel.",
    "An unofficial number is asking you for an OTP.",
    "The scholarship is unverified and no trace of it exists online.",
    "We found it on anzisha.org, the same domain the message names.",
    "Do not send money or any code from a text message.",
    "L'adresse est une boîte Gmail, pas un domaine ministériel.",
    "Aucun lien avec le site officiel du ministère.",
    "Cette bourse est non vérifiée et aucune trace n'existe en ligne.",
    "Il faut vérifier avant d'envoyer vos documents.",
    // "sur" is the ordinary French preposition, not the certainty word "sûr".
    // Treating them as the same rejected almost every grounded French answer.
    "Ce n'est pas un emploi, c'est une mise en danger de votre compte.",
    "L'argent est sur votre compte, pas chez moi.",
    "Il reste sur le compte jusqu'au 15 mars.",
  ];

  for (const text of allowed) {
    it(`allows: ${text}`, () => {
      expect(scrubVerdictWords(text)).toBe(text);
    });
  }
});
