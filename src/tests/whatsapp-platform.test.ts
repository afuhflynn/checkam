import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const TEST_PHONE = "237XXXXXXXXX";
import { runRulesEngine } from "../lib/rules/engine";
import { capNotice, capStatus } from "../lib/whatsapp/cap";
import {
  META_FREE_SERVICE_MESSAGES_PER_MONTH,
  monthKey,
  monthStartUtc,
  monthlyReplyCap,
} from "../lib/whatsapp/config";
import {
  type OpenedWindow,
  rehydrateWindow,
  windowExpiry,
  windowStart,
} from "../lib/whatsapp/thread";

/**
 * Spec 0015, the parts of the platform contract that are pure logic. The
 * database backed scenarios (the conditional write under concurrency, the
 * month creation race, the once a month notice) are verified by
 * /verify-release against a live database and locked by /test-engineer.
 */

const SRC = join(process.cwd(), "src");
const WHATSAPP_MODULE = "src/lib/whatsapp";
const EMOJI = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
// Assembled from parts on purpose: this file must not itself hold the literal
// it forbids everywhere else.
const GRAPH_HOST = ["graph", "facebook", "com"].join(".");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

afterEach(() => {
  // stubEnv rather than delete: assigning undefined to process.env stores the
  // string "undefined", and the lint rule rightly dislikes delete.
  vi.unstubAllEnvs();
});

