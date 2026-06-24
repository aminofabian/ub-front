"use client";

import { useEffect, useId, useRef } from "react";

import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";

type PosEventHandlers = {
  onStockDepleted?: (frame: RealtimeFrame) => void;
  onPriceChanged?: (frame: RealtimeFrame) => void;
  onPaymentConfirmed?: (frame: RealtimeFrame) => void;
};

/**
 * Subscribe to POS realtime frames on the shared authenticated socket.
 */
export function usePosEvents(handlers: PosEventHandlers) {
  const subscriptionId = useId();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let stopped = false;
    const client = getRealtimeClient();
    const unregister = client.registerListener(subscriptionId, {
      channels: ["pos"],
      onStockDepleted: (frame) => {
        if (!stopped) handlersRef.current.onStockDepleted?.(frame);
      },
      onPriceChanged: (frame) => {
        if (!stopped) handlersRef.current.onPriceChanged?.(frame);
      },
      onPaymentConfirmed: (frame) => {
        if (!stopped) handlersRef.current.onPaymentConfirmed?.(frame);
      },
    });

    return () => {
      stopped = true;
      unregister();
    };
  }, [subscriptionId]);
}
