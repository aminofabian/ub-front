"use client";

import { useEffect, useState } from "react";

import {
  useClientHasSession,
  useClientSessionReady,
} from "@/hooks/use-client-session";
import { hasAccessSession, syncSessionPresenceCookie } from "@/lib/auth";
import { restoreClientSessionFromCookie } from "@/lib/restore-client-session";
import { startSessionRefresh } from "@/lib/session-refresh";

type UseAuthenticatedSessionOptions = {
  /** Keep retrying cookie restore instead of rendering the app unauthenticated. */
  requireAuth?: boolean;
  loginPath?: string;
};

/**
 * Starts proactive token refresh when a session exists. Optionally guards
 * routes that require authentication.
 *
 * Session is detected synchronously via {@link useClientHasSession} so iPad
 * Safari does not sit on a skeleton waiting for useEffect. When claims are
 * empty, attempts cookie-based restore and retries — never redirects to login.
 */
export function useAuthenticatedSession(
  options: UseAuthenticatedSessionOptions = {},
): { ready: boolean; hasSession: boolean; restoring: boolean } {
  const { requireAuth = false } = options;
  const clientReady = useClientSessionReady();
  const hasSession = useClientHasSession();
  const [restoreDone, setRestoreDone] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return hasAccessSession();
  });
  const restoring = clientReady && !restoreDone;

  useEffect(() => {
    if (!clientReady || restoreDone) {
      return;
    }
    // Gap G: bootstrap alone is not enough — access lives in cookie + claims.
    if (hasAccessSession()) {
      setRestoreDone(true);
      return;
    }

    let cancelled = false;
    void restoreClientSessionFromCookie().finally(() => {
      if (!cancelled) {
        setRestoreDone(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [clientReady, restoreDone]);

  const ready = clientReady && restoreDone;

  useEffect(() => {
    if (!ready) {
      return;
    }
    // Never hard-redirect to login here. A failed restore used to bounce
    // owners to /login while the refresh cookie was still valid. Keep
    // retrying; the shell shows a recovery panel until claims return.
    if (requireAuth && !hasSession && !hasAccessSession()) {
      const retry = window.setInterval(() => {
        void restoreClientSessionFromCookie({ force: true });
      }, 4_000);
      return () => window.clearInterval(retry);
    }
    if (!hasAccessSession()) {
      return;
    }
    syncSessionPresenceCookie();
    return startSessionRefresh();
  }, [ready, hasSession, requireAuth]);

  return {
    ready,
    hasSession: hasSession || hasAccessSession(),
    restoring,
  };
}
