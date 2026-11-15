"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps a restaurant screen current: runs `refresh` on a timer, when the tab comes back to the
 * front, and when the connection returns.
 *
 * The server also sends `kitchen.updated` and `menu.updated` frames, but nothing listens for
 * them yet: a kitchen-only sign-in is not allowed on that channel and a screen that has slept
 * misses frames, so a timer is needed either way. Wiring the frames in would only shorten the
 * wait between polls.
 */
export function useRestaurantLive(refresh: () => void, everyMs: number, enabled = true): void {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) return;
    const run = () => refreshRef.current();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") run();
    }, everyMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", run);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", run);
    };
  }, [enabled, everyMs]);
}
