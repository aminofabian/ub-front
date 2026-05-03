"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CashierShell } from "@/components/cashier-shell";
import { DashboardProvider } from "@/components/dashboard-provider";
import { getSessionTokens } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";

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
  }, [router]);

  if (!checkedAuth) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <DashboardProvider>
      <CashierShell>{children}</CashierShell>
    </DashboardProvider>
  );
}
