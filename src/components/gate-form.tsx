"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "../lib/auth-client";
import { useTranslation } from "../lib/i18n/context";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { useRouter } from "next/navigation";

type GateMode = "signin" | "signup" | "forgot" | "otp" | "sent";

const COMMON_PASSWORDS = new Set([
  "password",
  "12345678",
  "qwerty123",
  "azerty123",
  "motdepasse",
  "cameroun",
  "cameroun1",
  "douala123",
  "yaounde123",
  "mtn12345",
  "orange123",
  "password1",
  "123456789",
  "letmein123",
  "welcome123",
  "admin1234",
  "checkam123",
  "football",
  "jesus123",
  "amour123",
]);

function passwordScore(password: string): 0 | 1 | 2 {
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return 0;
  let points = 0;
  if (password.length >= 8) points += 1;
  if (
    password.length >= 12 ||
    (/[A-Z]/.test(password) && /[0-9]/.test(password))
  )
    points += 1;
  return points as 0 | 1 | 2;
}

interface ErrorDict {
  gateRateLimited: string;
  gateFailed: string;
  gateUnverifiedDesc: string;
  gateExpiredDesc: string;
}

function errorCopy(code: string, dict: ErrorDict): string {
  if (code === "rate_limited" || code === "RATE_LIMITED")
    return dict.gateRateLimited;
  if (code === "EMAIL_NOT_VERIFIED") return dict.gateUnverifiedDesc;
  if (code === "INVALID_TOKEN" || code === "EXPIRED_TOKEN")
    return dict.gateExpiredDesc;
  return dict.gateFailed;
}

