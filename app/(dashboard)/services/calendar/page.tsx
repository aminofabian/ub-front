"use client";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { CalendarWorkspace } from "./_components/calendar-workspace";

export default function ServiceCalendarPage() {
  const { me } = useDashboard();
  if (!hasPermission(me?.permissions, Permission.SalesSell)) {
    return (
      <DashboardAccessDenied
        title="Calendar"
        description="You need permission to sell to see the calendar."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }
  return <CalendarWorkspace canManageTeam={hasPermission(me?.permissions, Permission.StaffHrUpdate)} />;
}
