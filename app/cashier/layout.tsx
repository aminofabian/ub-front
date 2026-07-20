"use client";

import { useEffect, type ReactNode } from "react";

import { AuthenticatedShellGate } from "@/components/auth/authenticated-shell-gate";
import { PosSoftAuthScope } from "@/components/auth/pos-soft-auth-scope";
import { PosTillLockProvider } from "@/components/auth/pos-till-lock";
import { CashierOrderAlerts } from "@/components/cashier/cashier-order-alerts";
import { GroceryNotificationListener } from "@/components/grocery/grocery-notification-listener";
import { CashierShell } from "@/components/cashier-shell";
import { DashboardProvider } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { RealtimeProvider } from "@/components/realtime-provider";

type CashierLayoutProps = {
  children: ReactNode;
};

function CashierLayoutInner({ children }: CashierLayoutProps) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Service worker registration is best-effort; failures are non-blocking.
    });
  }, []);

  return (
    <DashboardProvider defaultAllDepartments>
      <PosTillLockProvider>
        <RealtimeProvider>
          <CashierOrderAlerts />
          <GroceryNotificationListener />
          <CashierShell>{children}</CashierShell>
          <DashboardToaster />
        </RealtimeProvider>
      </PosTillLockProvider>
    </DashboardProvider>
  );
}

export default function CashierLayout({ children }: CashierLayoutProps) {
  return (
    <AuthenticatedShellGate>
      <PosSoftAuthScope>
        <CashierLayoutInner>{children}</CashierLayoutInner>
      </PosSoftAuthScope>
    </AuthenticatedShellGate>
  );
}
