"use client";

import { ScrollText } from "lucide-react";

import { AuditLogPanel } from "@/components/audit-log-panel";
import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardLoading,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { cn } from "@/lib/utils";

export default function BusinessLogsPage() {
  const { loading, canViewAuditLog } = useDashboard();

  if (loading) {
    return <DashboardLoading label="Loading activity log…" />;
  }
  if (!canViewAuditLog) {
    return (
      <DashboardAccessDenied
        title="Activity log unavailable"
        description="Only owners, admins, and managers can view the activity log."
      />
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "flex flex-col gap-1.5 pb-8")}>
      <DashboardPageHero
        icon={ScrollText}
        eyebrow="Organization"
        title="Activity log"
        description="Auditable events across sales, shifts, security, inventory, and failures."
      />
      <AuditLogPanel />
    </div>
  );
}
