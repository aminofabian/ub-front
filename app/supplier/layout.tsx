"use client";

import { useEffect, type ReactNode } from "react";

import { AuthenticatedShellGate } from "@/components/auth/authenticated-shell-gate";
import { PosSoftAuthScope } from "@/components/auth/pos-soft-auth-scope";
import { PosTillLockProvider } from "@/components/auth/pos-till-lock";
import { CashierShell } from "@/components/cashier-shell";
import { DashboardProvider } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { RealtimeProvider } from "@/components/realtime-provider";

type SupplierReceiveLayoutProps = {
  children: ReactNode;
};

function SupplierReceiveLayoutInner({ children }: SupplierReceiveLayoutProps) {
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
          <CashierShell>{children}</CashierShell>
          <DashboardToaster />
        </RealtimeProvider>
      </PosTillLockProvider>
    </DashboardProvider>
  );
}

export default function SupplierReceiveLayout({
  children,
}: SupplierReceiveLayoutProps) {
  return (
    <AuthenticatedShellGate>
      <PosSoftAuthScope>
        <SupplierReceiveLayoutInner>{children}</SupplierReceiveLayoutInner>
      </PosSoftAuthScope>
    </AuthenticatedShellGate>
  );
}
