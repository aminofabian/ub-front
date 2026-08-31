"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { signOutClientAndRedirectToLogin } from "@/lib/auth";

const AUTO_REDIRECT_MS = 4_000;

/**
 * Calm, full-screen state shown when the session is definitively dead
 * (refresh token revoked / expired / idle timeout / account locked).
 * Replaces error toasts and endless "Still trying…" spinners: a clear
 * explanation, one Sign in again action, and a soft auto-redirect.
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
          Your session ended
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          For your security, your session ended. Sign in again to continue —
          nothing you saved is lost.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href={`${APP_ROUTES.staffLogin}?notice=session-ended`}>
            Sign in again
          </Link>
        </Button>
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
          {countdown > 0 ? `Redirecting to sign in in ${countdown}s…` : "Redirecting to sign in…"}
        </p>
      </div>
    </div>
  );
}
