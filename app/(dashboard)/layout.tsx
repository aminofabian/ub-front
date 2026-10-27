"use client";

import dynamic from "next/dynamic";
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
import { CashierTillPrintListener } from "@/components/cashier/cashier-till-print-listener";
import { RealtimeProvider } from "@/components/realtime-provider";
import { SupportUnreadProvider } from "@/components/support/support-unread-provider";

/**
 * Interaction-only overlays. None of these paint on first load — they mount a
 * portal, listen for an open event, or show a floating launcher. Keeping them
 * out of the shell's entry chunk lets the dashboard hydrate without waiting on
 * their (radix-heavy) module graphs; they arrive in their own chunks right
 * after hydration.
 */
const NotificationsDrawer = dynamic(
  () =>
    import("@/components/notifications-drawer").then(
      (m) => m.NotificationsDrawer,
    ),
  { ssr: false },
);
const NewMerchantGuideDrawer = dynamic(
  () =>
    import("@/components/onboarding/new-merchant-guide-drawer").then(
      (m) => m.NewMerchantGuideDrawer,
    ),
  { ssr: false },
);
const SupportLauncher = dynamic(
  () => import("@/components/support/support-launcher").then((m) => m.SupportLauncher),
  { ssr: false },
);
const SupportUnreadWatcher = dynamic(
  () =>
    import("@/components/support/support-unread-watcher").then(
      (m) => m.SupportUnreadWatcher,
    ),
  { ssr: false },
);

type DashboardLayoutProps = {
  children: React.ReactNode;
};

function DashboardLayoutInner({ children }: DashboardLayoutProps) {
  const shell = (
    <>
      <DashboardClientGuards />
      <DashboardProvider>
        <SupportUnreadProvider>
          <DashboardAccessRedirects />
          <RealtimeProvider>
            <Suspense fallback={null}>
              <OnboardingQuestionnaireProvider>
                <AppShell>{children}</AppShell>
              </OnboardingQuestionnaireProvider>
            </Suspense>
            <CashierTillPrintListener />
            <SupportUnreadWatcher />
            <SupportLauncher />
            <NotificationsDrawer />
            <NewMerchantGuideDrawer />
            <DashboardToaster />
          </RealtimeProvider>
        </SupportUnreadProvider>
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
