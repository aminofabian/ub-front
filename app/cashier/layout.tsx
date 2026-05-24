"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CashierOrderAlerts } from "@/components/cashier/cashier-order-alerts";
import { GroceryNotificationListener } from "@/components/grocery/grocery-notification-listener";
import { CashierShell } from "@/components/cashier-shell";
import { DashboardProvider } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { RealtimeProvider } from "@/components/realtime-provider";
import { getSessionTokens } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import { startSessionRefresh } from "@/lib/session-refresh";

type CashierLayoutProps = {
  children: React.ReactNode;
};

export default function CashierLayout({ children }: CashierLayoutProps) {
  const [checkedAuth, setCheckedAuth] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const hasSession = Boolean(getSessionTokens());
    if (!hasSession) {
      router.replace(APP_ROUTES.login);
      return;
    }
    setCheckedAuth(true);

    const stopRefresh = startSessionRefresh();

    // Phase 9: Register service worker for PWA offline support
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Service worker registration is best-effort; failures are non-blocking.
      });
    }

    return () => {
      stopRefresh();
    };
  }, [router]);

  if (!checkedAuth) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <DashboardProvider>
      <RealtimeProvider>
        <CashierOrderAlerts />
        <GroceryNotificationListener />
        <CashierShell>{children}</CashierShell>
        <DashboardToaster />
      </RealtimeProvider>
    </DashboardProvider>
  );
}
