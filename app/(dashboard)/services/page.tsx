"use client";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { ServicesWorkspace } from "./_components/services-workspace";

export default function ServicesPage() {
  const { me } = useDashboard();
  const canManage = hasPermission(me?.permissions, Permission.ServicesCatalogManage);
  const canRead = canManage || hasPermission(me?.permissions, Permission.SalesSell);

  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="Services"
        description="You need permission to sell or to manage services to see this page."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }

  return <ServicesWorkspace canManage={canManage} />;
}
