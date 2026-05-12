"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import { useOptionalRealtime } from "@/components/realtime-provider";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const rt = useOptionalRealtime();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!rt) return null;

  const { unreadCount, notifications, markAllRead } = rt;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center size-9 rounded-lg hover:bg-muted transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="size-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No notifications yet
                </p>
              ) : (
                notifications
                  .filter((n) => n.type === "notification.created")
                  .slice(0, 20)
                  .map((n) => {
                    const data = n.data as Record<string, unknown>;
                    const title =
                      (data.title as string) ?? data.notificationType ?? "";
                    const body = (data.body as string) ?? "";
                    const actionUrl = (data.actionUrl as string) ?? "";
                    const time = n.at
                      ? new Date(n.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "";

                    return (
                      <button
                        key={n.eventId}
                        onClick={() => {
                          setOpen(false);
                          if (actionUrl) router.push(actionUrl);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/20 last:border-0",
                          n.priority === "HIGH" &&
                            "bg-red-50/30 dark:bg-red-950/10",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug line-clamp-2">
                            {title}
                          </p>
                          <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                            {time}
                          </span>
                        </div>
                        {body && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            {body}
                          </p>
                        )}
                        {n.priority === "HIGH" && (
                          <span className="mt-1 inline-block rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            High priority
                          </span>
                        )}
                      </button>
                    );
                  })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
