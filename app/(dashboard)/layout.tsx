"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { DesktopLicenseProvider } from "@/components/desktop/desktop-license-provider";
import { IS_DESKTOP } from "@/lib/runtime";
import { DashboardAppShellSkeleton } from "@/components/dashboard/dashboard-app-shell-skeleton";
import { DashboardProvider } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { OnboardingQuestionnaireProvider } from "@/components/onboarding/onboarding-questionnaire-provider";
import { RealtimeProvider } from "@/components/realtime-provider";
import { useAuthenticatedSession } from "@/hooks/use-authenticated-session";
import { fetchMe } from "@/lib/api";
import { buyerHomePath, isBuyerAccount } from "@/lib/buyer-role";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { ready: sessionReady, hasSession } = useAuthenticatedSession({
    requireAuth: true,
  });

  // Redirect buyers to the shop — must not block the shell on fetchMe (iPad often
  // fails the first client API call even when the session is valid).
  useEffect(() => {
    if (!sessionReady || !hasSession) {
      return;
    }

    void fetchMe()
      .then((me) => {
        if (isBuyerAccount(me)) {
          router.replace(buyerHomePath());
        }
      })
      .catch(() => {
        /* Child routes show load/auth errors; do not trap the user on skeleton. */
      });
  }, [sessionReady, hasSession, router]);

  if (!sessionReady || !hasSession) {
    return <DashboardAppShellSkeleton />;
  }

  const shell = (
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
  );

  if (!IS_DESKTOP) {
    return shell;
  }

  return <DesktopLicenseProvider>{shell}</DesktopLicenseProvider>;
}
