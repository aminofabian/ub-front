"use client";

import { useEffect, useState } from "react";

import { CashierOrderAlerts } from "@/components/cashier/cashier-order-alerts";
import { GroceryNotificationListener } from "@/components/grocery/grocery-notification-listener";
import { CashierShell } from "@/components/cashier-shell";
import { DashboardProvider } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { RealtimeProvider } from "@/components/realtime-provider";
import { useAuthenticatedSession } from "@/hooks/use-authenticated-session";

type CashierLayoutProps = {
  children: React.ReactNode;
};

export default function CashierLayout({ children }: CashierLayoutProps) {
  const { ready } = useAuthenticatedSession({ requireAuth: true });

  useEffect(() => {
    if (!ready || typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Service worker registration is best-effort; failures are non-blocking.
    });
  }, [ready]);

  return (
    <DashboardProvider defaultAllDepartments>
      <RealtimeProvider>
        <CashierOrderAlerts />
        <GroceryNotificationListener />
        <CashierShell>{children}</CashierShell>
        <DashboardToaster />
      </RealtimeProvider>
    </DashboardProvider>
  );
}
