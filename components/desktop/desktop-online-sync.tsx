"use client";

import { useEffect, useRef } from "react";

import { runDesktopSyncFlush } from "@/lib/desktop-api";
import { IS_DESKTOP } from "@/lib/runtime";

/** Don't hammer the backend when the connection flaps. */
const MIN_GAP_MS = 10_000;

/**
 * Desktop only: when the browser reports the till is back online (or the
 * window is focused again after being hidden), ask the backend for an
 * incremental sync right away. The scheduler still runs every 2 minutes;
 * this just removes the wait the cashier notices.
 */
export function DesktopOnlineSync() {
  const lastRun = useRef(0);

  useEffect(() => {
    if (!IS_DESKTOP || typeof window === "undefined") return;

    const kick = () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      const now = Date.now();
      if (now - lastRun.current < MIN_GAP_MS) return;
      lastRun.current = now;
      void runDesktopSyncFlush().catch(() => {
        // Offline or backend busy — the scheduled flush covers it.
      });
    };

    const onVisible = () => {
      if (!document.hidden) kick();
    };

    window.addEventListener("online", kick);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", kick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
