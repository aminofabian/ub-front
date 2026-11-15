"use client";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { KitchenBoard } from "./_components/kitchen-board";

export default function RestaurantKitchenPage() {
  const { me } = useDashboard();
  const canWork = hasPermission(me?.permissions, Permission.RestaurantKitchenUpdate);
  // Someone at the counter may look at the board; only the kitchen changes it.
  if (!canWork && !hasPermission(me?.permissions, Permission.SalesSell)) {
    return (
      <DashboardAccessDenied
        title="Kitchen"
        description="You need kitchen or till permission to see what is being made."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }
  return <KitchenBoard canWork={canWork} />;
}
