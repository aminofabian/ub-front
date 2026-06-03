"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getSessionTokens, syncSessionPresenceCookie } from "@/lib/auth";
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
 */
export function useAuthenticatedSession(
  options: UseAuthenticatedSessionOptions = {},
): { ready: boolean; hasSession: boolean } {
  const { requireAuth = false, loginPath = APP_ROUTES.login } = options;
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const session = Boolean(getSessionTokens());
    setHasSession(session);

    if (requireAuth && !session) {
      router.replace(loginPath);
      return;
    }

    if (!session) {
      setReady(true);
      return;
    }

    syncSessionPresenceCookie();
    const stopRefresh = startSessionRefresh();
    setReady(true);

    return () => {
      stopRefresh();
    };
  }, [requireAuth, loginPath, router]);

  return { ready, hasSession };
}
