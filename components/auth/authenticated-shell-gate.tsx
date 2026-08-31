"use client";

import { useEffect, useState, type ReactNode } from "react";

import { AuthRecoveryPanel } from "@/components/auth/auth-recovery-panel";
import { SessionEndedScreen } from "@/components/auth/session-ended-screen";
import { SessionReconnectBanner } from "@/components/auth/session-reconnect-banner";
import { DashboardAppShellSkeleton } from "@/components/dashboard/dashboard-app-shell-skeleton";
import { SubscriptionRenewalWall } from "@/components/subscription-renewal-wall";
import { StaleClientReload } from "@/components/stale-client-reload";
import { useAuthenticatedSession } from "@/hooks/use-authenticated-session";
import {
  subscribeSessionReconnect,
  type SessionReconnectState,
} from "@/lib/session-reconnect";

const SESSION_WAIT_MS = 8_000;

type AuthenticatedShellGateProps = {
  children: ReactNode;
};

/** Shows the dashboard shell once a session is readable; never spins forever. */
export function AuthenticatedShellGate({ children }: AuthenticatedShellGateProps) {
  const { ready, hasSession, restoring } = useAuthenticatedSession({
    requireAuth: true,
  });
  const [timedOut, setTimedOut] = useState(false);
  const [reconnectState, setReconnectState] =
    useState<SessionReconnectState>("ok");

  useEffect(() => {
    return subscribeSessionReconnect(setReconnectState);
  }, []);

  useEffect(() => {
    if (!ready || hasSession || restoring) {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), SESSION_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [ready, hasSession, restoring]);

  let body: ReactNode;
  if (reconnectState === "ended") {
    // Session is definitively dead — calm full-screen sign-in prompt, no toasts.
    body = <SessionEndedScreen />;
  } else if (!ready || restoring) {
    body = <DashboardAppShellSkeleton />;
  } else if (!hasSession) {
    body = timedOut ? <AuthRecoveryPanel /> : <DashboardAppShellSkeleton />;
  } else {
    body = children;
  }

  return (
    <>
      {reconnectState === "reconnecting" && hasSession ? (
        <SessionReconnectBanner />
      ) : null}
      {body}
      <SubscriptionRenewalWall />
      <StaleClientReload />
    </>
  );
}
