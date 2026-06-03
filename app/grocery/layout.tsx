"use client";

import { AppShell } from "@/components/app-shell";
import { DashboardProvider } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { RealtimeProvider } from "@/components/realtime-provider";
import { useAuthenticatedSession } from "@/hooks/use-authenticated-session";

type GroceryLayoutProps = {
  children: React.ReactNode;
};

export default function GroceryLayout({ children }: GroceryLayoutProps) {
  const { ready } = useAuthenticatedSession({ requireAuth: true });

  if (!ready) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <DashboardProvider>
      <RealtimeProvider>
        <AppShell>{children}</AppShell>
        <DashboardToaster />
      </RealtimeProvider>
    </DashboardProvider>
  );
}
