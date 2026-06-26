"use client";

import { useEffect, useRef } from "react";

import {
  subscribeTenantCatalogBroadcast,
  subscribeTenantCatalogChanged,
} from "@/lib/tenant-catalog-events";

export const GLOBAL_CATALOG_TENANT_SYNC_POLL_MS = 45_000;
export const GLOBAL_CATALOG_TENANT_SYNC_DEBOUNCE_MS = 450;

export function useGlobalCatalogTenantSync({
  enabled = true,
  onSync,
  pollMs = GLOBAL_CATALOG_TENANT_SYNC_POLL_MS,
  debounceMs = GLOBAL_CATALOG_TENANT_SYNC_DEBOUNCE_MS,
}: {
  enabled?: boolean;
  onSync: () => void | Promise<void>;
  pollMs?: number;
  debounceMs?: number;
}): void {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let debounceTimer: number | undefined;

    const runSync = () => {
      if (cancelled) return;
      void onSyncRef.current();
    };

    const scheduleSync = () => {
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(runSync, debounceMs);
    };

    const unsubLocal = subscribeTenantCatalogChanged(scheduleSync);
    const unsubBroadcast = subscribeTenantCatalogBroadcast(scheduleSync);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        scheduleSync();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        scheduleSync();
      }
    }, pollMs);

    return () => {
      cancelled = true;
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
      }
      unsubLocal();
      unsubBroadcast();
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(pollTimer);
    };
  }, [enabled, pollMs, debounceMs]);
}
