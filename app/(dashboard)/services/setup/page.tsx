"use client";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { ServiceSetupWizard } from "./_components/service-setup-wizard";

export default function ServiceSetupPage() {
  const { me } = useDashboard();
  const permissions = me?.permissions;
  const allowed =
    hasPermission(permissions, Permission.ServicesCatalogManage) &&
    hasPermission(permissions, Permission.StaffHrUpdate) &&
    hasPermission(permissions, Permission.CommissionsPlansManage);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Set up your shop"
        description="Only the owner or an admin can set up chairs, the team, services and pay."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }
  return <ServiceSetupWizard />;
}
