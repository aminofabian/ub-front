"use client";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { MenuPrintStudio } from "./_components/menu-print-studio";

/** The menu as a sheet of paper. Anyone who can see the menu can print it; it changes nothing. */
export default function RestaurantMenuPrintPage() {
  const { me } = useDashboard();
  const canSee =
    hasPermission(me?.permissions, Permission.RestaurantMenuManage) ||
    hasPermission(me?.permissions, Permission.RestaurantKitchenUpdate) ||
    hasPermission(me?.permissions, Permission.SalesSell);
  if (!canSee) {
    return (
      <DashboardAccessDenied
        title="Print the menu"
        description="You need permission to sell, to work the kitchen or to manage the menu to see this page."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }
  return <MenuPrintStudio />;
}
