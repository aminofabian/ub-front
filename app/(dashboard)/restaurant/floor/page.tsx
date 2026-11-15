"use client";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { FloorScreen } from "./_components/floor-screen";

export default function RestaurantFloorPage() {
  const { me } = useDashboard();
  const canTakeOrders = hasPermission(me?.permissions, Permission.RestaurantOrdersWrite);
  const canTakeMoney = hasPermission(me?.permissions, Permission.SalesSell);
  if (!canTakeOrders && !canTakeMoney) {
    return (
      <DashboardAccessDenied
        title="Floor"
        description="You need permission to take orders or to sell to see the floor."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }
  return (
    <FloorScreen
      canTakeOrders={canTakeOrders}
      canTakeMoney={canTakeMoney}
      canCancelSent={hasPermission(me?.permissions, Permission.RestaurantOrdersVoidSent)}
      canComp={hasPermission(me?.permissions, Permission.RestaurantBillsComp)}
      canManage={hasPermission(me?.permissions, Permission.RestaurantMenuManage)}
    />
  );
}
