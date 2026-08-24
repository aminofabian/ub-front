"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";
import { APP_ROUTES } from "@/lib/config";
import { useSupportUnread } from "@/hooks/use-support-unread";
import {
  playSupportMessageSound,
  unlockSupportAudio,
} from "@/lib/support-sound";

/**
 * Mounted inside the dashboard shell. Keeps the {@code support} channel open
 * on the shared realtime client and surfaces incoming platform replies as
 * toasts + a soft chime while the user is elsewhere in the app. The unread
 * count is also mirrored into the document title — visible in the browser tab
 * and the desktop SKU's taskbar.
 */
export function SupportUnreadWatcher() {
  const pathname = usePathname();
  const unread = useSupportUnread();
  const lastToastRef = useRef<string | null>(null);
  const baseTitleRef = useRef("");

  useEffect(() => {
    baseTitleRef.current = document.title;
  }, []);

  // Live unread count in the title: "(2) Shop Admin — Kiosk" while unread.
  useEffect(() => {
    if (!baseTitleRef.current) baseTitleRef.current = document.title;
    if (pathname === APP_ROUTES.support || unread <= 0) {
      document.title = baseTitleRef.current;
    } else {
      const badge = unread > 9 ? "9+" : String(unread);
      document.title = `(${badge}) ${baseTitleRef.current}`;
    }
  }, [unread, pathname]);

  useEffect(() => {
    // Browsers need a user gesture before WebAudio can start; unlock on the
    // first interaction so later reply chimes are audible.
    const unlock = () => unlockSupportAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const client = getRealtimeClient();
    const unregister = client.registerListener("support-unread", {
      channels: ["support"],
      onSupportMessage: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        const messageId = String(data.messageId ?? "");
        if (!messageId || lastToastRef.current === messageId) return;
        lastToastRef.current = messageId;

        const isSupportPage = pathname === APP_ROUTES.support;
        const fromPlatform = String(data.senderType ?? "") === "SUPER_ADMIN";
        if (isSupportPage || !fromPlatform) return;

        const body = String(data.body ?? "").trim();
        const senderName = String(data.senderName ?? "Kiosk Support").trim() || "Kiosk Support";
        const preview = body.length > 120 ? `${body.slice(0, 120)}…` : body;

        playSupportMessageSound();
        toast("New message from Kiosk Support", {
          description: preview,
          duration: 6000,
        });
      },
    });

    return unregister;
  }, [pathname]);

  return null;
}
