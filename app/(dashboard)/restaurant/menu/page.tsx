"use client";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { MenuWorkspace } from "./_components/menu-workspace";

export default function RestaurantMenuPage() {
  const { me } = useDashboard();
  const canManage = hasPermission(me?.permissions, Permission.RestaurantMenuManage);
  const canMarkRunOut = canManage || hasPermission(me?.permissions, Permission.RestaurantKitchenUpdate);
  if (!canMarkRunOut && !hasPermission(me?.permissions, Permission.SalesSell)) {
    return (
      <DashboardAccessDenied
        title="Menu"
        description="You need permission to sell, to work the kitchen or to manage the menu to see this page."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }
  return <MenuWorkspace canManage={canManage} canMarkRunOut={canMarkRunOut} />;
}
