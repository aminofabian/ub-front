"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { AuthenticatedShellGate } from "@/components/auth/authenticated-shell-gate";
import { DashboardClientGuards } from "@/components/dashboard/dashboard-client-guards";
import { DashboardProvider } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { RealtimeProvider } from "@/components/realtime-provider";
import { useClientHasSession, useClientSessionReady } from "@/hooks/use-client-session";
import { fetchMe, type MeResponse } from "@/lib/api";
import { buyerHomePath, isBuyerAccount } from "@/lib/buyer-role";
import { roleLandingRedirect } from "@/lib/post-auth-destination";
import {
  readSessionBootstrap,
  SESSION_BOOTSTRAP_KEYS,
} from "@/lib/session-bootstrap";

type GroceryLayoutProps = {
  children: React.ReactNode;
};

function GroceryRoleRedirects() {
  const router = useRouter();
  const pathname = usePathname();
  const ready = useClientSessionReady();
  const hasSession = useClientHasSession();

  useEffect(() => {
    if (!ready || !hasSession) {
      return;
    }

    const bootMe = readSessionBootstrap<MeResponse>(SESSION_BOOTSTRAP_KEYS.me);
    if (bootMe) {
      if (isBuyerAccount(bootMe)) {
        router.replace(buyerHomePath());
        return;
      }
      const landingRedirect = roleLandingRedirect(bootMe, pathname);
      if (landingRedirect) {
        router.replace(landingRedirect);
      }
      return;
    }

    void fetchMe()
      .then((me) => {
        if (isBuyerAccount(me)) {
          router.replace(buyerHomePath());
          return;
        }
        const landingRedirect = roleLandingRedirect(me, pathname);
        if (landingRedirect) {
          router.replace(landingRedirect);
        }
      })
      .catch(() => {});
  }, [ready, hasSession, pathname, router]);

  return null;
}

function GroceryLayoutInner({ children }: GroceryLayoutProps) {
  return (
    <>
      <GroceryRoleRedirects />
      <DashboardClientGuards />
      <DashboardProvider>
        <RealtimeProvider>
          {children}
          <DashboardToaster />
        </RealtimeProvider>
      </DashboardProvider>
    </>
  );
}

export default function GroceryLayout({ children }: GroceryLayoutProps) {
  return (
    <AuthenticatedShellGate>
      <GroceryLayoutInner>{children}</GroceryLayoutInner>
    </AuthenticatedShellGate>
  );
}
