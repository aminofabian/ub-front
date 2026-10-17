"use client";

import { Receipt } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { EasyTaxBranchSettingsSection } from "@/components/integrations/easytax-branch-settings-section";
import { EasyTaxSettingsSection } from "@/components/integrations/easytax-settings-section";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export default function EasyTaxSettingsPage() {
  const { me, branchId } = useDashboard();
  const canRead = hasPermission(
    me?.permissions,
    Permission.IntegrationsEasyTaxRead,
  );
  const canWrite = hasPermission(
    me?.permissions,
    Permission.IntegrationsEasyTaxWrite,
  );

  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="Tax (eTIMS)"
        description="You need permission to view the EasyTax / KRA eTIMS integration."
        backHref={APP_ROUTES.businessSettings}
        backLabel="Back to business settings"
      />
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-1.5")}>
      <DashboardPageHero
        icon={Receipt}
        eyebrow="Integrations"
        title="Tax (eTIMS)"
        description="Optional EasyTax (KRA eTIMS) tax integration. When it is on, your sales are reported to KRA for tax compliance. Off by default."
      />
      <EasyTaxSettingsSection canWrite={canWrite} />
      <EasyTaxBranchSettingsSection
        canWrite={canWrite}
        defaultBranchId={branchId || me?.branchId || null}
      />
    </div>
  );
}
