"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import { getNotificationPresentation } from "@/lib/notification-display";
import { getSessionTokens } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import {
  DESKTOP_THERMAL_WIDTH_MM,
  printWebOrderReceipt,
} from "@/lib/desktop-print";
import { hasPermission, Permission } from "@/lib/permissions";
import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";
import { playCashierChime } from "@/lib/cashier-chime";

const CASHIER_ALERT_TYPES = new Set([
  "storefront.order.placed",
  "storefront.order.paid",
]);

const PRINT_CLAIM_PREFIX = "palmart.web-order-print:";
const PRINT_CLAIM_TTL_MS = 120_000;

function readPayloadField(
  data: Record<string, unknown>,
  key: string,
): string {
  const nested =
    data.payload && typeof data.payload === "object" && !Array.isArray(data.payload)
      ? (data.payload as Record<string, unknown>)
      : null;
  const fromNested = nested?.[key];
  if (typeof fromNested === "string" && fromNested.trim()) {
    return fromNested.trim();
  }
  const direct = data[key];
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }
  return "";
}

/** First cashier tab on this machine wins — avoids duplicate prints from one browser profile. */
function claimWebOrderPrint(orderId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = PRINT_CLAIM_PREFIX + orderId;
    const now = Date.now();
    const existing = window.localStorage.getItem(key);
    if (existing) {
      const claimedAt = Number(existing);
      if (Number.isFinite(claimedAt) && now - claimedAt < PRINT_CLAIM_TTL_MS) {
        return false;
      }
    }
    window.localStorage.setItem(key, String(now));
    return true;
  } catch {
    return true;
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
    playCashierChime("order");
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

async function autoPrintPlacedOrder(
  frame: RealtimeFrame,
  cashierBranchId: string | undefined,
  canSell: boolean,
) {
  if (!canSell) return;
  const data = frame.data as Record<string, unknown>;
  const notificationType =
    typeof data.notificationType === "string" ? data.notificationType : "";
  if (notificationType !== "storefront.order.placed") return;

  const orderId = readPayloadField(data, "orderId");
  const orderBranchId = readPayloadField(data, "branchId");
  if (!orderId) return;

  const bid = cashierBranchId?.trim();
  if (bid && orderBranchId && bid !== orderBranchId) {
    // Another branch's catalog — don't print on this till.
    return;
  }

  if (!claimWebOrderPrint(orderId)) return;

  await printWebOrderReceipt(
    orderId,
    DESKTOP_THERMAL_WIDTH_MM,
    { branchId: orderBranchId || bid || null },
    { quiet: true },
  );
}

/**
 * Real-time alerts for cashiers: new/paid web orders with optional chime.
 * On order placed, auto-prints a pickup ticket when the till printer is ready.
 */
export function CashierOrderAlerts() {
  const dash = useOptionalDashboard();
  const canRead = hasPermission(
    dash?.me?.permissions,
    Permission.ReportsNotificationsRead,
  );
  const canSell = hasPermission(dash?.me?.permissions, Permission.SalesSell);
  const branchId = dash?.branchId;
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
        void autoPrintPlacedOrder(frame, branchId, canSell);
      },
    });

    client.connect().catch(() => {
      // polling fallback
    });

    return unregister;
  }, [canRead, canSell, branchId]);

  return null;
}
