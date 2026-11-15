"use client";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { MenuQrStudio } from "./_components/menu-qr-studio";

/**
 * QR codes to print. A table's code is the key to ordering from that table, so only those who
 * may already see the tables' codes on the floor (the menu's managers) can print them.
 */
export default function RestaurantMenuQrPage() {
  const { me } = useDashboard();
  const canManage = hasPermission(me?.permissions, Permission.RestaurantMenuManage);
  if (!canManage) {
    return (
      <DashboardAccessDenied
        title="QR codes"
        description="You need permission to manage the menu to print QR codes."
        backHref={APP_ROUTES.restaurantMenu}
        backLabel="Menu"
      />
    );
  }
  return <MenuQrStudio canManage={canManage} />;
}
