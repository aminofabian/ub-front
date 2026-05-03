"use client";

import { useSyncExternalStore } from "react";

import { getBrowserOnline, subscribeOnlineStatus } from "@/lib/browser-network";

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => subscribeOnlineStatus(() => onStoreChange()),
    getBrowserOnline,
    () => true,
  );
}
