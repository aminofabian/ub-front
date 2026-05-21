"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { DashboardToaster } from "@/components/dashboard-sonner";
import { showPriceChangedToast } from "@/components/price-changed-toast";
import type { BrandingRecord } from "@/lib/api";
import { getNotificationPresentation } from "@/lib/notification-display";
import { APP_ROUTES } from "@/lib/config";
import { getSessionTokens } from "@/lib/auth";
import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";
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
      channels: ["pos", "notifications"],
      onNotification: (frame) => {
        if (frame.type === "notification.created") {
          showShopperNotificationToast(frame);
        }
      },
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

const SHOPPER_TOAST_TYPES = new Set([
  "credit_sale.reminder",
  "order.received",
  "order.payment_received",
]);

function showShopperNotificationToast(frame: RealtimeFrame) {
  const data = frame.data;
  const notificationType =
    typeof data.notificationType === "string" ? data.notificationType : "";
  if (!SHOPPER_TOAST_TYPES.has(notificationType)) {
    return;
  }
  const payload =
    data.payload && typeof data.payload === "object" && !Array.isArray(data.payload)
      ? (data.payload as Record<string, unknown>)
      : null;
  const presentation = getNotificationPresentation(
    data as Record<string, unknown>,
  );
  const body =
    presentation.body ||
    (notificationType === "credit_sale.reminder"
      ? "You have a new credit purchase on your tab."
      : "You have a new update.");
  const actionUrl =
    presentation.actionUrl ||
    (payload && typeof payload.paymentUrl === "string" ? payload.paymentUrl : "") ||
    APP_ROUTES.shopAccount;
  const actionLabel =
    notificationType === "credit_sale.reminder" ? "Pay tab" : "View account";
  toast.info(presentation.title || "Notification", {
    description: body,
    duration: 12_000,
    action: {
      label: actionLabel,
      onClick: () => {
        window.location.href = actionUrl;
      },
    },
  });
}
