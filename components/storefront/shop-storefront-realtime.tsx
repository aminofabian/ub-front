"use client";

import { useEffect, useRef } from "react";

import { DashboardToaster } from "@/components/dashboard-sonner";
import { showPriceChangedToast } from "@/components/price-changed-toast";
import type { BrandingRecord } from "@/lib/api";
import { getSessionTokens } from "@/lib/auth";
import { getRealtimeClient } from "@/lib/realtime";
import { notifyStorefrontPriceRefresh } from "@/lib/storefront-price-events";

export function ShopStorefrontRealtime({
  currency = "KES",
  branding = null,
}: {
  currency?: string;
  branding?: BrandingRecord | null;
}) {
  const currencyRef = useRef(currency);
  const brandingRef = useRef(branding);
  currencyRef.current = currency;
  brandingRef.current = branding;

  useEffect(() => {
    if (!getSessionTokens()) {
      return;
    }

    const client = getRealtimeClient();
    const unregister = client.registerListener("storefront", {
      channels: ["pos"],
      onPriceChanged: (frame) => {
        const rawItemId = frame.data.itemId;
        const itemId =
          typeof rawItemId === "string" && rawItemId.trim().length > 0
            ? rawItemId.trim()
            : undefined;
        notifyStorefrontPriceRefresh(itemId ? [itemId] : undefined);
        showPriceChangedToast(
          frame,
          currencyRef.current,
          brandingRef.current,
        );
      },
    });

    client.connect().catch(() => {
      // REST polling fallback is automatic
    });

    return unregister;
  }, []);

  return <DashboardToaster />;
}
