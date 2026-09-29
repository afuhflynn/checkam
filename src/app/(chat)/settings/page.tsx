"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "../../../lib/auth-client";
import { useTranslation } from "../../../lib/i18n/context";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";

export default function SettingsPage() {
  const { t, language, setLanguage } = useTranslation();
  const { data: session, isPending } = authClient.useSession();
  const [name, setName] = useState<string | null>(null);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);

  if (isPending) return null;
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-slate-600">{t.settingsNeedSignIn}</p>
        <Link
          href="/signin"
          className="font-bold text-authority-700 hover:underline"
        >
          {t.gateSignInBtn}
        </Link>
      </div>
    );
  }

  const displayName = name ?? session.user.name ?? "";

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authClient.updateUser({ name: displayName.trim() });
      if (res.error) throw new Error("save_failed");
      toast.success(t.settingsSaved);
    } catch {
      toast.error(t.gateFailed);
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authClient.changePassword({
        currentPassword: currentPw,
        newPassword: newPw,
        revokeOtherSessions: true,
      });
      if (res.error) throw new Error("password_failed");
      // Spec invariant: every session dies on password change, including
      // this one. Revoke all, then sign back in fresh.
      await fetch("/api/user/revoke-all", { method: "POST" });
      await authClient.signOut();
      window.location.href = "/signin";
    } catch {
      toast.error(t.gateFailed);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await authClient.signOut();
    window.location.href = "/";
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex items-center justify-start w-full">
        <Button asChild variant={"outline"}>
          <Link href={"/chat"}>Back to chat</Link>
        </Button>
      </div>
      <div>
        <h1 className="font-display text-3xl font-black text-ink">
          {t.settingsTitle}
        </h1>
        <p className="text-sm text-slate-500">{t.settingsSub}</p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="font-bold text-ink">{t.settingsProfile}</h2>
          <form onSubmit={saveProfile} className="space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="settings-name"
                className="text-sm font-semibold text-slate-800"
              >
                {t.settingsNameLabel}
              </label>
              <Input
                id="settings-name"
                value={displayName}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                disabled={busy}
              />
            </div>
            <Button type="submit" disabled={busy}>
              {t.settingsSave}
            </Button>
          </form>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-slate-800">
              {t.settingsLanguage}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={language === "fr" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("fr")}
              >
                FR
              </Button>
              <Button
                type="button"
                variant={language === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("en")}
              >
                EN
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="font-bold text-ink">{t.settingsPassword}</h2>
          <form onSubmit={changePassword} className="space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="settings-current"
                className="text-sm font-semibold text-slate-800"
              >
                {t.settingsCurrentPw}
              </label>
              <Input
                id="settings-current"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                autoComplete="current-password"
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="settings-new"
                className="text-sm font-semibold text-slate-800"
              >
                {t.settingsNewPw}
              </label>
              <Input
                id="settings-new"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
                disabled={busy}
              />
            </div>
            <Button type="submit" disabled={busy || newPw.length < 8}>
              {t.settingsChangePw}
            </Button>
          </form>
          <Button type="button" variant="outline" onClick={signOut}>
            {t.settingsSignOut}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
