"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SessionEndedScreen } from "@/components/auth/session-ended-screen";
import { APP_ROUTES } from "@/lib/config";
import { hasAccessSession } from "@/lib/auth";
import { restoreClientSessionFromCookie } from "@/lib/restore-client-session";

type AuthRecoveryPanelProps = {
  title?: string;
  message?: string;
};

/** Failed restore attempts before we stop promising a silent recovery. */
const ENDED_AFTER_ATTEMPTS = 3;

export function AuthRecoveryPanel({
  title = "Reconnecting your session",
  message = "We could not reach the server for a moment. We will keep trying in the background.",
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

  // A session that still will not restore after several tries is dead — show
  // the calm "sign in again" state instead of an endless spinner.
  if (attempt >= ENDED_AFTER_ATTEMPTS) {
    return <SessionEndedScreen />;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-6">
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
