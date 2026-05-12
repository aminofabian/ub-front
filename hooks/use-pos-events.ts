"use client";

import { useEffect, useRef } from "react";

import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";

type PosEventHandlers = {
  onStockDepleted?: (frame: RealtimeFrame) => void;
  onPriceChanged?: (frame: RealtimeFrame) => void;
  onPaymentConfirmed?: (frame: RealtimeFrame) => void;
};

/**
 * Hook for the POS screen to subscribe to real-time POS events.
 * Connects to the "pos" channel and dispatches events to handlers.
 */
export function usePosEvents(handlers: PosEventHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let stopped = false;

    const client = getRealtimeClient({
      channels: ["notifications", "pos"],
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

    client.connect().catch(() => {});

    return () => {
      stopped = true;
    };
  }, []);
}
