"use client";

import { useEffect, useId, useRef } from "react";

import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";

/**
 * Keeps a store room that follows inventory honest: every completed sale moves
 * stock, so reload the counts when the till reports one.
 *
 * Only live frames count. Poll-delivered frames replay history, and refreshing on
 * a replayed sale would churn the list for no reason.
 */
export function useStoreRoomRealtime({
  enabled,
  onInventoryMoved,
}: {
  enabled: boolean;
  onInventoryMoved: () => void;
}) {
  const subscriptionId = useId();
  const handlerRef = useRef(onInventoryMoved);
  handlerRef.current = onInventoryMoved;

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Sales land in bursts — a basket, then sometimes a void. One reload per burst.
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        if (!stopped) handlerRef.current();
      }, 400);
    };

    const client = getRealtimeClient();
    const unregister = client.registerListener(subscriptionId, {
      channels: ["pos"],
      onSaleCompleted: (frame: RealtimeFrame) => {
        if (frame.delivery === "poll") return;
        schedule();
      },
      onStockDepleted: (frame: RealtimeFrame) => {
        if (frame.delivery === "poll") return;
        schedule();
      },
    });

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      unregister();
    };
  }, [enabled, subscriptionId]);
}
