/**
 * @vitest-environment happy-dom
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WhatsAppChatButton } from "../components/whatsapp/chat-button";
import { WhatsAppFloatButton } from "../components/whatsapp/float-button";
import { WhatsAppGuideBody } from "../components/whatsapp/guide-body";
import { LanguageProvider } from "../lib/i18n/context";
import { detectMessageLanguage } from "../lib/i18n/detect";
import { runRulesEngine } from "../lib/rules/engine";
import {
  CLICK_TO_CHAT_LABEL,
  CLICK_TO_CHAT_URL,
} from "../lib/whatsapp/click-to-chat";

/**
 * Spec 0016: the chat button.
 *
 * The two things these guard are the ones a screenshot cannot show. The
 * destination must be the click to chat code and never a link built from our
 * phone number, because that form puts the number in the page source. And the
 * copy must follow the interface language, because a French speaker tapping an
 * English button is the exact failure this spec exists to prevent.
 */

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

/**
 * The provider resolves the language from storage after mount, which is what a
 * real visitor gets, so the language is seeded rather than forced.
 */
function renderWithLanguage(node: React.ReactNode, language: "en" | "fr") {
  window.localStorage.setItem("checkam_lang", language);
  return render(
    <LanguageProvider initialLanguage={language}>{node}</LanguageProvider>,
  );
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("spec 0016 AC-1: one destination for every chat button", () => {
  it("points the button at the click to chat code", () => {
    renderWithLanguage(<WhatsAppChatButton />, "en");
    expect(screen.getByRole("link").getAttribute("href")).toBe(
      CLICK_TO_CHAT_URL,
    );
    expect(CLICK_TO_CHAT_URL).toBe("https://wa.me/message/JW4YDECEFLJQN1");
  });

  it("keeps every number based wa.me link on an explicit allowlist", () => {
    // The share links carry no recipient and are a different action, so they
    // stay. The guide's save the number flow is also allowed, and is the one
    // place the number legitimately belongs, because that page is about saving
    // it. Anything new has to be argued for here, which is the point.
    const allowed = new Set([
      "src/app/api/guide/number/route.ts",
      "src/components/guide-trials.tsx",
      "src/components/verdict-card.tsx",
      "src/components/scam-dossier.tsx",
      "src/components/chat/thread-view.tsx",
    ]);

    const found = new Set<string>();
    for (const file of [
      ...walk(join(process.cwd(), "src/components")),
      ...walk(join(process.cwd(), "src/app")),
    ]) {
      if (readFileSync(file, "utf8").includes("wa.me/")) {
        found.add(file.replace(`${process.cwd()}/`, ""));
      }
    }

    const unexpected = [...found].filter((file) => !allowed.has(file));
    expect(unexpected).toEqual([]);
  });

  it("builds no wa.me string inside a chat entry point", () => {
    for (const file of [
      "src/components/whatsapp/chat-button.tsx",
      "src/components/whatsapp/float-button.tsx",
    ]) {
      expect(readFileSync(join(process.cwd(), file), "utf8")).not.toContain(
        "wa.me/",
      );
    }
  });
});

describe("spec 0016 AC-5: the label follows the interface language", () => {
  it("renders the French label for a French interface", () => {
    renderWithLanguage(<WhatsAppChatButton />, "fr");
    expect(screen.getByRole("link").textContent).toBe("Vérifier sur WhatsApp");
    expect(CLICK_TO_CHAT_LABEL.fr).toBe("Vérifier sur WhatsApp");
  });

  it("renders the English label for an English interface", () => {
    renderWithLanguage(<WhatsAppChatButton />, "en");
    expect(screen.getByRole("link").textContent).toBe("Check on WhatsApp");
  });

  it("keeps each language accented and unaccented the way it should be", () => {
    expect(CLICK_TO_CHAT_LABEL.fr).toMatch(/[éèêàçù]/);
    expect(CLICK_TO_CHAT_LABEL.en).not.toMatch(/[àâäçéèêëîïôöùûüÿœæ]/);
  });
});

describe("spec 0016 AC-7: the language the reply comes back in", () => {
  it("shows what the fixed pre-filled message resolves to", () => {
    // The message inside the code cannot be overridden from the call site, so
    // this is the honest state of it: a visitor who taps and sends without
    // editing sends English, and the reply language follows the inbound text.
    // The spec accepts this and asks Meta for a French code; the test exists so
    // the day that changes, someone notices on purpose rather than by accident.
    const prefilled =
      "Hello CheckAm, I want to verify a suspicious message I just received.";
    expect(detectMessageLanguage(prefilled)).toBe("en");

    // A French speaker who writes in French still gets French, which is the
    // path the guide, the simulator and the bot all depend on.
    expect(
      detectMessageLanguage(
        "Bonjour, on me demande 500 000 FCFA pour un colis",
      ),
    ).toBe("fr");
  });

  it("gives both languages a real label, never an empty one", () => {
    for (const language of ["fr", "en"] as const) {
      expect(CLICK_TO_CHAT_LABEL[language].trim().length).toBeGreaterThan(0);
    }
  });
});

describe("spec 0016 AC-3, AC-9 and AC-11: the floating button", () => {
  it("is a real link with a name and a text label, not an icon alone", () => {
    renderWithLanguage(<WhatsAppFloatButton />, "fr");
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe(CLICK_TO_CHAT_URL);
    expect(link.getAttribute("aria-label")).toBeTruthy();
    // AC-9: the destination is legible without colour, so a text label rides
    // alongside the icon.
    expect(link.textContent?.trim()).toBe("Vérifier");
  });

  it("carries the small screen, safe area, focus and reduced motion classes", () => {
    renderWithLanguage(<WhatsAppFloatButton />, "en");
    const classes = screen.getByRole("link").className;
    expect(classes).toContain("sm:hidden");
    expect(classes).toContain("safe-area-inset-bottom");
    expect(classes).toContain("focus-visible:ring");
    expect(classes).toContain("motion-reduce:transition-none");
  });

  it("stays exposed until the observer reports otherwise", () => {
    // happy-dom has no IntersectionObserver, so the effect returns early and the
    // button stays reachable. That is the safe default: when we cannot tell
    // whether the in page button is on screen, this one is offered.
    renderWithLanguage(
      <div>
        <WhatsAppChatButton id="whatsapp-chat-cta" />
        <WhatsAppFloatButton />
      </div>,
      "en",
    );
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("aria-label")).toBeTruthy();
    }
  });
});

