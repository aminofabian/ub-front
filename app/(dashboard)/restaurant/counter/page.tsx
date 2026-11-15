"use client";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { CounterScreen } from "./_components/counter-screen";

export default function RestaurantCounterPage() {
  const { me } = useDashboard();
  if (!hasPermission(me?.permissions, Permission.SalesSell)) {
    return (
      <DashboardAccessDenied
        title="Counter"
        description="You need permission to sell to take orders here."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }
  return <CounterScreen canManageMenu={hasPermission(me?.permissions, Permission.RestaurantMenuManage)} />;
}
