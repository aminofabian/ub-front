"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { DesktopLicenseProvider } from "@/components/desktop/desktop-license-provider";
import { IS_DESKTOP } from "@/lib/runtime";
import { DashboardAppShellSkeleton } from "@/components/dashboard/dashboard-app-shell-skeleton";
import { DashboardClientGuards } from "@/components/dashboard/dashboard-client-guards";
import { DashboardProvider } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { OnboardingQuestionnaireProvider } from "@/components/onboarding/onboarding-questionnaire-provider";
import { RealtimeProvider } from "@/components/realtime-provider";
import { useAuthenticatedSession } from "@/hooks/use-authenticated-session";
import { fetchMe, type MeResponse } from "@/lib/api";
import { buyerHomePath, isBuyerAccount } from "@/lib/buyer-role";
import { roleLandingRedirect } from "@/lib/post-auth-destination";
import {
  readSessionBootstrap,
  SESSION_BOOTSTRAP_KEYS,
} from "@/lib/session-bootstrap";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

function applyRoleRedirects(
  me: MeResponse,
  pathname: string,
  router: ReturnType<typeof useRouter>,
): void {
  if (isBuyerAccount(me)) {
    router.replace(buyerHomePath());
    return;
  }
  const landingRedirect = roleLandingRedirect(me, pathname);
  if (landingRedirect) {
    router.replace(landingRedirect);
  }
}

function DashboardLayoutInner({ children }: DashboardLayoutProps) {
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
      applyRoleRedirects(bootMe, pathname, router);
      return;
    }

    void fetchMe()
      .then((me) => applyRoleRedirects(me, pathname, router))
      .catch(() => {
        /* Child routes show load/auth errors. */
      });
  }, [sessionReady, hasSession, pathname, router]);

  if (!sessionReady || !hasSession) {
    return <DashboardAppShellSkeleton />;
  }

  const shell = (
    <>
      <DashboardClientGuards />
      <DashboardProvider>
        <RealtimeProvider>
          <Suspense fallback={null}>
            <OnboardingQuestionnaireProvider>
              <AppShell>{children}</AppShell>
            </OnboardingQuestionnaireProvider>
          </Suspense>
          <DashboardToaster />
        </RealtimeProvider>
      </DashboardProvider>
    </>
  );

  if (!IS_DESKTOP) {
    return shell;
  }

  return <DesktopLicenseProvider>{shell}</DesktopLicenseProvider>;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <DashboardLayoutInner>{children}</DashboardLayoutInner>;
}
