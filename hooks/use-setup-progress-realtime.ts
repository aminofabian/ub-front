"use client";

import { useEffect, useId } from "react";

import { getRealtimeClient } from "@/lib/realtime";

const DEBOUNCE_MS = 300;

type Options = {
  enabled?: boolean;
  onInvalidate: () => void;
};

/**
 * Refetch setup progress when catalog, sales, supplies, or explicit WS events fire.
 */
export function useSetupProgressRealtime({ enabled = true, onInvalidate }: Options) {
  const subscriptionId = useId();

  useEffect(() => {
    if (!enabled) return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (stopped) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (!stopped) onInvalidate();
      }, DEBOUNCE_MS);
    };

    const client = getRealtimeClient();
    const unregister = client.registerListener(subscriptionId, {
      channels: ["notifications", "pos"],
      onSetupProgressUpdated: schedule,
      onSaleCompleted: schedule,
      onSupplyPosted: schedule,
    });

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      unregister();
    };
  }, [enabled, onInvalidate, subscriptionId]);
}
