"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { APP_ROUTES } from "@/lib/config";
import { getRealtimeClient } from "@/lib/realtime";
import {
  fetchStorefrontBuyerUnreadCount,
  fetchSupportUnreadCount,
} from "@/lib/support-api";

let supportListenerSeq = 0;

/**
 * Live unread count for the tenant's support thread.
 *
 * Baseline is fetched once; the count increments on realtime platform replies
 * while the user is elsewhere, and resets to zero when they open `/support`
 * (or when a read receipt confirms another tab marked the thread read).
 */
export function useSupportUnread(): number {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const baselinedRef = useRef(false);
  const listenerIdRef = useRef(`support-unread-${supportListenerSeq++}`);

  const syncFromServer = useCallback(() => {
    Promise.all([fetchSupportUnreadCount(), fetchStorefrontBuyerUnreadCount()])
      .then(([platform, storefront]) => setUnread(platform + storefront))
      .catch(() => {
        // Offline — keep the current count; the realtime stream still updates it.
      });
  }, []);

  useEffect(() => {
    if (baselinedRef.current) return;
    baselinedRef.current = true;
    syncFromServer();
  }, [syncFromServer]);

  // Keep the badge honest even when the socket is down.
  useEffect(() => {
    const timer = window.setInterval(syncFromServer, 15_000);
    return () => window.clearInterval(timer);
  }, [syncFromServer]);

  useEffect(() => {
    if (pathname === APP_ROUTES.support) {
      setUnread(0);
      return;
    }
    const client = getRealtimeClient();
    const unregister = client.registerListener(listenerIdRef.current, {
      channels: ["support"],
      onSupportMessage: (frame) => {
        const data = frame.data as Record<string, unknown>;
        const senderType = String(data.senderType ?? "");
        const conversationType = String(data.conversationType ?? "TENANT");
        // Platform replies to our thread (SUPER_ADMIN) plus new storefront
        // buyer messages (GUEST on STOREFRONT threads) both mean unread.
        const countsAsUnread =
          senderType === "SUPER_ADMIN" ||
          (senderType === "GUEST" && conversationType === "STOREFRONT");
        if (!countsAsUnread) return;
        if (pathname === APP_ROUTES.support) return;
        setUnread((n) => n + 1);
      },
      onSupportRead: (frame) => {
        const data = frame.data as Record<string, unknown>;
        // A read receipt for our side means some tab read the thread — reconcile.
        if (String(data.readerType ?? "") === "TENANT") {
          syncFromServer();
        }
      },
    });
    return unregister;
  }, [pathname, syncFromServer]);

  return unread;
}

/** Compact pill used inside nav rows. */
export function UnreadPill({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ${className ?? ""}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
