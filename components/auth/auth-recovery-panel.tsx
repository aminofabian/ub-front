"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { hasAccessSession } from "@/lib/auth";
import { restoreClientSessionFromCookie } from "@/lib/restore-client-session";

type AuthRecoveryPanelProps = {
  title?: string;
  message?: string;
};

export function AuthRecoveryPanel({
  title = "Reconnecting your session",
  message = "You are still signed in on this device. We are restoring the session — you should not need to type your password.",
}: AuthRecoveryPanelProps) {
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const ok = await restoreClientSessionFromCookie({ force: true });
      if (cancelled) {
        return;
      }
      if (ok || hasAccessSession()) {
        window.location.reload();
        return;
      }
      setAttempt((n) => n + 1);
    };
    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, 4_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-background p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {attempt > 0 ? `Still trying… (${attempt})` : "Trying now…"}
        </p>
        <Button asChild variant="ghost" className="mt-6 w-full">
          <Link href={`${APP_ROUTES.staffLogin}?switch=1`}>
            Sign in with a different account
          </Link>
        </Button>
      </div>
    </div>
  );
}
