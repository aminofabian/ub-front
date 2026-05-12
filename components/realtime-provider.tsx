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

import { useOptionalDashboard } from "@/components/dashboard-provider";
import { getSessionTokens } from "@/lib/auth";
import { showPriceChangedToast } from "@/components/price-changed-toast";
import {
  getRealtimeClient,
  type RealtimeFrame,
  type RealtimeConnectionState,
} from "@/lib/realtime";

type RealtimeContextValue = {
  /** Latest unread notification count. */
  unreadCount: number;
  /** Latest received notification frames. Max 50 stored. */
  notifications: RealtimeFrame[];
  /** Mark all as read (clears local state + calls REST). */
  markAllRead: () => void;
  /** Mark a single notification as read. */
  markRead: (notificationId: string) => void;
  /** Connection state for status indicator. */
  connectionState: RealtimeConnectionState;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const dash = useOptionalDashboard();
  const currency = dash?.business?.currency?.trim() || "KES";
  const branding = dash?.business?.branding ?? null;
  const currencyRef = useRef(currency);
  const brandingRef = useRef(branding);
  currencyRef.current = currency;
  brandingRef.current = branding;
  const [notifications, setNotifications] = useState<RealtimeFrame[]>([]);
  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>("disconnected");

  useEffect(() => {
    const tokens = getSessionTokens();
    if (!tokens) return;

    const client = getRealtimeClient();
    const unregister = client.registerListener("provider", {
      channels: ["notifications", "pos"],
      onNotification: (frame) => {
        setNotifications((prev) => {
          if (prev.some((n) => n.eventId === frame.eventId)) return prev;
          return [frame, ...prev].slice(0, 50);
        });
      },
      onPriceChanged: (frame) => {
        showPriceChangedToast(
          frame,
          currencyRef.current,
          brandingRef.current,
        );
      },
      onConnectionStateChange: (state) => {
        setConnectionState(state);
      },
    });

    client.connect().catch(() => {
      // REST polling fallback is automatic
    });

    return unregister;
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications([]);
  }, []);

  const markRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.filter((n) => (n.data as { id?: string }).id !== notificationId),
    );
  }, []);

  const unreadCount = notifications.filter(
    (n) => n.type === "notification.created",
  ).length;

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
