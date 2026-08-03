"use client";

import { useEffect, useId, useRef } from "react";

import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";

export type PosDraftEventHandlers = {
  onCreated?: (frame: RealtimeFrame) => void;
  onUpdated?: (frame: RealtimeFrame) => void;
  onCancelled?: (frame: RealtimeFrame) => void;
  onCompleted?: (frame: RealtimeFrame) => void;
};

/**
 * Subscribe to POS draft realtime events on the shared authenticated socket.
 * Events arrive on the {@code pos_drafts} channel.
 */
export function usePosDraftEvents(handlers: PosDraftEventHandlers) {
  const subscriptionId = useId();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let stopped = false;
    const client = getRealtimeClient();
    const unregister = client.registerListener(subscriptionId, {
      channels: ["pos_drafts"],
      onPosDraftCreated: (frame) => {
        if (!stopped) handlersRef.current.onCreated?.(frame);
      },
      onPosDraftUpdated: (frame) => {
        if (!stopped) handlersRef.current.onUpdated?.(frame);
      },
      onPosDraftCancelled: (frame) => {
        if (!stopped) handlersRef.current.onCancelled?.(frame);
      },
      onPosDraftCompleted: (frame) => {
        if (!stopped) handlersRef.current.onCompleted?.(frame);
      },
    });

    return () => {
      stopped = true;
      unregister();
    };
  }, [subscriptionId]);
}
