"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { DashboardProvider } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { getSessionTokens } from "@/lib/auth";
import { fetchMe } from "@/lib/api";
import { buyerHomePath, isBuyerAccount } from "@/lib/buyer-role";
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

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!checkedAuth) {
    return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <DashboardProvider>
      <AppShell>{children}</AppShell>
      <DashboardToaster />
    </DashboardProvider>
  );
}
