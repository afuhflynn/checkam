"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "../../../lib/auth-client";
import { useTranslation } from "../../../lib/i18n/context";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";

// Consumes a verify link token (?token=), then lands in chat. Invalid or
// expired tokens route to the gate expired panel with reissue.
export default function VerifyPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<"working" | "done" | "expired">("working");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    if (!token) {
      setState("expired");
      return;
    }
    let live = true;
    authClient
      .verifyEmail({ query: { token } })
      .then((res) => {
        if (!live) return;
        if (res.error) setState("expired");
        else {
          setState("done");
          window.location.href = "/chat";
        }
      })
      .catch(() => {
        if (live) setState("expired");
      });
    return () => {
      live = false;
    };
  }, []);

  if (state === "expired") {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4">
        <Card className="w-full">
          <CardContent className="space-y-3 p-6 text-center">
            <p className="font-bold text-ink">{t.gateExpiredTitle}</p>
            <p className="text-sm text-slate-500">{t.gateExpiredDesc}</p>
            <Button type="button" asChild>
              <Link href="/signin?expired=1">{t.gateReissueBtn}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4">
      <p className="text-sm text-slate-500">{state === "done" ? t.chatNewChat : t.analyzing}</p>
    </div>
  );
}
