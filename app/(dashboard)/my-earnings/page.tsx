"use client";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { MyEarningsWorkspace } from "./_components/my-earnings-workspace";

export default function MyEarningsPage() {
  const { me } = useDashboard();
  const permissions = me?.permissions;
  if (
    !hasPermission(permissions, Permission.CommissionsReadOwn) &&
    !hasPermission(permissions, Permission.CommissionsRead)
  ) {
    return (
      <DashboardAccessDenied
        title="My earnings"
        description="Ask the owner to add you to the team so you can see what you earn."
        backHref={APP_ROUTES.myProfile}
        backLabel="My profile"
      />
    );
  }
  return <MyEarningsWorkspace />;
}
