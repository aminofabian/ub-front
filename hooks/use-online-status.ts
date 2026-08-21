"use client";

import { useSyncExternalStore } from "react";

import { getBrowserOnline, subscribeOnlineStatus } from "@/lib/browser-network";
import { IS_DESKTOP } from "@/lib/runtime";

export function useOnlineStatus(): boolean {
  const browserOnline = useSyncExternalStore(
    (onStoreChange) => subscribeOnlineStatus(() => onStoreChange()),
    getBrowserOnline,
    () => true,
  );
  // Desktop SKU: the page is served by the local backend (127.0.0.1), so the
  // till's API is reachable whenever the page is up. `navigator.onLine` is the
  // *internet* state and WebView2 can report false even on a working LAN, which
  // would block POS search, aisle browsing, and sale completion for no reason.
  return IS_DESKTOP ? true : browserOnline;
}
