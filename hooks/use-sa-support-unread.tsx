"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { APP_ROUTES } from "@/lib/config";
import { getSuperAdminRealtimeClient } from "@/lib/realtime";
import { fetchSaSupportUnreadCount } from "@/lib/super-admin-api";

let saListenerSeq = 0;

/**
 * Live unread count for the super-admin support inbox.
 *
 * Baselines from the server once, increments on realtime tenant messages while
 * the admin is elsewhere in the console, and reconciles when the inbox is
 * opened, read receipts arrive, or the window regains focus.
 */
export function useSaSupportUnread(): number {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const baselinedRef = useRef(false);
  const listenerIdRef = useRef(`sa-support-unread-${saListenerSeq++}`);

  const syncFromServer = useCallback(() => {
    fetchSaSupportUnreadCount()
      .then((count) => setUnread(count))
      .catch(() => {
        // Offline — keep the current count; the realtime stream still updates it.
      });
  }, []);

  useEffect(() => {
    if (baselinedRef.current) return;
    baselinedRef.current = true;
    syncFromServer();
  }, [syncFromServer]);

  useEffect(() => {
    if (pathname === APP_ROUTES.superAdminSupport) {
      // Opening the inbox reads the thread — reconcile from the server.
      syncFromServer();
      return;
    }
    const client = getSuperAdminRealtimeClient();
    const unregister = client.registerListener(listenerIdRef.current, {
      channels: ["support"],
      onSupportMessage: (frame) => {
        const data = frame.data as Record<string, unknown>;
        if (String(data.senderType ?? "") !== "TENANT") return;
        if (pathname === APP_ROUTES.superAdminSupport) return;
        setUnread((n) => n + 1);
      },
      onSupportRead: (frame) => {
        // The admin side read somewhere — the unread total dropped.
        if (String((frame.data as Record<string, unknown>).readerType ?? "") === "SUPER_ADMIN") {
          syncFromServer();
        }
      },
      onSupportConversation: () => syncFromServer(),
    });
    return unregister;
  }, [pathname, syncFromServer]);

  // Reconcile when the window regains focus (long-lived console sessions).
  useEffect(() => {
    const onFocus = () => syncFromServer();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [syncFromServer]);

  return unread;
}
