"use client";

import { useGroceryNotifications } from "@/hooks/use-grocery-notifications";

/**
 * Mount this inside a RealtimeProvider to subscribe to grocery realtime events.
 * Renders nothing — only activates the WebSocket listener hook.
 */
export function GroceryNotificationListener() {
  useGroceryNotifications();
  return null;
}
