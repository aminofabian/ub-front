"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { signOutClientAndRedirectToLogin } from "@/lib/auth";

const AUTO_REDIRECT_MS = 4_000;

/**
 * Full-screen sign-in prompt when the session cannot be restored.
 * No error toast, no "expired" copy — just the next action.
 */
export function SessionEndedScreen() {
  const [countdown, setCountdown] = useState(
    Math.ceil(AUTO_REDIRECT_MS / 1000),
  );
  const redirected = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (redirected.current) {
        return;
      }
      redirected.current = true;
      signOutClientAndRedirectToLogin("session ended", {
        notice: "session-ended",
      });
    }, AUTO_REDIRECT_MS);
    const interval = window.setInterval(() => {
      setCountdown((n) => Math.max(0, n - 1));
    }, 1_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-background p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight">
          Please sign in to continue
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          You&apos;ll pick up where you left off. Nothing you saved is lost.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href={`${APP_ROUTES.staffLogin}?notice=session-ended`}>
            Sign in
          </Link>
        </Button>
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
          {countdown > 0
            ? `Opening sign-in in ${countdown}s…`
            : "Opening sign-in…"}
        </p>
      </div>
    </div>
  );
}
