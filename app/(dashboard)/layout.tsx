"use client";

import { Suspense } from "react";

import { AuthenticatedShellGate } from "@/components/auth/authenticated-shell-gate";
import { AppShell } from "@/components/app-shell";
import { DesktopLicenseProvider } from "@/components/desktop/desktop-license-provider";
import { IS_DESKTOP } from "@/lib/runtime";
import { DashboardAccessRedirects } from "@/components/dashboard/dashboard-access-redirects";
import { DashboardClientGuards } from "@/components/dashboard/dashboard-client-guards";
import { DashboardProvider } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { OnboardingQuestionnaireProvider } from "@/components/onboarding/onboarding-questionnaire-provider";
import { RealtimeProvider } from "@/components/realtime-provider";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

function DashboardLayoutInner({ children }: DashboardLayoutProps) {
  const shell = (
    <>
      <DashboardClientGuards />
      <DashboardProvider>
        <DashboardAccessRedirects />
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
