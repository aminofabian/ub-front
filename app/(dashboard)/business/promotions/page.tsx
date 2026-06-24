"use client";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
} from "@/components/dashboard-page-ui";
import { PromotionsDashboard } from "@/components/promotions/promotions-dashboard";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

export default function PromoCampaignsPage() {
  const { me } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.NotificationsPromotionsManage);

  if (!allowed) {
    return (
      <div className={DASHBOARD_MAX_WIDE}>
        <DashboardAccessDenied
          title="Promotions"
          description={
            <>
              You need permission{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                {Permission.NotificationsPromotionsManage}
              </code>
              . Owners have this by default.
            </>
          }
          backHref={APP_ROUTES.business}
          backLabel="Business settings"
        />
      </div>
    );
  }

  return <PromotionsDashboard />;
}
