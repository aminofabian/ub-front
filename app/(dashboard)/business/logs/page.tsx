"use client";

import { ScrollText } from "lucide-react";

import { OpsClientLogsPanel } from "@/components/ops-client-logs-panel";
import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";

export default function BusinessLogsPage() {
  const { loading, canManageBusinessSettings } = useDashboard();

  if (loading) {
    return null;
  }
  if (!canManageBusinessSettings) {
    return (
      <DashboardAccessDenied
        title="System logs unavailable"
        description="Only business admins can view client API errors from this device."
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero
        icon={ScrollText}
        eyebrow="Organization"
        title="System logs"
        description="API reachability and proxy-config errors from this browser. Tills never toast this detail — it is recorded here instead."
      />
      <OpsClientLogsPanel />
    </div>
  );
}
