"use client";

import { AppShell } from "@/components/app-shell";
import { DashboardProvider } from "@/components/dashboard-provider";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { RealtimeProvider } from "@/components/realtime-provider";

type GroceryLayoutProps = {
  children: React.ReactNode;
};

export default function GroceryLayout({ children }: GroceryLayoutProps) {
  return (
    <DashboardProvider>
      <RealtimeProvider>
        <AppShell>{children}</AppShell>
        <DashboardToaster />
      </RealtimeProvider>
    </DashboardProvider>
  );
}
