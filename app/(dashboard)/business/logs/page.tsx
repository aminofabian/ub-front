"use client";

import { ScrollText } from "lucide-react";

import { AuditLogPanel } from "@/components/audit-log-panel";
import { OpsClientLogsPanel } from "@/components/ops-client-logs-panel";
import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";

export default function BusinessLogsPage() {
  const { loading, canViewAuditLog } = useDashboard();

  if (loading) {
    return null;
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
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero
        icon={ScrollText}
        eyebrow="Organization"
        title="Activity log"
        description="Every auditable event across the business — sales, shifts, security, inventory, and system failures. Filter by severity, category, or time, and switch to failures-only to spot problems fast."
      />
      <AuditLogPanel />
      <details className="group">
        <summary className="cursor-pointer list-none rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          Device diagnostics — this browser only
        </summary>
        <div className="mt-4">
          <OpsClientLogsPanel />
        </div>
      </details>
    </div>
  );
}
