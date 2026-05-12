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

import { getSessionTokens } from "@/lib/auth";
import {
  getRealtimeClient,
  disconnectRealtimeClient,
  type RealtimeFrame,
  type RealtimeConnectionState,
} from "@/lib/realtime";
import { useOptionalDashboard } from "@/components/dashboard-provider";

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
  const [notifications, setNotifications] = useState<RealtimeFrame[]>([]);
  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>("disconnected");
  const startedRef = useRef(false);

  // Connect WS when user is authenticated
  useEffect(() => {
    if (startedRef.current) return;
    const tokens = getSessionTokens();
    if (!tokens) return;

    startedRef.current = true;
    const client = getRealtimeClient({
      channels: ["notifications"],
      onNotification: (frame) => {
        setNotifications((prev) => {
          // Deduplicate by eventId
          if (prev.some((n) => n.eventId === frame.eventId)) return prev;
          return [frame, ...prev].slice(0, 50);
        });
      },
      onConnectionStateChange: (state) => {
        setConnectionState(state);
      },
    });

    client.connect().catch(() => {
      // Fallback to REST polling is automatic
    });

    return () => {
      // Don't disconnect on unmount — keep connection alive across routes
    };
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications([]);
  }, []);

  const markRead = useCallback(
    (notificationId: string) => {
      setNotifications((prev) =>
        prev.filter((n) => (n.data as { id?: string }).id !== notificationId),
      );
      // REST mark-read is handled by the bell component
    },
    [],
  );

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
