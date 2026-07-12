"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import { getNotificationPresentation } from "@/lib/notification-display";
import { getSessionTokens } from "@/lib/auth";
import { fetchWebOrderDetail } from "@/lib/api";
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
/** Only auto-print tickets for orders placed within this window. */
const PRINT_MAX_AGE_MS = 60 * 60 * 1000;

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

function parseTimestampMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === "string" && value.trim()) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
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

function unmarkWebOrderPrinted(orderId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PRINT_DONE_PREFIX + orderId);
  } catch {
    // ignore
  }
}

function orderPlacedAtMs(frame: RealtimeFrame, data: Record<string, unknown>): number | null {
  const nested =
    data.payload && typeof data.payload === "object" && !Array.isArray(data.payload)
      ? (data.payload as Record<string, unknown>)
      : null;
  const candidates: unknown[] = [
    frame.at,
    data.createdAt,
    nested?.createdAt,
    nested?.placedAt,
    readPayloadField(data, "createdAt"),
    readPayloadField(data, "placedAt"),
  ];
  for (const raw of candidates) {
    const ms = parseTimestampMs(raw);
    if (ms != null) return ms;
  }
  return null;
}

async function resolveOrderPlacedAtMs(
  frame: RealtimeFrame,
  data: Record<string, unknown>,
  orderId: string,
): Promise<number | null> {
  const fromFrame = orderPlacedAtMs(frame, data);
  if (fromFrame != null) return fromFrame;
  try {
    const detail = await fetchWebOrderDetail(orderId);
    return parseTimestampMs(detail.createdAt);
  } catch {
    return null;
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

  // Never reprint an order this till already printed / suppressed.
  if (alreadyPrintedWebOrder(orderId)) return;

  const placedAt = await resolveOrderPlacedAtMs(frame, data, orderId);
  // Fail closed: no timestamp, or older than 1 hour → suppress forever (no print).
  if (placedAt == null || Date.now() - placedAt > PRINT_MAX_AGE_MS) {
    markWebOrderPrinted(orderId);
    return;
  }

  // Claim before awaiting the printer so concurrent tabs don't double-print.
  markWebOrderPrinted(orderId);

  const ok = await printWebOrderReceipt(
    orderId,
    DESKTOP_THERMAL_WIDTH_MM,
    { branchId: orderBranchId || bid || null },
    { quiet: true },
  );
  if (!ok) {
    // Retry later only while the order is still inside the 1-hour window.
    if (Date.now() - placedAt <= PRINT_MAX_AGE_MS) {
      unmarkWebOrderPrinted(orderId);
    }
  }
}

/**
 * Real-time alerts for cashiers: new/paid web orders with optional chime.
 * On order placed, auto-prints a pickup ticket when the till printer is ready.
 * Only prints orders younger than 1 hour, and only once per order on this device.
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
