"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { DashboardAppShellSkeleton } from "@/components/dashboard/dashboard-app-shell-skeleton";
import { DashboardClientGuards } from "@/components/dashboard/dashboard-client-guards";
import { DashboardProvider } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { RealtimeProvider } from "@/components/realtime-provider";
import { useAuthenticatedSession } from "@/hooks/use-authenticated-session";
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

export default function GroceryLayout({ children }: GroceryLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready: sessionReady, hasSession } = useAuthenticatedSession({
    requireAuth: true,
  });

  useEffect(() => {
    if (!sessionReady || !hasSession) {
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
  }, [sessionReady, hasSession, pathname, router]);

  if (!sessionReady || !hasSession) {
    return <DashboardAppShellSkeleton />;
  }

  return (
    <>
      <DashboardClientGuards />
      <DashboardProvider>
        <RealtimeProvider>
          <AppShell>{children}</AppShell>
          <DashboardToaster />
        </RealtimeProvider>
      </DashboardProvider>
    </>
  );
}
