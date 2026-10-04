import { describe, expect, it } from "vitest";
import {
  BENIGN_COPY,
  classifyBenignChat,
  hasScamPhrase,
  renderBenignReply,
} from "../lib/chat/benign";

describe("spec 0019 AC-1: short small talk is benign with no verdict", () => {
  it.each(["hi", "hello", "Hey", "thanks!", "Thank you so much", "ok"])(
    "reads %s as small talk",
    (text) => {
      expect(classifyBenignChat(text)).toBe("smalltalk");
    },
  );

  it.each(["salut", "Bonjour", "bonsoir!", "merci beaucoup"])(
    "reads %s as small talk",
    (text) => {
      expect(classifyBenignChat(text)).toBe("smalltalk");
    },
  );

  it("carries no verdict tag and no alarm in either language", () => {
    for (const body of [BENIGN_COPY.smalltalk.en, BENIGN_COPY.smalltalk.fr]) {
      expect(body).not.toMatch(/CAUTION|HIGH_RISK|VERIFIED_OFFICIAL/);
      expect(body).not.toMatch(/scam|arnaque/i);
      expect(body.length).toBeLessThanOrEqual(400);
    }
  });
});

describe("spec 0019 AC-2: product questions get the explainer", () => {
  it.each(["How does it work?", "what can you do", "Comment ça marche ?", "que peux tu faire"])(
    "reads %s as a product question",
    (text) => {
      expect(classifyBenignChat(text)).toBe("product");
    },
  );

  it("explainer invites a paste with no verdict in both languages", () => {
    for (const body of [BENIGN_COPY.product.en, BENIGN_COPY.product.fr]) {
      expect(body).toMatch(/paste|collez/i);
      expect(body).not.toMatch(/CAUTION|HIGH_RISK|VERIFIED_OFFICIAL/);
      expect(body.length).toBeLessThanOrEqual(800);
    }
  });

  it("renders the spec copy through the shared renderer", () => {
    expect(renderBenignReply("product", "en")).toBe(BENIGN_COPY.product.en);
    expect(renderBenignReply("product", "fr")).toBe(BENIGN_COPY.product.fr);
    expect(renderBenignReply("smalltalk", "fr")).toBe(BENIGN_COPY.smalltalk.fr);
  });
});

describe("spec 0019 AC-3 and AC-4: claims always take the check path", () => {
  it("keeps link, phone, amount, email, and long text as checks", () => {
    expect(classifyBenignChat("see https://example.cm/claim now")).toBe("check");
    expect(classifyBenignChat("call me on 699 12 34 56 please")).toBe("check");
    expect(classifyBenignChat("send 25 000 FCFA to confirm")).toBe("check");
    expect(classifyBenignChat("write to minesec.recruit@gmail.com")).toBe("check");
    expect(classifyBenignChat("x".repeat(141))).toBe("check");
  });

  it("treats hello plus a claim as a check, never as benign", () => {
    expect(classifyBenignChat("hello, here is a message with 699123456")).toBe("check");
  });

  it("treats extracted flyer text as a check even when short", () => {
    expect(classifyBenignChat("hi", { hasMediaText: true })).toBe("check");
  });

  it("treats friendly probes as small talk, never as checks", () => {
    expect(classifyBenignChat("Just testing to see how friendly you are")).toBe("smalltalk");
    expect(classifyBenignChat("are you there?")).toBe("smalltalk");
    expect(classifyBenignChat("who are you")).toBe("smalltalk");
  });

  it("forces short pressure language to check", () => {
    expect(classifyBenignChat("pay before midnight")).toBe("check");
    expect(classifyBenignChat("urgent, reply right now")).toBe("check");
    expect(classifyBenignChat("keep this secret")).toBe("check");
  });
});

describe("spec 0019 AC-5: empty input earns no verdict", () => {
  it("routes blank input to the check path so the warm ask runs", () => {
    expect(classifyBenignChat("")).toBe("check");
    expect(classifyBenignChat("   ")).toBe("check");
  });
});
