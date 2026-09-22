"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import { useClientHasAccessTokens } from "@/hooks/use-client-session";
import {
  fetchStaffNotifications,
  markStaffNotificationRead,
  type StaffNotificationRow,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { showPriceChangedToast } from "@/components/price-changed-toast";
import { getNotificationPresentation } from "@/lib/notification-display";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  getRealtimeClient,
  type RealtimeFrame,
  type RealtimeConnectionState,
} from "@/lib/realtime";

type RealtimeContextValue = {
  /** Latest unread notification count. */
  unreadCount: number;
  /** Latest received notification frames (read + unread). Max 50 stored. */
  notifications: RealtimeFrame[];
  /** Mark all as read (keeps rows, clears unread badges + calls REST). */
  markAllRead: () => void;
  /** Mark a single notification as read (keeps the row). */
  markRead: (notificationId: string) => void;
  /** Connection state for status indicator. */
  connectionState: RealtimeConnectionState;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

function staffRowToFrame(row: StaffNotificationRow): RealtimeFrame {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(row.payloadJson || "{}") as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  const data = getNotificationPresentation({
    id: row.id,
    type: row.type,
    notificationType: row.type,
    payloadJson: row.payloadJson,
    payload: parsed,
    ...parsed,
    createdAt: row.createdAt,
    readAt: row.readAt,
  });
  return {
    v: 1,
    type: "notification.created",
    eventId: row.id,
    at: row.createdAt ?? "",
    priority: "MEDIUM",
    delivery: "poll",
    data: {
      id: row.id,
      type: row.type,
      notificationType: row.type,
      payloadJson: row.payloadJson,
      payload: parsed,
      ...parsed,
      title: data.title,
      body: data.body,
      actionUrl: data.actionUrl,
      createdAt: row.createdAt,
      readAt: row.readAt,
    },
  };
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasAccessTokens = useClientHasAccessTokens();
  const dash = useOptionalDashboard();
  const currency = dash?.business?.currency?.trim() || "KES";
  const branding = dash?.business?.branding ?? null;
  const currencyRef = useRef(currency);
  const brandingRef = useRef(branding);
  currencyRef.current = currency;
  brandingRef.current = branding;
  const canReadNotifications = hasPermission(
    dash?.me?.permissions,
    Permission.ReportsNotificationsRead,
  );
  const [notifications, setNotifications] = useState<RealtimeFrame[]>([]);
  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>("disconnected");

  useEffect(() => {
    // Never connect on auth pages — no tenant context is available
    if (pathname.startsWith(APP_ROUTES.login)) {
      return;
    }

    if (!hasAccessTokens) return;

    const channels = canReadNotifications
      ? (["notifications", "pos", "pos_drafts", "grocery", "support"] as const)
      : (["pos", "pos_drafts", "grocery", "support"] as const);

    const client = getRealtimeClient();
    const unregister = client.registerListener("provider", {
      channels: [...channels],
      ...(canReadNotifications
        ? {
            onNotification: (frame) => {
              if (frame.type === "notification.read") {
                const data = frame.data as {
                  id?: string;
                  notificationId?: string;
                };
                const id = String(
                  data.id ?? data.notificationId ?? frame.eventId ?? "",
                );
                if (!id) return;
                const now = new Date().toISOString();
                setNotifications((prev) =>
                  prev.map((n) => {
                    const row = n.data as Record<string, unknown>;
                    if (String(row.id ?? n.eventId) !== id) return n;
                    if (row.readAt) return n;
                    return { ...n, data: { ...row, readAt: now } };
                  }),
                );
                return;
              }
              setNotifications((prev) => {
                if (prev.some((n) => n.eventId === frame.eventId)) return prev;
                return [frame, ...prev].slice(0, 50);
              });
            },
          }
        : {}),
      onPriceChanged: (frame) => {
        showPriceChangedToast(frame, currencyRef.current, brandingRef.current);
      },
      onConnectionStateChange: (state) => {
        setConnectionState(state);
      },
    });

    // Defer connect so child hooks (grocery, POS, etc.) register first.
    const connectTimer = window.setTimeout(() => {
      client.connect().catch(() => {
        // REST polling fallback is automatic
      });
    }, 0);

    return () => {
      window.clearTimeout(connectTimer);
      unregister();
    };
  }, [canReadNotifications, hasAccessTokens, pathname]);

  // Hydrate tenant staff inbox from REST — welcome (and other offline inserts)
  // are created before any WS session exists, and poll baselines without emitting history.
  // Keep read + unread so the drawer stays populated after mark-read.
  useEffect(() => {
    if (!hasAccessTokens || !canReadNotifications) return;
    if (pathname.startsWith(APP_ROUTES.login)) return;

    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchStaffNotifications();
        if (cancelled || !Array.isArray(rows)) return;
        const hydrated = rows.slice(0, 50).map(staffRowToFrame);
        setNotifications((prev) => {
          const byId = new Map<string, RealtimeFrame>();
          for (const frame of hydrated) {
            byId.set(frame.eventId, frame);
          }
          for (const frame of prev) {
            if (!byId.has(frame.eventId)) {
              byId.set(frame.eventId, frame);
            }
          }
          return Array.from(byId.values())
            .sort((a, b) => String(b.at).localeCompare(String(a.at)))
            .slice(0, 50);
        });
      } catch {
        // Bell stays live-only if hydrate fails
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canReadNotifications, hasAccessTokens, pathname]);

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    setNotifications((prev) => {
      for (const frame of prev) {
        const data = frame.data as { id?: string; readAt?: string | null };
        if (data.readAt) continue;
        const id = String(data.id ?? frame.eventId ?? "");
        if (id) {
          void markStaffNotificationRead(id).catch(() => {});
        }
      }
      return prev.map((frame) => {
        const data = frame.data as Record<string, unknown>;
        if (data.readAt) return frame;
        return {
          ...frame,
          data: { ...data, readAt: now },
        };
      });
    });
  }, []);

  const markRead = useCallback((notificationId: string) => {
    void markStaffNotificationRead(notificationId).catch(() => {});
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => {
        const data = n.data as Record<string, unknown>;
        if (String(data.id ?? "") !== notificationId) return n;
        if (data.readAt) return n;
        return { ...n, data: { ...data, readAt: now } };
      }),
    );
  }, []);

  const unreadCount = notifications.filter((n) => {
    if (n.type !== "notification.created") return false;
    const readAt = (n.data as { readAt?: string | null }).readAt;
    return readAt == null || readAt === "";
  }).length;

  const value = useMemo<RealtimeContextValue>(
    () => ({
      unreadCount,
      notifications,
      markAllRead,
      markRead,
      connectionState,
    }),
    [unreadCount, notifications, markAllRead, markRead, connectionState],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtime must be used inside RealtimeProvider");
  }
  return ctx;
}

export function useOptionalRealtime(): RealtimeContextValue | null {
  return useContext(RealtimeContext);
}
