"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { APP_ROUTES } from "@/lib/config";
import { getSuperAdminRealtimeClient } from "@/lib/realtime";
import { fetchSaSupportUnreadCount } from "@/lib/super-admin-api";
import { playSupportMessageSound, unlockSupportAudio } from "@/lib/support-sound";

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
  const lastChimeRef = useRef<string | null>(null);

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

  // Unlock WebAudio on the first gesture so chimes work anywhere in the console.
  useEffect(() => {
    const unlock = () => unlockSupportAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (pathname === APP_ROUTES.superAdminSupport) {
      // Opening the inbox reads the thread — reconcile from the server.
      // The inbox page owns the chime while you're there.
      syncFromServer();
      return;
    }
    const client = getSuperAdminRealtimeClient();
    const unregister = client.registerListener(listenerIdRef.current, {
      channels: ["support"],
      onSupportMessage: (frame) => {
        const data = frame.data as Record<string, unknown>;
        const senderType = String(data.senderType ?? "");
        const conversationType = String(data.conversationType ?? "TENANT");
        // Tenant threads arrive from TENANT; visitor threads (kiosk.ke guests)
        // arrive from GUEST. Storefront buyer chats belong to the tenant's staff.
        if (conversationType === "STOREFRONT") return;
        const countsAsUnread =
          senderType === "TENANT" ||
          (senderType === "GUEST" && conversationType === "VISITOR");
        if (!countsAsUnread) return;
        if (pathname === APP_ROUTES.superAdminSupport) return;
        const messageId = String(data.messageId ?? "");
        if (messageId && lastChimeRef.current !== messageId) {
          lastChimeRef.current = messageId;
          playSupportMessageSound();
        }
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

  // Keep the badge honest even when the socket is down.
  useEffect(() => {
    const timer = window.setInterval(syncFromServer, 15_000);
    return () => window.clearInterval(timer);
  }, [syncFromServer]);

  // Reconcile when the window regains focus (long-lived console sessions).
  useEffect(() => {
    const onFocus = () => syncFromServer();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [syncFromServer]);

  return unread;
}
