"use client";

import { useEffect, type ReactNode } from "react";

import { AuthenticatedShellGate } from "@/components/auth/authenticated-shell-gate";
import { PosSoftAuthScope } from "@/components/auth/pos-soft-auth-scope";
import { PosTillLockProvider } from "@/components/auth/pos-till-lock";
import { CashierOrderAlerts } from "@/components/cashier/cashier-order-alerts";
import { CashierWebOrdersPanel } from "@/components/cashier/cashier-web-orders-panel";
import { CashierTillPrintListener } from "@/components/cashier/cashier-till-print-listener";
import { GroceryNotificationListener } from "@/components/grocery/grocery-notification-listener";
import { CashierShell } from "@/components/cashier-shell";
import { DashboardProvider, useDashboard } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { RealtimeProvider } from "@/components/realtime-provider";
import { FoodTill } from "@/components/restaurant/food-till";
import { isFoodOnlyBusiness } from "@/lib/business-store-type";

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
          <CashierForThisShop>{children}</CashierForThisShop>
          <DashboardToaster />
        </RealtimeProvider>
      </PosTillLockProvider>
    </DashboardProvider>
  );
}

/**
 * A shop with shelves gets the barcode till and its listeners. A house that only cooks or pours
 * (restaurant, bar, café, takeaway) gets its own till: the counter, in its own shell. Until the
 * business is known neither is drawn, so a restaurant never sees the barcode till flash by.
 */
function CashierForThisShop({ children }: CashierLayoutProps) {
  const { business } = useDashboard();
  if (!business) {
    return null;
  }
  if (isFoodOnlyBusiness(business)) {
    return <FoodTill />;
  }
  return (
    <>
      <CashierOrderAlerts />
      <CashierWebOrdersPanel />
      <CashierTillPrintListener />
      <GroceryNotificationListener />
      <CashierShell>{children}</CashierShell>
    </>
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
