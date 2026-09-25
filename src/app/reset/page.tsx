"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "../../lib/auth-client";
import { useTranslation } from "../../lib/i18n/context";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

// Completes a reset link (?token=) with a new password form.
export default function ResetPage() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [invalid, setInvalid] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    if (!token) {
      setInvalid(true);
      return;
    }
    setBusy(true);
    try {
      const res = await authClient.resetPassword({ newPassword: password, token });
      if (res.error) throw new Error(res.error.code ?? "failed");
      toast.success(t.settingsPwChanged);
      window.location.href = "/signin";
    } catch {
      setInvalid(true);
    } finally {
      setBusy(false);
    }
  }

  if (invalid) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4">
        <Card className="w-full">
          <CardContent className="space-y-3 p-6 text-center">
            <p className="font-bold text-ink">{t.gateExpiredTitle}</p>
            <p className="text-sm text-slate-500">{t.gateExpiredDesc}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4">
      <Card className="w-full">
        <CardContent className="space-y-4 p-6 sm:p-8">
          <h1 className="font-display text-2xl font-black text-ink">{t.gateResetTitle}</h1>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reset-new" className="text-sm font-semibold text-slate-800">
                {t.gatePasswordLabel}
              </label>
              <Input
                id="reset-new"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.gatePasswordPlaceholder}
                autoComplete="new-password"
                disabled={busy}
              />
            </div>
            <Button type="submit" size="lg" className="w-full font-bold" disabled={busy || password.length < 8}>
              {t.gateResetTitle}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
