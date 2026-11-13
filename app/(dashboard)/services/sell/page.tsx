"use client";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { ServiceCheckout } from "./_components/service-checkout";

export default function SellServicePage() {
  const { me } = useDashboard();
  if (!hasPermission(me?.permissions, Permission.SalesSell)) {
    return (
      <DashboardAccessDenied
        title="Ring a service"
        description="You need permission to sell to use this page."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }
  return <ServiceCheckout />;
}
