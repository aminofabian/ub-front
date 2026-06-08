"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  useClientHasSession,
  useClientSessionReady,
} from "@/hooks/use-client-session";
import { getSessionTokens, syncSessionPresenceCookie } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import { restoreClientSessionFromCookie } from "@/lib/restore-client-session";
import { startSessionRefresh } from "@/lib/session-refresh";

type UseAuthenticatedSessionOptions = {
  /** Redirect to login when tokens are absent. */
  requireAuth?: boolean;
  loginPath?: string;
};

/**
 * Starts proactive token refresh when a session exists. Optionally guards
 * routes that require authentication.
 *
 * Session is detected synchronously via {@link useClientHasSession} so iPad
 * Safari does not sit on a skeleton waiting for useEffect. When localStorage
 * is empty, attempts cookie-based restore once before redirecting to login.
 */
export function useAuthenticatedSession(
  options: UseAuthenticatedSessionOptions = {},
): { ready: boolean; hasSession: boolean; restoring: boolean } {
  const { requireAuth = false, loginPath = APP_ROUTES.login } = options;
  const router = useRouter();
  const clientReady = useClientSessionReady();
  const hasSession = useClientHasSession();
  const [restoreDone, setRestoreDone] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return Boolean(getSessionTokens());
  });
  const restoring = clientReady && !restoreDone;

  useEffect(() => {
    if (!clientReady || restoreDone) {
      return;
    }
    if (getSessionTokens() || hasSession) {
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
  }, [clientReady, restoreDone, hasSession]);

  const ready = clientReady && restoreDone;

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (requireAuth && !hasSession && !getSessionTokens()) {
      router.replace(loginPath);
      return;
    }
    if (!getSessionTokens() && !hasSession) {
      return;
    }
    syncSessionPresenceCookie();
    return startSessionRefresh();
  }, [ready, hasSession, requireAuth, loginPath, router]);

  return {
    ready,
    hasSession: hasSession || Boolean(getSessionTokens()),
    restoring,
  };
}
