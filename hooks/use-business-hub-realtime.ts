"use client";

import { useEffect, useId, useRef } from "react";

import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";

const PULSE_REFETCH_DEBOUNCE_MS = 400;

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
};

function frameBranchId(frame: RealtimeFrame): string {
  return String(frame.data.branchId ?? "").trim();
}

/**
 * Invalidates Morning board metrics when sales, supplies, or shifts change.
 * WebSocket signal only — metrics still load via REST (no polling).
 */
export function useBusinessHubRealtime({
  branchId,
  enabled = true,
  onInvalidate,
  onLiveEvent,
  onSaleCompleted,
  onSupplyPosted,
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

    const client = getRealtimeClient();
    const unregister = client.registerListener(subscriptionId, {
      channels: ["pos"],
      onSaleCompleted: handleSaleCompleted,
      onSupplyPosted: handleSupplyPosted,
      onShiftOpened: scheduleInvalidate,
      onShiftClosed: scheduleInvalidate,
      onPaymentConfirmed: scheduleInvalidate,
    });

    return () => {
      stopped = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      unregister();
    };
  }, [enabled, subscriptionId]);
}
