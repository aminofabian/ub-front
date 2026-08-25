"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";
import { APP_ROUTES } from "@/lib/config";
import { useSupportUnread } from "@/hooks/use-support-unread";
import { isSupportConversationFocused } from "@/lib/support-focus";
import {
  playSupportMessageSound,
  unlockSupportAudio,
} from "@/lib/support-sound";

/**
 * Mounted inside the dashboard shell. Keeps the {@code support} channel open
 * on the shared realtime client and surfaces incoming platform + storefront
 * replies as a soft chime (always) and a toast when the thread isn't open.
 * Unread is also mirrored into the document title.
 */
export function SupportUnreadWatcher() {
  const router = useRouter();
  const unread = useSupportUnread();
  const lastChimeRef = useRef<string | null>(null);
  const baseTitleRef = useRef("");

  useEffect(() => {
    baseTitleRef.current = document.title;
  }, []);

  // Live unread count in the title: "(2) Shop Admin — Kiosk" while unread.
  useEffect(() => {
    if (!baseTitleRef.current) baseTitleRef.current = document.title;
    if (unread <= 0) {
      document.title = baseTitleRef.current;
    } else {
      const badge = unread > 9 ? "9+" : String(unread);
      document.title = `(${badge}) ${baseTitleRef.current}`;
    }
  }, [unread]);

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
    const unregister = client.registerListener("support-unread-watcher", {
      channels: ["support"],
      onSupportMessage: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        const messageId = String(data.messageId ?? "");
        if (!messageId || lastChimeRef.current === messageId) return;
        lastChimeRef.current = messageId;

        const senderType = String(data.senderType ?? "");
        const conversationType = String(data.conversationType ?? "TENANT");
        const conversationId = String(data.conversationId ?? "");
        const fromPlatform = senderType === "SUPER_ADMIN";
        const fromStorefrontBuyer =
          senderType === "GUEST" && conversationType === "STOREFRONT";
        if (!fromPlatform && !fromStorefrontBuyer) return;

        playSupportMessageSound();

        const focused =
          conversationId.length > 0 && isSupportConversationFocused(conversationId);
        const tabHidden =
          typeof document !== "undefined" && document.visibilityState === "hidden";

        // Toast when the thread isn't on screen, or the browser tab is hidden.
        if (focused && !tabHidden) return;

        const body = String(data.body ?? "").trim();
        const attachment = data.attachment as { fileName?: string } | null | undefined;
        const senderName =
          String(data.senderName ?? "").trim() ||
          (fromPlatform ? "Kiosk Support" : "Storefront buyer");
        const rawPreview =
          body ||
          (attachment?.fileName ? `📎 ${attachment.fileName}` : "") ||
          (fromPlatform ? "Sent you a message" : "New storefront message");
        const preview =
          rawPreview.length > 120 ? `${rawPreview.slice(0, 120)}…` : rawPreview;

        toast(`New message from ${senderName}`, {
          description: preview,
          duration: 7000,
          action: {
            label: "Open",
            onClick: () => router.push(APP_ROUTES.support),
          },
        });
      },
    });

    return unregister;
  }, [router]);

  return null;
}
