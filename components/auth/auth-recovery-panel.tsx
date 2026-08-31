"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { SessionEndedScreen } from "@/components/auth/session-ended-screen";
import { SessionWaitScreen } from "@/components/auth/session-wait-screen";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { hasAccessSession } from "@/lib/auth";
import { restoreClientSessionFromCookie } from "@/lib/restore-client-session";

/** Failed restore attempts before we stop promising a silent recovery. */
const ENDED_AFTER_ATTEMPTS = 3;

export function AuthRecoveryPanel() {
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

  if (attempt >= ENDED_AFTER_ATTEMPTS) {
    return <SessionEndedScreen />;
  }

  return (
    <SessionWaitScreen
      title="Still packing up"
      message={
        attempt > 0
          ? "Drag a crate while we reconnect — you're still signed in on this device."
          : "Drag a crate if you like. We're reconnecting in the background."
      }
      footer={
        <Button asChild variant="ghost" className="w-full">
          <Link href={`${APP_ROUTES.staffLogin}?switch=1`}>
            Sign in with a different account
          </Link>
        </Button>
      }
    />
  );
}
