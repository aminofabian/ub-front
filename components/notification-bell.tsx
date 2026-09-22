"use client";

import { Bell } from "lucide-react";

import { useOptionalRealtime } from "@/components/realtime-provider";
import { useSupportUnread } from "@/hooks/use-support-unread";
import { requestToggleNotifications } from "@/lib/notifications-open";

/**
 * Header bell that toggles the shared {@link NotificationsDrawer}.
 * Open state lives in the drawer (one instance in the dashboard layout) so
 * sticky headers and duplicate mounts cannot flash the panel closed.
 */
export function NotificationBell() {
  const rt = useOptionalRealtime();
  const supportUnread = useSupportUnread();

  const notificationUnread = rt?.unreadCount ?? 0;
  const unreadCount = notificationUnread + supportUnread;

  return (
    <button
      type="button"
      onClick={() => requestToggleNotifications()}
      className="relative flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-muted"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className="size-5 text-muted-foreground" />
      {unreadCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}
