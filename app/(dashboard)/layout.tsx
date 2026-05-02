"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { DashboardProvider } from "@/components/dashboard-provider";
import { getSessionTokens } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";

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
    setCheckedAuth(true);
  }, [router]);

  if (!checkedAuth) {
    return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <DashboardProvider>
      <AppShell>{children}</AppShell>
    </DashboardProvider>
  );
}
