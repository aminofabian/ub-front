"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { ButcherShell } from "@/components/butcher/butcher-shell";
import { ButcheryOnlyRedirects } from "@/components/butcher/butchery-only-redirects";
import { DashboardProvider } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { RealtimeProvider } from "@/components/realtime-provider";
import { useAuthenticatedSession } from "@/hooks/use-authenticated-session";
import { fetchMe, fetchBusiness, type BusinessRecord, type MeResponse } from "@/lib/api";
import { buyerHomePath, isBuyerAccount } from "@/lib/buyer-role";
import { roleLandingRedirect } from "@/lib/post-auth-destination";
import {
  readSessionBootstrap,
  clearSessionBootstrap,
  SESSION_BOOTSTRAP_KEYS,
} from "@/lib/session-bootstrap";

type ButcherLayoutProps = {
  children: React.ReactNode;
};

function ButcherRoleRedirects() {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, hasSession } = useAuthenticatedSession({ requireAuth: true });

  useEffect(() => {
    if (!ready || !hasSession) {
      return;
    }

    const apply = (me: MeResponse, business?: BusinessRecord | null) => {
      if (isBuyerAccount(me)) {
        router.replace(buyerHomePath());
        return;
      }
      const landingRedirect = roleLandingRedirect(me, pathname, business);
      if (landingRedirect) {
        router.replace(landingRedirect);
      }
    };

    const bootMe = readSessionBootstrap<MeResponse>(SESSION_BOOTSTRAP_KEYS.me);
    const bootBusiness = readSessionBootstrap<BusinessRecord>(
      SESSION_BOOTSTRAP_KEYS.business,
    );
    if (bootMe) {
      apply(bootMe, bootBusiness);
      clearSessionBootstrap(SESSION_BOOTSTRAP_KEYS.me);
      if (bootBusiness) {
        clearSessionBootstrap(SESSION_BOOTSTRAP_KEYS.business);
      }
      return;
    }

    void Promise.all([fetchMe(), fetchBusiness()])
      .then(([me, business]) => apply(me, business))
      .catch(() => {});
  }, [ready, hasSession, pathname, router]);

  return null;
}

export default function ButcherLayout({ children }: ButcherLayoutProps) {
  const { ready } = useAuthenticatedSession({ requireAuth: true });

  useEffect(() => {
    if (!ready || typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, [ready]);

  return (
    <DashboardProvider>
      <RealtimeProvider>
        <ButcherRoleRedirects />
        <ButcheryOnlyRedirects />
        <ButcherShell>{children}</ButcherShell>
        <DashboardToaster />
      </RealtimeProvider>
    </DashboardProvider>
  );
}
