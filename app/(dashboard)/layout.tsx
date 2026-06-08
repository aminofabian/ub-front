"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

import { AuthenticatedShellGate } from "@/components/auth/authenticated-shell-gate";
import { AppShell } from "@/components/app-shell";
import { DesktopLicenseProvider } from "@/components/desktop/desktop-license-provider";
import { IS_DESKTOP } from "@/lib/runtime";
import { DashboardClientGuards } from "@/components/dashboard/dashboard-client-guards";
import { DashboardProvider } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { OnboardingQuestionnaireProvider } from "@/components/onboarding/onboarding-questionnaire-provider";
import { RealtimeProvider } from "@/components/realtime-provider";
import { useClientHasSession, useClientSessionReady } from "@/hooks/use-client-session";
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

function DashboardRoleRedirects() {
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

function DashboardLayoutInner({ children }: DashboardLayoutProps) {
  const shell = (
    <>
      <DashboardRoleRedirects />
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
  return (
    <AuthenticatedShellGate>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AuthenticatedShellGate>
  );
}
