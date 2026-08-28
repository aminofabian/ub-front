"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import { useFeatureFlags } from "@/components/providers/tenant-provider";
import { updateBusiness } from "@/lib/api";
import {
  buildOnlineStorePatch,
  firstCatalogBranchId,
  withStorefrontEnabled,
} from "@/lib/online-store-toggle";

export function useOnlineStoreToggle() {
  const dashboard = useOptionalDashboard();
  const featureFlags = useFeatureFlags();
  const [saving, setSaving] = useState(false);

  const shopEnabled = featureFlags.shop !== false;
  const canToggle = Boolean(
    dashboard?.canManageBusinessSettings && shopEnabled && dashboard.business,
  );
  const enabled = Boolean(dashboard?.business?.storefront?.enabled);

  const setEnabled = useCallback(
    async (next: boolean) => {
      if (!dashboard?.business || saving) return;
      if (next === enabled) return;

      const catalogBranchId = firstCatalogBranchId(
        dashboard.branches,
        String(dashboard.business.storefront?.catalogBranchId ?? ""),
      );
      const built = buildOnlineStorePatch({ enabled: next, catalogBranchId });
      if (!built.ok) {
        toast.error("Add a branch first", {
          description: "The online store needs a branch for prices and stock.",
        });
        return;
      }

      const previous = dashboard.business;
      dashboard.patchLocalBusiness((current) =>
        withStorefrontEnabled(current, next, catalogBranchId),
      );
      setSaving(true);
      try {
        await updateBusiness({ storefront: built.payload });
        await dashboard.refreshSession();
        toast.success(
          next ? "Online store is on" : "Online store is off",
          {
            description: next
              ? "Customers can browse and order from your website."
              : "Your link now shows a landing page. Turn it back on anytime.",
          },
        );
      } catch (error) {
        dashboard.patchLocalBusiness(() => previous);
        toast.error("Could not update the online store", {
          description:
            error instanceof Error
              ? error.message
              : "Try again in a moment.",
        });
      } finally {
        setSaving(false);
      }
    },
    [dashboard, enabled, saving],
  );

  return {
    canToggle,
    enabled,
    saving,
    setEnabled,
  };
}
