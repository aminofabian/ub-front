"use client";

import { DashboardProvider } from "@/components/dashboard-provider";

export default function MyPayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardProvider>{children}</DashboardProvider>;
}
