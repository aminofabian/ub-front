"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import { getNotificationPresentation } from "@/lib/notification-display";
import { getSessionTokens } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";

const CASHIER_ALERT_TYPES = new Set([
  "storefront.order.placed",
  "storefront.order.paid",
]);

function playNewOrderChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    void ctx.close();
  } catch {
    // Audio not available — toast still shows
  }
}

function showCashierOrderToast(frame: RealtimeFrame) {
  const data = frame.data as Record<string, unknown>;
  const notificationType =
    typeof data.notificationType === "string" ? data.notificationType : "";
  if (!CASHIER_ALERT_TYPES.has(notificationType)) {
    return;
  }
  const presentation = getNotificationPresentation(data);
  const isNewOrder = notificationType === "storefront.order.placed";
  if (isNewOrder) {
    playNewOrderChime();
  }
  toast.info(presentation.title || (isNewOrder ? "New web order" : "Order update"), {
    description: presentation.body || "Check online orders for details.",
    duration: isNewOrder ? 20_000 : 12_000,
    action: {
      label: "View orders",
      onClick: () => {
        window.location.href = APP_ROUTES.storefrontWebOrders;
      },
    },
  });
}

/**
 * Real-time alerts for cashiers: new/paid web orders with optional chime.
 */
export function CashierOrderAlerts() {
  const dash = useOptionalDashboard();
  const canRead = hasPermission(
    dash?.me?.permissions,
    Permission.ReportsNotificationsRead,
  );
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!canRead || !getSessionTokens()) {
      return;
    }

    const client = getRealtimeClient();
    const unregister = client.registerListener("cashier-orders", {
      channels: ["notifications"],
      onNotification: (frame) => {
        if (frame.type !== "notification.created") {
          return;
        }
        const id = frame.eventId || "";
        if (id && seenRef.current.has(id)) {
          return;
        }
        if (id) {
          seenRef.current.add(id);
        }
        showCashierOrderToast(frame);
      },
    });

    client.connect().catch(() => {
      // polling fallback
    });

    return unregister;
  }, [canRead]);

  return null;
}
