"use client";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { CommissionsWorkspace } from "./_components/commissions-workspace";

export default function CommissionsPage() {
  const { me } = useDashboard();
  const permissions = me?.permissions;

  if (!hasPermission(permissions, Permission.CommissionsRead)) {
    return (
      <DashboardAccessDenied
        title="Commissions"
        description="Staff earnings are private. Ask the owner if you need to see them."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }

  return (
    <CommissionsWorkspace
      canPay={hasPermission(permissions, Permission.CommissionsPayout)}
      canAdjust={hasPermission(permissions, Permission.CommissionsAdjust)}
      canManagePlans={hasPermission(permissions, Permission.CommissionsPlansManage)}
      canAddStaff={hasPermission(permissions, Permission.StaffHrUpdate)}
    />
  );
}
