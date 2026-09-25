import { afterEach, describe, expect, it, vi } from "vitest";
import { translations } from "../lib/i18n/dictionary";
import { queueMail } from "../lib/mail/queue";
import { mailReady } from "../lib/mail/transport";
import { renderResetMail, renderVerifyMail } from "../lib/mail/templates/mails";

const savedEnv = { ...process.env };

afterEach(() => {
  process.env = { ...savedEnv };
});

describe("mail templates", () => {
  it("renders the verify mail with link in HTML and plaintext twin", async () => {
    const t = translations.fr;
    const link = "http://localhost:3000/verify?token=abc";
    const { html, text } = await renderVerifyMail(
      {
        subject: t.mailVerifySubject,
        headline: t.mailVerifyHeadline,
        body: t.mailVerifyBody,
        cta: t.mailVerifyCta,
        closing: t.mailClosing,
      },
      link,
    );
    expect(html).toContain(link);
    expect(html).toContain(t.mailVerifyHeadline);
    expect(text).toContain(link);
    expect(text).toContain(t.mailVerifyHeadline);
  });

  it("carries the OTP code in the reset mail only when present", async () => {
    const t = translations.en;
    const link = "http://localhost:3000/reset?token=abc";
    const copy = {
      subject: t.mailResetSubject,
      headline: t.mailResetHeadline,
      body: t.mailResetBody,
      cta: t.mailResetCta,
      closing: t.mailClosing,
    };
    const withCode = await renderResetMail(copy, link, "123456");
    expect(withCode.html).toContain("123456");
    expect(withCode.text).toContain("123456");
    const withoutCode = await renderResetMail(copy, link, null);
    expect(withoutCode.html).not.toContain("Code:");
    expect(withoutCode.text).toContain(link);
  });
});

describe("mail queue", () => {
  it("reports not ready without SMTP and never throws", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASS", "");
    expect(mailReady()).toBe(false);
    const id = await queueMail("mail/verify.requested", {
      userId: "u1",
      email: "a@example.com",
      locale: "fr",
      purpose: "verify",
    });
    expect(id).toBe("mail/verify.requested:u1:none");
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
});