export function GateForm({
  notice,
  next,
}: {
  notice: string | null;
  next?: string;
}) {
  const landing =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/";
  const router = useRouter();
  const { t } = useTranslation();
  const [mode, setMode] = useState<GateMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const hint = passwordScore(password);

  async function fail(err: unknown) {
    const code = err instanceof Error ? err.message : "failed";
    const copy = errorCopy(code, {
      gateRateLimited: t.gateRateLimited,
      gateFailed: t.gateFailed,
      gateUnverifiedDesc: t.gateUnverifiedDesc,
      gateExpiredDesc: t.gateExpiredDesc,
    });
    setFieldError(copy);
    toast.error(copy);
  }

  async function handleGoogle() {
    setBusy(true);
    setFieldError(null);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: landing,
      });
    } catch (err: unknown) {
      await fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleMail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFieldError(null);
    try {
      if (mode === "signup") {
        const res = await authClient.signUp.email({
          email,
          password,
          name: "",
        });
        if (res.error) throw new Error(res.error.code ?? "failed");
        setMode("sent");
        toast.success(t.gateVerifyTitle);
      } else if (mode === "forgot") {
        const res = await authClient.forgetPassword.emailOtp({ email });
        if (res.error) throw new Error(res.error.code ?? "failed");
        setMode("otp");
        toast.success(t.gateResetTitle);
      } else {
        const res = await authClient.signIn.email(
          { email, password },
          {
            onSuccess: (data) => {
              router.push("/chat");
            },
          },
        );
        if (res.error) throw new Error(res.error.code ?? "failed");
        window.location.href = landing;
      }
    } catch (err: unknown) {
      await fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFieldError(null);
    try {
      const res = await authClient.emailOtp.verifyEmail({ email, otp });
      if (res.error) throw new Error(res.error.code ?? "failed");
      toast.success(t.gateOtpBtn);
      window.location.href = landing;
    } catch (err: unknown) {
      await fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setBusy(true);
    setFieldError(null);
    try {
      const res = await fetch("/api/auth/resend-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        jobId?: string | null;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? "failed");
      toast.success(t.gateResendOk);
      // Honest delayed state: poll the job once it exists, surface failed.
      if (data?.jobId) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          try {
            const poll = await fetch(
              `/api/mail/status?jobId=${encodeURIComponent(data.jobId)}`,
            );
            if (!poll.ok) continue;
            const state = (await poll.json()) as { state?: string };
            if (state.state === "failed") {
              setFieldError(`${t.gateDelayedTitle}. ${t.gateDelayedDesc}`);
              break;
            }
            if (state.state === "sent") break;
          } catch {
            break;
          }
        }
      }
    } catch (err: unknown) {
      await fail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-2 border-authority-900/10 bg-white shadow-xl">
      <CardContent className="space-y-5 p-6 sm:p-8">
        <div className="space-y-1 text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
            {t.gateKicker}
          </p>
          <h1 className="font-display text-3xl font-black tracking-tight text-ink">
            {mode === "forgot"
              ? t.gateResetTitle
              : mode === "otp"
                ? t.gateOtpBtn
                : t.gateTitle}
          </h1>
          <p className="text-sm text-slate-500">
            {mode === "otp" ? t.gateResetDesc : t.gateSub}
          </p>
        </div>

        {notice === "google-kept" && (
          <output className="block rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {t.gateGoogleKept}
          </output>
        )}
        {notice === "expired" && (
          <div className="space-y-2 rounded-lg bg-verdict-caution-bg px-3 py-2">
            <p className="text-sm font-bold text-verdict-caution-text">
              {t.gateExpiredTitle}
            </p>
            <p className="text-sm text-verdict-caution-text">
              {t.gateExpiredDesc}
            </p>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.gateEmailPlaceholder}
              autoComplete="email"
              disabled={busy}
              aria-label={t.gateEmailLabel}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={busy || !email.trim()}
            >
              {t.gateReissueBtn}
            </Button>
          </div>
        )}
        {fieldError && (
          <p
            role="alert"
            className="rounded-lg bg-verdict-scam-bg px-3 py-2 text-sm text-verdict-scam-text"
          >
            {fieldError}
          </p>
        )}

        {mode === "sent" ? (
          <div className="space-y-3 text-center">
            <p className="text-sm font-bold text-ink">{t.gateVerifyTitle}</p>
            <p className="text-sm text-slate-500">{t.gateVerifyDesc}</p>
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={busy}
            >
              {t.gateResendBtn}
            </Button>
            <div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode("signin")}
              >
                {t.gateBackBtn}
              </Button>
            </div>
          </div>
        ) : mode === "otp" ? (
          <form onSubmit={handleOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="gate-otp"
                className="text-sm font-semibold text-slate-800"
              >
                {t.gateOtpLabel}
              </label>
              <Input
                id="gate-otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder={t.gateOtpPlaceholder}
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={busy}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full font-bold"
              disabled={busy || !otp}
            >
              {t.gateOtpBtn}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMode("signin")}
            >
              {t.gateBackBtn}
            </Button>
          </form>
        ) : (
          <>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full font-bold"
            >
              {t.gateGoogleBtn}
            </Button>
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
              {t.gateOrDivider}
              <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
            </div>
            <form onSubmit={handleMail} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="gate-email"
                  className="text-sm font-semibold text-slate-800"
                >
                  {t.gateEmailLabel}
                </label>
                <Input
                  id="gate-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.gateEmailPlaceholder}
                  autoComplete="email"
                  disabled={busy}
                />
              </div>
              {mode !== "forgot" && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="gate-password"
                    className="text-sm font-semibold text-slate-800"
                  >
                    {t.gatePasswordLabel}
                  </label>
                  <Input
                    id="gate-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.gatePasswordPlaceholder}
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    disabled={busy}
                  />
                  {mode === "signup" && password.length > 0 && (
                    <output className="block text-xs text-slate-500">
                      {hint === 0
                        ? t.gatePasswordHintWeak
                        : hint === 1
                          ? t.gatePasswordHintFair
                          : t.gatePasswordHintStrong}
                    </output>
                  )}
                </div>
              )}
              <Button
                type="submit"
                size="lg"
                className="w-full font-bold"
                disabled={busy}
              >
                {mode === "signup"
                  ? t.gateSignUpBtn
                  : mode === "forgot"
                    ? t.gateResetTitle
                    : t.gateSignInBtn}
              </Button>
            </form>
            <div className="flex flex-col items-center gap-2 text-sm">
              {mode === "signin" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="font-semibold text-authority-700 hover:underline"
                  >
                    {t.gateForgotBtn}
                  </button>
                  <p className="text-slate-500">
                    {t.gateNoAccount}{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="font-semibold text-authority-700 hover:underline"
                    >
                      {t.gateSignUpBtn}
                    </button>
                  </p>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-semibold text-authority-700 hover:underline"
                >
                  {mode === "signup" ? t.gateHaveAccount : t.gateBackBtn}
                </button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
