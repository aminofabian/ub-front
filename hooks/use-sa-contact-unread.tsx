"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { fetchSaContactMessageUnreadCount } from "@/lib/super-admin-api";

/**
 * Unread Talk to Us messages for the super-admin console.
 *
 * Contact-form messages have no realtime channel, so this is a focused poll
 * rather than another socket listener. It reconciles on navigation and on
 * window focus so the sidebar badge does not sit stale.
 */
export function useSaContactUnread(): number {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const baselinedRef = useRef(false);

  const refresh = useCallback(() => {
    fetchSaContactMessageUnreadCount()
      .then(setUnread)
      .catch(() => {
        // Keep the last known count; the next poll retries.
      });
  }, []);

  useEffect(() => {
    if (baselinedRef.current) return;
    baselinedRef.current = true;
    refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const timer = window.setInterval(refresh, 30_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return unread;
}
