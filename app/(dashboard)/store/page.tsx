"use client";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { StoreWorkspace } from "./_components/store-workspace";

export default function StorePage() {
  const { me } = useDashboard();
  const canWrite = hasPermission(me?.permissions, Permission.CatalogItemsWrite);

  if (!hasPermission(me?.permissions, Permission.CatalogItemsRead)) {
    return (
      <DashboardAccessDenied
        title="Store room"
        description={
          <>
            You need <code className="text-xs">catalog.items.read</code> to view
            this page.
          </>
        }
        backHref={APP_ROUTES.products}
        backLabel="Products"
      />
    );
  }

  return <StoreWorkspace canWrite={canWrite} />;
}
