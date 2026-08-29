"use client";

import { DashboardProvider } from "@/components/dashboard-provider";

export default function StaffPayPhoneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardProvider>{children}</DashboardProvider>;
}
