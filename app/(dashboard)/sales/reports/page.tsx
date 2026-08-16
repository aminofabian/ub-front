"use client";

import { AnalyticsWorkspace } from "@/app/(dashboard)/analytics/analytics-workspace";
import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

export default function SalesReportsPage() {
  const { me } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.SalesIntelligenceRead);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Sales by category"
        description={
          <>
            You do not have permission to view this report. Ask an administrator to
            grant{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              {Permission.SalesIntelligenceRead}
            </code>
            .
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  return <AnalyticsWorkspace showCategoryTable />;
}
