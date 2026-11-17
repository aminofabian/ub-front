"use client";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { FrontDeskScreen } from "./_components/front-desk-screen";

/**
 * The front desk of a guest house (ADR 0028). A lodging tenant is a bar or restaurant that also
 * lets a few rooms, so the front desk reuses the restaurant permissions: managing rooms is a
 * manager's job like the menu; serving and taking money are the same permissions as the floor.
 */
export default function RoomsPage() {
  const { me } = useDashboard();
  const canManage = hasPermission(me?.permissions, Permission.RestaurantMenuManage);
  const canTakeOrders = hasPermission(me?.permissions, Permission.RestaurantOrdersWrite);
  const canTakeMoney = hasPermission(me?.permissions, Permission.SalesSell);
  if (!canManage && !canTakeOrders && !canTakeMoney) {
    return (
      <DashboardAccessDenied
        title="Front desk"
        description="You need permission to manage the shop, take orders or sell to see the rooms."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }
  // A stay's folio is the restaurant open-order sheet, which needs the same rights the floor uses.
  return (
    <FrontDeskScreen
      canManage={canManage}
      rights={{
        canTakeOrders,
        canTakeMoney,
        canCancelSent: hasPermission(me?.permissions, Permission.RestaurantOrdersVoidSent),
        canComp: hasPermission(me?.permissions, Permission.RestaurantBillsComp),
        canManage,
      }}
    />
  );
}
