"use client";

import { useCallback, useMemo, useState } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { updateBusiness } from "@/lib/api";

const MAX_FEATURED = 12;

export function useStorefrontFeatured(setMessage: (message: string) => void) {
  const { business, refreshSession, canManageBusinessSettings } =
    useDashboard();
  const [busy, setBusy] = useState(false);

  const featuredIds = useMemo(
    () => business?.storefront?.featuredItemIds ?? [],
    [business?.storefront?.featuredItemIds],
  );

  const isFeatured = useCallback(
    (itemId: string) => featuredIds.includes(itemId),
    [featuredIds],
  );

  const toggleFeatured = useCallback(
    async (itemId: string) => {
      if (!canManageBusinessSettings || !itemId.trim()) {
        return;
      }

      const currentlyFeatured = featuredIds.includes(itemId);
      if (!currentlyFeatured && featuredIds.length >= MAX_FEATURED) {
        setMessage(
          `Featured list is full (max ${MAX_FEATURED}). Remove one in Business settings first.`,
        );
        return;
      }

      const next = currentlyFeatured
        ? featuredIds.filter((id) => id !== itemId)
        : [itemId, ...featuredIds.filter((id) => id !== itemId)];

      setBusy(true);
      setMessage("");
      try {
        await updateBusiness({
          storefront: { featuredItemIds: next },
        });
        await refreshSession();
        setMessage(
          currentlyFeatured
            ? "Removed from storefront featured."
            : "Added to storefront featured.",
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not update featured products.",
        );
      } finally {
        setBusy(false);
      }
    },
    [canManageBusinessSettings, featuredIds, refreshSession, setMessage],
  );

  return {
    featuredIds,
    isFeatured,
    toggleFeatured,
    featuredBusy: busy,
    canManageFeatured: canManageBusinessSettings,
    featuredAtCapacity: featuredIds.length >= MAX_FEATURED,
  };
}
