"use client";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { FloorBoard } from "./_components/floor-board";

export default function FloorPage() {
  const { me } = useDashboard();
  if (!hasPermission(me?.permissions, Permission.SalesSell)) {
    return (
      <DashboardAccessDenied
        title="Floor"
        description="You need permission to sell to run the queue."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }
  return <FloorBoard />;
}
