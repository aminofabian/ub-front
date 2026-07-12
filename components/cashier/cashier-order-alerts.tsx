"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import { getNotificationPresentation } from "@/lib/notification-display";
import { getSessionTokens } from "@/lib/auth";
import { claimWebOrderPickupTicket } from "@/lib/api";
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

const PRINT_DONE_PREFIX = "palmart.web-order-printed:";

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

function stableNotificationKey(frame: RealtimeFrame, data: Record<string, unknown>): string {
  const orderId = readPayloadField(data, "orderId");
  if (orderId) return `order:${orderId}:${String(data.notificationType ?? "")}`;
  const notifId =
    (typeof data.id === "string" && data.id.trim()) ||
    frame.eventId?.trim() ||
    "";
  return notifId ? `notif:${notifId}` : "";
}

function alreadyPrintedWebOrder(orderId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage.getItem(PRINT_DONE_PREFIX + orderId));
  } catch {
    return false;
  }
}

function markWebOrderPrinted(orderId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRINT_DONE_PREFIX + orderId, String(Date.now()));
  } catch {
    // ignore quota / private mode
  }
}

function showCashierOrderToast(frame: RealtimeFrame) {
  const data = frame.data as Record<string, unknown>;
  const notificationType =
    typeof data.notificationType === "string" ? data.notificationType : "";
  if (!CASHIER_ALERT_TYPES.has(notificationType)) {
    return;
  }
  // Inbox catch-up/poll must not spam the till with historical toasts.
  if (frame.delivery === "poll") {
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

/**
 * Auto-print pickup tickets for brand-new storefront orders only.
 *
 * Hard gates (all must pass):
 * 1. Live WebSocket delivery — never REST poll / inbox replay
 * 2. Local once-per-order mark
 * 3. Server atomic claim — rejects already-printed and orders older than 1 hour
 */
async function autoPrintPlacedOrder(
  frame: RealtimeFrame,
  cashierBranchId: string | undefined,
  canSell: boolean,
) {
  if (!canSell) return;
  // CRITICAL: REST poll synthesizes historical notification.created frames.
  // Those must never drive the printer.
  if (frame.delivery === "poll") return;

  const data = frame.data as Record<string, unknown>;
  const notificationType =
    typeof data.notificationType === "string" ? data.notificationType : "";
  if (notificationType !== "storefront.order.placed") return;

  const orderId = readPayloadField(data, "orderId");
  const orderBranchId = readPayloadField(data, "branchId");
  if (!orderId) return;

  const bid = cashierBranchId?.trim();
  if (bid && orderBranchId && bid !== orderBranchId) {
    return;
  }

  if (alreadyPrintedWebOrder(orderId)) return;

  // Server is source of truth: only the first till that claims a <1h order prints.
  let claim;
  try {
    claim = await claimWebOrderPickupTicket(orderId);
  } catch {
    // Don't print on claim failure — avoids reprint storms when offline/auth flakes.
    return;
  }
  if (!claim.claimed) {
    // already_printed | too_old | not_found — suppress locally forever.
    markWebOrderPrinted(orderId);
    return;
  }

  markWebOrderPrinted(orderId);

  await printWebOrderReceipt(
    orderId,
    DESKTOP_THERMAL_WIDTH_MM,
    { branchId: orderBranchId || bid || null },
    { quiet: true },
  );
  // Do not unmark on print failure: the server claim already consumed the one-shot.
  // Manual reprint remains available via order detail / desktop print APIs.
}

/**
 * Real-time alerts for cashiers: new/paid web orders with optional chime.
 * Auto-prints pickup tickets only for live, recent, unprinted orders (server-gated).
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
        const data = frame.data as Record<string, unknown>;
        const key = stableNotificationKey(frame, data);
        if (key && seenRef.current.has(key)) {
          return;
        }
        if (key) {
          seenRef.current.add(key);
        }
        showCashierOrderToast(frame);
        void autoPrintPlacedOrder(frame, branchId, canSell);
      },
    });

    client.connect().catch(() => {
      // polling fallback (toasts/UI only — never auto-print)
    });

    return unregister;
  }, [canRead, canSell, branchId]);

  return null;
}
