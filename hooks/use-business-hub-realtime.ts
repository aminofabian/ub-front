"use client";

import { useEffect, useId, useRef } from "react";

import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";

const PULSE_REFETCH_DEBOUNCE_MS = 400;

const STOREFRONT_ORDER_TYPES = new Set([
  "storefront.order.placed",
  "storefront.order.paid",
]);

type BusinessHubRealtimeOptions = {
  /** Selected hub branch; empty = all branches. */
  branchId: string;
  enabled?: boolean;
  onInvalidate: () => void;
  /** Fires when a websocket event schedules a hub refresh. */
  onLiveEvent?: () => void;
  /** Fires only for sale.completed (after branch filter). */
  onSaleCompleted?: () => void;
  /** Fires only for supply.posted (after branch filter). */
  onSupplyPosted?: () => void;
  /** Fires for live storefront.order.placed / .paid notifications. */
  onWebOrderEvent?: () => void;
};

function frameBranchId(frame: RealtimeFrame): string {
  const data = frame.data;
  const direct = String(data.branchId ?? "").trim();
  if (direct) return direct;
  const nested =
    data.payload && typeof data.payload === "object" && !Array.isArray(data.payload)
      ? (data.payload as Record<string, unknown>)
      : null;
  return String(nested?.branchId ?? "").trim();
}

function notificationType(frame: RealtimeFrame): string {
  const data = frame.data as Record<string, unknown>;
  return typeof data.notificationType === "string"
    ? data.notificationType
    : "";
}

/**
 * Invalidates Morning board metrics when sales, supplies, shifts, or web orders change.
 * WebSocket signal only — metrics still load via REST (no polling).
 */
export function useBusinessHubRealtime({
  branchId,
  enabled = true,
  onInvalidate,
  onLiveEvent,
  onSaleCompleted,
  onSupplyPosted,
  onWebOrderEvent,
}: BusinessHubRealtimeOptions) {
  const subscriptionId = useId();
  const onInvalidateRef = useRef(onInvalidate);
  onInvalidateRef.current = onInvalidate;
  const onLiveEventRef = useRef(onLiveEvent);
  onLiveEventRef.current = onLiveEvent;
  const onSaleCompletedRef = useRef(onSaleCompleted);
  onSaleCompletedRef.current = onSaleCompleted;
  const onSupplyPostedRef = useRef(onSupplyPosted);
  onSupplyPostedRef.current = onSupplyPosted;
  const onWebOrderEventRef = useRef(onWebOrderEvent);
  onWebOrderEventRef.current = onWebOrderEvent;
  const branchIdRef = useRef(branchId);
  branchIdRef.current = branchId;

  useEffect(() => {
    if (!enabled) return;

    let stopped = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const matchesBranch = (frame: RealtimeFrame) => {
      const scope = branchIdRef.current.trim();
      const eventBranch = frameBranchId(frame);
      return !(scope && eventBranch && scope !== eventBranch);
    };

    const scheduleInvalidate = (frame: RealtimeFrame) => {
      if (stopped || !matchesBranch(frame)) return;

      onLiveEventRef.current?.();

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (!stopped) onInvalidateRef.current();
      }, PULSE_REFETCH_DEBOUNCE_MS);
    };

    const handleSaleCompleted = (frame: RealtimeFrame) => {
      if (stopped || !matchesBranch(frame)) return;
      onSaleCompletedRef.current?.();
      scheduleInvalidate(frame);
    };

    const handleSupplyPosted = (frame: RealtimeFrame) => {
      if (stopped || !matchesBranch(frame)) return;
      onSupplyPostedRef.current?.();
      scheduleInvalidate(frame);
    };

    const handleNotification = (frame: RealtimeFrame) => {
      if (stopped || frame.type !== "notification.created") return;
      // Inbox catch-up must not flash the hub for historical orders.
      if (frame.delivery === "poll") return;
      if (!STOREFRONT_ORDER_TYPES.has(notificationType(frame))) return;
      if (!matchesBranch(frame)) return;
      onWebOrderEventRef.current?.();
      scheduleInvalidate(frame);
    };

    const client = getRealtimeClient();
    const unregister = client.registerListener(subscriptionId, {
      channels: ["pos", "notifications"],
      onSaleCompleted: handleSaleCompleted,
      onSupplyPosted: handleSupplyPosted,
      onShiftOpened: scheduleInvalidate,
      onShiftClosed: scheduleInvalidate,
      onPaymentConfirmed: scheduleInvalidate,
      onNotification: handleNotification,
    });

    return () => {
      stopped = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      unregister();
    };
  }, [enabled, subscriptionId]);
}
