"use client";

import { useState } from "react";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

import { ServiceCheckout } from "./_components/service-checkout";
import { VisitWorkspace } from "./_components/visit-workspace";

export default function SellServicePage() {
  const { me } = useDashboard();
  // The quick ring posts a sale straight away and queues it when offline; the visit workspace
  // needs a connection. Both stay, one tap apart.
  const [quick, setQuick] = useState(false);
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
  if (quick) {
    return (
      <>
        <p className="mx-auto mb-2 w-full max-w-[1400px] px-3 text-sm">
          Quick ring: one sale, no visit. It also works without a connection.{" "}
          <button type="button" className="underline" onClick={() => setQuick(false)}>
            Back to visits
          </button>
        </p>
        <ServiceCheckout />
      </>
    );
  }
  return (
    <VisitWorkspace
      canSeeEarnings={hasPermission(me?.permissions, Permission.CommissionsRead)}
      canSetAmounts={
        hasPermission(me?.permissions, Permission.CommissionsPlansManage) ||
        hasPermission(me?.permissions, Permission.CommissionsAdjust)
      }
      canManage={hasPermission(me?.permissions, Permission.ServicesCatalogManage)}
      onQuickRing={() => setQuick(true)}
    />
  );
}