describe("spec 0016 AC-12: the guide shows the real reply", () => {
  const scenarios = {
    minesec: {
      label: "MINESEC",
      text: "Avis de recrutement des 325 instituteurs au MINESEC. Envoyez 25 000 FCFA par Orange Money au 699123456. Email: minesec.recrutement2025@gmail.com",
    },
    momo: {
      label: "Orange Money",
      text: "Vous avez reçu 75.000 FCFA de NKODO PIERRE (698001122). Erreur de transfert, veuillez renvoyer.",
    },
  };

  it("renders whatsappReply for the demo input, clean of emoji and dashes", () => {
    const { whatsappReply } = runRulesEngine({ text: scenarios.minesec.text });
    const { container } = renderWithLanguage(
      <WhatsAppGuideBody
        scenarios={scenarios}
        replies={{
          minesec: { fr: whatsappReply.fr, en: whatsappReply.en },
          momo: { fr: whatsappReply.fr, en: whatsappReply.en },
        }}
      />,
      "fr",
    );
    const shown = container.textContent ?? "";

    // Since spec 0017 row 33 the reply carries no bold markup at all: the
    // verdict lead opens in plain words and the simulator shows it as is.
    const replyBlocks = whatsappReply.fr.split("\n\n");
    expect(replyBlocks[0]).toBe("Ce message porte les marques d'une arnaque.");
    expect(shown).toContain("Ce message porte les marques d'une arnaque");
    expect(shown).not.toContain("*Alerte arnaque");
    expect(shown).toContain("Analysé par CheckAm.");
    // The capped reply carries no markup at all now, so nothing can leak.
    // A domain glob would keep its asterisks as content if one survived the cut.
    expect(whatsappReply.fr).not.toContain("*");

    expect(whatsappReply.fr).not.toMatch(/\p{Extended_Pictographic}/u);
    // No em or en dash. An ordinary hyphen is fine and expected in labels.
    expect(whatsappReply.fr).not.toMatch(/[—–]/);
  });

  it("shows the chat button as the page's primary action", () => {
    const { whatsappReply } = runRulesEngine({ text: scenarios.momo.text });
    renderWithLanguage(
      <WhatsAppGuideBody
        scenarios={scenarios}
        replies={{ minesec: whatsappReply, momo: whatsappReply }}
      />,
      "fr",
    );
    expect(screen.getByRole("link").getAttribute("href")).toBe(
      CLICK_TO_CHAT_URL,
    );
  });

  it("no longer carries the hardcoded emoji sample replies", () => {
    for (const file of [
      "src/app/(site)/whatsapp/page.tsx",
      "src/components/whatsapp/guide-body.tsx",
    ]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/MINSEC_REPLY|MOMO_REPLY/);
    }
  });
});
