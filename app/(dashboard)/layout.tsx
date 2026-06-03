"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { DesktopLicenseProvider } from "@/components/desktop/desktop-license-provider";
import { IS_DESKTOP } from "@/lib/runtime";
import { DashboardAppShellSkeleton } from "@/components/dashboard/dashboard-app-shell-skeleton";
import { DashboardProvider } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { OnboardingQuestionnaireProvider } from "@/components/onboarding/onboarding-questionnaire-provider";
import { RealtimeProvider } from "@/components/realtime-provider";
import { getSessionTokens } from "@/lib/auth";
import { ApiRequestError, fetchMe } from "@/lib/api";
import { buyerHomePath, isBuyerAccount } from "@/lib/buyer-role";
import { APP_ROUTES } from "@/lib/config";
import { isSessionRelatedProblem } from "@/lib/problem";
import { startSessionRefresh } from "@/lib/session-refresh";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [checkedAuth, setCheckedAuth] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const hasSession = Boolean(getSessionTokens());
    if (!hasSession) {
      router.replace(APP_ROUTES.login);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchMe();
        if (!cancelled && isBuyerAccount(me)) {
          router.replace(buyerHomePath());
          return;
        }
      } catch (err) {
        if (!cancelled && !getSessionTokens()) {
          return;
        }
        if (
          !cancelled &&
          err instanceof ApiRequestError &&
          isSessionRelatedProblem(err.status, err.payload)
        ) {
          return;
        }
      }
      if (!cancelled) {
        setCheckedAuth(true);
      }
    })();

    const stopRefresh = startSessionRefresh();

    return () => {
      cancelled = true;
      stopRefresh();
    };
  }, [router]);

  if (!checkedAuth) {
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
