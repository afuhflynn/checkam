"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "../../lib/auth-client";
import { useTranslation } from "../../lib/i18n/context";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";

/**
 * The four settings fields, extracted from the old `/settings` page so the
 * dialog and the page rendered the same component while both existed.
 *
 * Two deliberate omissions from the page version. The page's own heading and
 * "Back to chat" button are gone, because the dialog supplies its title and
 * description and Escape is how you leave. Everything else, including the
 * signed out prompt, is carried over unchanged, so a reader cannot tell which
 * surface they are on.
 *
 * Signing out and changing the password both navigate to a path with no query
 * string, which is what drops the panel parameter on the way out. That is why a
 * later sign in does not reopen settings unbidden.
 */
export function SettingsForm() {
  const { t, language, setLanguage } = useTranslation();
  const { data: session, isPending } = authClient.useSession();
  const [name, setName] = useState<string | null>(null);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);

  if (isPending) return null;
  if (!session?.user) {
    return (
      <div className="py-6 text-center">
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
    <div className="space-y-6">
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
