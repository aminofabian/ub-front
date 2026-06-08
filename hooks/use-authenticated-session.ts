"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  useClientHasSession,
  useClientSessionReady,
} from "@/hooks/use-client-session";
import { syncSessionPresenceCookie } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
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
 * Safari does not sit on a skeleton waiting for useEffect.
 */
export function useAuthenticatedSession(
  options: UseAuthenticatedSessionOptions = {},
): { ready: boolean; hasSession: boolean } {
  const { requireAuth = false, loginPath = APP_ROUTES.login } = options;
  const router = useRouter();
  const ready = useClientSessionReady();
  const hasSession = useClientHasSession();

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (requireAuth && !hasSession) {
      router.replace(loginPath);
      return;
    }
    if (!hasSession) {
      return;
    }
    syncSessionPresenceCookie();
    return startSessionRefresh();
  }, [ready, hasSession, requireAuth, loginPath, router]);

  return { ready, hasSession };
}
