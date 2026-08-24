"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";
import { APP_ROUTES } from "@/lib/config";

/**
 * Mounted inside the dashboard shell. Keeps the {@code support} channel open
 * on the shared realtime client and surfaces incoming platform replies as
 * toasts + a document-title badge while the user is elsewhere in the app.
 */
export function SupportUnreadWatcher() {
  const pathname = usePathname();
  const lastToastRef = useRef<string | null>(null);
  const baseTitleRef = useRef("");

  useEffect(() => {
    baseTitleRef.current = document.title;
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
        if (isSupportPage) return;

        const body = String(data.body ?? "").trim();
        const senderName = String(data.senderName ?? "Kiosk Support").trim() || "Kiosk Support";
        const preview = body.length > 120 ? `${body.slice(0, 120)}…` : body;

        if (typeof document !== "undefined" && document.hidden) {
          document.title = `💬 ${senderName}`;
          const onVisible = () => {
            document.title = baseTitleRef.current;
            document.removeEventListener("visibilitychange", onVisible);
          };
          document.addEventListener("visibilitychange", onVisible);
        } else {
          toast("New message from Kiosk Support", {
            description: preview,
            duration: 6000,
          });
        }
      },
    });

    return unregister;
  }, [pathname]);

  return null;
}
