"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { DashboardAppShellSkeleton } from "@/components/dashboard/dashboard-app-shell-skeleton";
import { DashboardProvider } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { OnboardingQuestionnaireProvider } from "@/components/onboarding/onboarding-questionnaire-provider";
import { RealtimeProvider } from "@/components/realtime-provider";
import { getSessionTokens } from "@/lib/auth";
import { fetchMe } from "@/lib/api";
import { buyerHomePath, isBuyerAccount } from "@/lib/buyer-role";
import { APP_ROUTES } from "@/lib/config";
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
      } catch {
        /* invalid session — still allow layout to mount so providers can surface errors */
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

  return (
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
}