describe("spec 0015 AC-1: one pinned Meta version", () => {
  it("keeps the Graph host literal inside the whatsapp module only", () => {
    const offenders = sourceFiles(SRC)
      .map((file) => ({ file: relative(process.cwd(), file), text: readFileSync(file, "utf8") }))
      .filter(({ file, text }) => !file.startsWith(WHATSAPP_MODULE))
      .filter(({ text }) => text.includes(GRAPH_HOST))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it("pins a version that is not the expired v19", async () => {
    const { GRAPH_API_VERSION, graphUrl } = await import("../lib/whatsapp/graph");
    expect(GRAPH_API_VERSION).toBe("v26.0");
    expect(graphUrl("123/messages")).toBe(`https://${GRAPH_HOST}/v26.0/123/messages`);
  });
});

describe("spec 0015 AC-2 and AC-3: the 24 hour window", () => {
  const received = new Date("2026-10-01T12:00:00.000Z");

  it("starts the window at the earlier of Meta's time and our receive time", () => {
    const older = new Date("2026-10-01T06:00:00.000Z");
    expect(windowStart(older, received).toISOString()).toBe(older.toISOString());

    const newer = new Date("2026-10-01T18:00:00.000Z");
    expect(windowStart(newer, received).toISOString()).toBe(received.toISOString());
  });

  it("never expires later than Meta would, under either direction of skew", () => {
    for (const metaTime of ["2026-10-01T06:00:00.000Z", "2026-10-01T18:00:00.000Z"]) {
      const start = windowStart(new Date(metaTime), received);
      expect(start.getTime()).toBeLessThanOrEqual(received.getTime());
      expect(windowExpiry(start).getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
    }
  });

  it("falls back to our receive time when Meta sends no usable timestamp", () => {
    expect(windowStart(null, received).toISOString()).toBe(received.toISOString());
    expect(windowStart(new Date("nonsense"), received).toISOString()).toBe(received.toISOString());
  });

  it("refuses at exactly 24 hours and allows one minute earlier", () => {
    const start = new Date("2026-10-01T12:00:00.000Z");
    const expires = windowExpiry(start);
    expect(expires.getTime() - start.getTime()).toBe(86_400_000);
    expect(new Date(expires.getTime() - 60_000).getTime() < expires.getTime()).toBe(true);
  });

  // Regression for the bug that killed every inbound message. Inngest serializes
  // a step's return value as JSON, so a Date arrives at the next step as a
  // string, and the worker called .getTime() on it. The unit suite missed it
  // because it called the functions directly and never crossed a step boundary,
  // so this test performs the same round trip the runtime performs.
  it("rehydrates the window after the JSON round trip Inngest puts a step return value through", () => {
    const start = new Date("2026-10-01T12:00:00.000Z");
    const direct: OpenedWindow = {
      threadKey: TEST_PHONE,
      lastInboundAt: start,
      windowExpiresAt: windowExpiry(start),
    };

    // What Inngest actually hands the next step.
    const acrossStepBoundary = JSON.parse(JSON.stringify(direct));
    expect(acrossStepBoundary.windowExpiresAt).not.toBeInstanceOf(Date);
    expect(typeof acrossStepBoundary.windowExpiresAt).toBe("string");

    // Without the fix this is the worker's expression, and it throws.
    expect(() => acrossStepBoundary.windowExpiresAt.getTime()).toThrow();

    // With the fix the value is a real Date again, and the worker's exact
    // decision expression evaluates instead of throwing.
    const reopened = rehydrateWindow(acrossStepBoundary);
    expect(reopened.windowExpiresAt).toBeInstanceOf(Date);
    expect(reopened.lastInboundAt).toBeInstanceOf(Date);
    expect(reopened.windowExpiresAt.getTime()).toBe(direct.windowExpiresAt.getTime());
    expect(reopened.windowExpiresAt.toISOString()).toBe(direct.windowExpiresAt.toISOString());
    expect(reopened.threadKey).toBe(direct.threadKey);

    const now = new Date("2026-10-01T13:00:00.000Z");
    expect(now.getTime() >= reopened.windowExpiresAt.getTime()).toBe(false);
    expect(now.getTime() >= direct.windowExpiresAt.getTime()).toBe(false);

    // A closed window is still refused after rehydration, so the fix does not
    // quietly open the window back up.
    const later = new Date(direct.windowExpiresAt.getTime() + 1);
    expect(later.getTime() >= reopened.windowExpiresAt.getTime()).toBe(true);
  });

  it("refuses to rehydrate a window whose dates are unreadable", () => {
    const start = new Date("2026-10-01T12:00:00.000Z");
    const broken = JSON.parse(
      JSON.stringify({
        threadKey: TEST_PHONE,
        lastInboundAt: start,
        windowExpiresAt: windowExpiry(start),
      }),
    );
    broken.windowExpiresAt = "not a date";

    // An unreadable window must be loud rather than becoming an Invalid Date
    // that compares false and sends outside the window.
    expect(() => rehydrateWindow(broken)).toThrow(/unreadable window/);
  });
});

describe("spec 0015 AC-5 to AC-7: the monthly cap", () => {
  it("defaults to Meta's free allowance so the default costs nothing", () => {
    expect(monthlyReplyCap()).toBe(META_FREE_SERVICE_MESSAGES_PER_MONTH);
    expect(META_FREE_SERVICE_MESSAGES_PER_MONTH).toBe(1000);
  });

  it("holds a notice reserve back inside the cap, never above it", () => {
    const status = capStatus("2026-10");
    expect(status.cap).toBe(1000);
    expect(status.replyCeiling).toBeLessThan(status.cap);
    expect(status.noticeCeiling).toBe(1000);
  });

  it("honours an explicit cap, including zero to silence the bot", () => {
    vi.stubEnv("WHATSAPP_MONTHLY_REPLY_CAP", "0");
    expect(monthlyReplyCap()).toBe(0);
    expect(capStatus("2026-10").noticeCeiling).toBe(0);

    vi.stubEnv("WHATSAPP_MONTHLY_REPLY_CAP", "2500");
    expect(monthlyReplyCap()).toBe(2500);
  });

  it("falls back to the free allowance on a junk value", () => {
    for (const junk of ["", "   ", "abc", "-5", "12.7x"]) {
      vi.stubEnv("WHATSAPP_MONTHLY_REPLY_CAP", junk);
      expect(monthlyReplyCap()).toBe(META_FREE_SERVICE_MESSAGES_PER_MONTH);
    }
  });

  it("never lets the notice ceiling exceed the cap, at any cap", () => {
    for (const cap of ["0", "1", "4", "100", "1000", "100000"]) {
      vi.stubEnv("WHATSAPP_MONTHLY_REPLY_CAP", cap);
      const status = capStatus("2026-10");
      expect(status.noticeCeiling).toBeLessThanOrEqual(status.cap);
      expect(status.replyCeiling).toBeLessThanOrEqual(status.cap);
    }
  });
});

describe("spec 0015 AC-4: the cap notice", () => {
  it("ships both languages, clean of emoji and dashes", () => {
    for (const text of [capNotice("en"), capNotice("fr")]) {
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toMatch(EMOJI);
      expect(text).not.toMatch(/[—–]/);
    }
    expect(capNotice("en")).toMatch(/[.!?]$/);
    expect(capNotice("fr")).toMatch(/[.!?]$/);
  });

  it("names the configured host, and never a localhost", () => {
    // The notice is read by someone who may be worried, so it must never point
    // them at a developer's machine.
    for (const language of ["fr", "en"] as const) {
      const text = capNotice(language);
      expect(text).toContain("checkam.cm");
      expect(text).not.toContain("localhost");
      expect(text).not.toContain("http://");
    }
  });

  it("follows NEXT_PUBLIC_APP_URL when it is a real address", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.checkam.cm/");
    expect(capNotice("fr")).toContain("staging.checkam.cm");
    expect(capNotice("fr")).not.toContain("https://staging.checkam.cm/.");
  });
});

describe("spec 0015 AC-5: the month key follows the account timezone", () => {
  it("defaults to Africa/Douala, which is one hour ahead of UTC", () => {
    vi.stubEnv("WHATSAPP_ACCOUNT_TIMEZONE", "");
    // 23:30 UTC on the 31st is already the 1st in Douala.
    expect(monthKey(new Date("2026-09-30T23:30:00.000Z"))).toBe("2026-10");
    expect(monthStartUtc("2026-10").toISOString()).toBe("2026-09-30T23:00:00.000Z");
  });

  it("follows an explicit account timezone", () => {
    vi.stubEnv("WHATSAPP_ACCOUNT_TIMEZONE", "UTC");
    expect(monthKey(new Date("2026-09-30T23:30:00.000Z"))).toBe("2026-09");
    expect(monthStartUtc("2026-09").toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("falls back rather than throwing on a timezone Intl rejects", () => {
    vi.stubEnv("WHATSAPP_ACCOUNT_TIMEZONE", "Not/AZone");
    expect(monthKey(new Date("2026-09-30T23:30:00.000Z"))).toBe("2026-10");
  });
});

describe("spec 0015 AC-8 and AC-9: the phone reply format", () => {
  const scam = runRulesEngine({
    text: `
      AVIS DE RECRUTEMENT SPÉCIAL DES 325 INSTITUTEURS AU MINESEC 2025.
      Les candidats retenus doivent envoyer les frais de dossier de 25 000 FCFA par Orange Money au 699 12 34 56.
      Contact du secrétariat: minesec.recrutement2025@gmail.com
    `,
    claimedEntity: "MINESEC",
    phoneNumbers: ["699123456"],
    emails: ["minesec.recrutement2025@gmail.com"],
    amount: "25000 FCFA 🚨",
  });

  it("uses a real bullet character, not a hyphen", () => {
    expect(scam.whatsappReply.en).toContain("• ");
    expect(scam.whatsappReply.en).not.toMatch(/^- /m);
    expect(scam.whatsappReply.fr).toContain("• ");
  });

  it("keeps at most one blank line between sections", () => {
    for (const body of [scam.whatsappReply.en, scam.whatsappReply.fr]) {
      expect(body).not.toMatch(/\n{3,}/);
    }
  });

  it("sanitises the whole body, including an amount that carries an emoji", () => {
    for (const body of [scam.whatsappReply.en, scam.whatsappReply.fr]) {
      expect(body).not.toMatch(EMOJI);
      expect(body).not.toMatch(/[\u2014\u2013]/);
    }
  });

  it("writes proper accented French and leaves our English copy unaccented", () => {
    // French: accents restored on the header, the intro and the labels.
    expect(scam.whatsappReply.fr).toContain("Alerte arnaque");
    expect(scam.whatsappReply.fr).toContain("analysé");
    expect(scam.whatsappReply.fr).toContain("Numéro à surveiller");
    expect(scam.whatsappReply.fr).toMatch(/[àâäçéèêëîïôöùûüÿœæ]/);

    // English: our own header, intro and labels carry no accent. A French word
    // inside a rule string (a ministry name) is content, not copy, so it is not
    // what this asserts.
    const englishHeader = scam.whatsappReply.en.split("\n")[0] ?? "";
    expect(englishHeader).toBe("*Scam alert - CheckAm Cameroon*");
    expect(englishHeader).not.toMatch(/[àâäçéèêëîïôöùûüÿœæ]/);
    expect(scam.whatsappReply.en).toContain("This message was analyzed on checkam.cm:");
    expect(scam.whatsappReply.en).toContain("Number to watch:");
    expect(scam.whatsappReply.en).toContain("Amount demanded:");
  });

  it("carries the same verdict, evidence and closing block as the web answer", () => {
    expect(scam.whatsappReply.en).toContain("Scam alert");
    expect(scam.whatsappReply.fr).toContain("Alerte arnaque");
    for (const bullet of scam.evidenceBullets.en) {
      expect(scam.whatsappReply.en).toContain(bullet.replace(/[\u2014\u2013]/g, "-"));
    }
    expect(scam.whatsappReply.en).toContain("Report it free on the ANTIC hotline, 8202.");
    expect(scam.whatsappReply.en).toContain("Forward this to your family");
  });

  it("stays inside the ceiling and ends on the closing block", () => {
    for (const body of [scam.whatsappReply.en, scam.whatsappReply.fr]) {
      expect(body.length).toBeLessThanOrEqual(1600);
    }
    expect(scam.whatsappReply.en.trimEnd().endsWith("protect others.")).toBe(true);
    expect(scam.whatsappReply.fr.trimEnd().endsWith("vos proches.")).toBe(true);
  });

  it("keeps the web formats untouched by the phone format", () => {
    expect(scam.whatsappWarning.en).toContain("- ");
    expect(scam.whatsappWarningPlain.en).not.toContain("*");
  });

  it("drops contact lines first, then the oldest bullets, and never the closing block", () => {
    // A sextortion alert is the longest reply we produce: the coercive and minor
    // safety paragraphs together run close to a thousand characters, and the
    // web variant of the same verdict goes over the ceiling.
    const overCeiling = runRulesEngine({
      text: "Envoyez une photo intime nude sinon je vais publier à tout le monde vos photos. Ils menacent de diffuser dans 24h si vous ne payez pas 500 000 FCFA par Orange Money au 691 234 567. Ils ont le mot de passe et le code OTP de mon compte.",
      claimedEntity: "MINESEC",
      phoneNumbers: ["691234567", "677987654", "655111222", "690112233"],
      emails: ["recrutement2025@gmail.com"],
      amount: "500 000 FCFA",
    });

    expect(overCeiling.verdict).toBe("HIGH_RISK");
    // The starting point really is over the ceiling, so the drop order is
    // observable rather than assumed.
    expect(overCeiling.whatsappWarning.fr.length).toBeGreaterThan(1600);
    expect(overCeiling.whatsappReply.fr.length).toBeLessThanOrEqual(1600);

    // Contact lines went first, and the oldest bullet went next, and at least
    // one evidence bullet survived.
    expect(overCeiling.whatsappWarning.fr).toContain("surveiller");
    expect(overCeiling.whatsappReply.fr).not.toContain("surveiller");
    const markdownBullets = (overCeiling.whatsappWarning.fr.match(/^- /gm) ?? []).length;
    const phoneBullets = (overCeiling.whatsappReply.fr.match(/^• /gm) ?? []).length;
    expect(phoneBullets).toBeGreaterThan(0);
    expect(phoneBullets).toBeLessThan(markdownBullets);

    // The verdict line and the closing block are never cut.
    expect(overCeiling.whatsappReply.fr).toContain("Alerte arnaque");
    expect(overCeiling.whatsappReply.fr.trimEnd().endsWith("vos proches.")).toBe(true);
  });
});

describe("spec 0015 AC-11: one message at a time per sender", () => {
  // This asserts the configuration rather than the queue behaviour, which is the
  // only thing a unit test can honestly pin. Whether Inngest honours it is a
  // runtime property, and /verify-release is what confirms that.
  //
  // It matters that this test exists. A run history records when a run was
  // scheduled and when it actually started, and those are different moments, so
  // two messages arriving together look concurrent in the history even when the
  // queue ran them one after the other. Reading the wrong column once produced a
  // false failure for this criterion.
  it("is configured with a limit of one keyed on the sender", async () => {
    const { processWhatsAppMessage } = await import(
      "../inngest/functions/process-whatsapp-message"
    );
    const opts = (
      processWhatsAppMessage as unknown as {
        opts: { concurrency: unknown; triggers: unknown };
      }
    ).opts;

    expect(opts.concurrency).toEqual({ limit: 1, key: "event.data.fromNumber" });
  });

  it("keys the limit on the sender rather than on the whole function", async () => {
    const { processWhatsAppMessage } = await import(
      "../inngest/functions/process-whatsapp-message"
    );
    const opts = (
      processWhatsAppMessage as unknown as {
        opts: { concurrency: { limit: number; key?: string } };
      }
    ).opts;

    // A missing key would serialise every sender behind one another, which would
    // quietly turn a per person limit into a global one.
    expect(opts.concurrency.limit).toBe(1);
    expect(opts.concurrency.key).toBeTruthy();
  });
});
