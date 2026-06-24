"use client";

import { useEffect, useState, type ReactNode } from "react";

import { AuthRecoveryPanel } from "@/components/auth/auth-recovery-panel";
import { DashboardAppShellSkeleton } from "@/components/dashboard/dashboard-app-shell-skeleton";
import { useAuthenticatedSession } from "@/hooks/use-authenticated-session";

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

  useEffect(() => {
    if (!ready || hasSession || restoring) {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), SESSION_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [ready, hasSession, restoring]);

  if (!ready || restoring) {
    return <DashboardAppShellSkeleton />;
  }
  if (!hasSession) {
    return timedOut ? <AuthRecoveryPanel /> : <DashboardAppShellSkeleton />;
  }
  return children;
}
