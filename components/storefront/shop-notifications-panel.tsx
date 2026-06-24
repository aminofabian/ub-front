"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

import { PushNotificationsEnable } from "@/components/push-notifications-enable";
import { Button } from "@/components/ui/button";
import {
  fetchShopperNotifications,
  fetchShopperUnreadNotificationCount,
  markAllShopperNotificationsRead,
  markShopperNotificationRead,
  type ShopperNotificationRow,
} from "@/lib/api";
import { getNotificationPresentation } from "@/lib/notification-display";
import { cn } from "@/lib/utils";

export function ShopNotificationsPanel() {
  const [rows, setRows] = useState<ShopperNotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [list, count] = await Promise.all([
        fetchShopperNotifications(40),
        fetchShopperUnreadNotificationCount(),
      ]);
      setRows(list);
      setUnread(count);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onMarkRead = async (id: string) => {
    await markShopperNotificationRead(id);
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, readAt: new Date().toISOString() } : r)),
    );
    setUnread((c) => Math.max(0, c - 1));
  };

  const onMarkAll = async () => {
    await markAllShopperNotificationsRead();
    setRows((prev) => prev.map((r) => ({ ...r, readAt: r.readAt ?? new Date().toISOString() })));
    setUnread(0);
  };

  return (
    <section className="relative z-[1] mt-10 rounded-[1.5rem] border border-border/60 bg-card/85 shadow-lg backdrop-blur-sm">
      <div className="border-b border-border/50 px-5 py-3">
        <PushNotificationsEnable label="Enable order alerts on this device" />
      </div>
      <div className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-2">
          <Bell className="size-5 text-[color:var(--auth-primary)]" aria-hidden />
          <h2 className="font-heading text-lg font-bold tracking-tight">Notifications</h2>
          {unread > 0 ? (
            <span className="flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </div>
        {unread > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-xl text-xs"
            onClick={() => void onMarkAll()}
          >
            <CheckCheck className="size-3.5" aria-hidden />
            Mark all read
          </Button>
        ) : null}
      </div>

      <div className="max-h-80 overflow-y-auto px-2 py-2">
        {loading ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="px-3 py-6 text-center text-sm text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            No notifications yet — order updates and payment confirmations will appear here.
          </p>
        ) : (
          <ul className="space-y-1">
            {rows.map((row) => {
              let parsed: Record<string, unknown> = {};
              try {
                parsed = JSON.parse(row.payloadJson) as Record<string, unknown>;
              } catch {
                parsed = {};
              }
              const data = {
                notificationType: row.type,
                type: row.type,
                payload: parsed,
                ...parsed,
              };
              const { title, body } = getNotificationPresentation(data);
              const isUnread = !row.readAt;
              const time = row.createdAt
                ? new Date(row.createdAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <li key={row.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-xl px-3 py-3 text-left transition hover:bg-muted/60",
                      isUnread && "bg-[color-mix(in_srgb,var(--auth-primary)_8%,transparent)]",
                    )}
                    onClick={() => {
                      if (isUnread) {
                        void onMarkRead(row.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      {isUnread ? (
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-[color:var(--auth-primary)]" />
                      ) : null}
                    </div>
                    {body ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
                    ) : null}
                    {time ? (
                      <p className="mt-1 text-[10px] text-muted-foreground/80">{time}</p>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
