"use client";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { AppointmentsWorkspace } from "./_components/appointments-workspace";

export default function ServiceAppointmentsPage() {
  const { me } = useDashboard();
  if (!hasPermission(me?.permissions, Permission.SalesSell)) {
    return (
      <DashboardAccessDenied
        title="Bookings"
        description="You need permission to sell to manage bookings."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }
  return <AppointmentsWorkspace />;
}
