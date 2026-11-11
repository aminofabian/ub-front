"use client";

import { ShopDiary } from "./_components/shop-diary";
import {
  DashboardAccessDenied,
  DashboardLoading,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";

export default function BusinessLogsPage() {
  const { loading, canViewAuditLog } = useDashboard();

  if (loading) {
    return <DashboardLoading label="Opening the diary…" />;
  }
  if (!canViewAuditLog) {
    return (
      <DashboardAccessDenied
        title="Activity unavailable"
        description="Only owners, admins, and managers can read the shop's activity."
      />
    );
  }

  return <ShopDiary />;
}
