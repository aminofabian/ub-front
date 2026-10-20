"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { getRealtimeClient } from "@/lib/realtime";
import { fetchContactMessageUnreadCount } from "@/lib/api";
import { shareInflight } from "@/lib/share-inflight";
import { isSupportConversationFocused } from "@/lib/support-focus";
import {
  fetchStorefrontBuyerUnreadCount,
  fetchSupportUnreadCount,
} from "@/lib/support-api";

function isSupportRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/support" || pathname.startsWith("/support/");
}

export type SupportUnreadBreakdown = {
  platform: number;
  storefront: number;
  /** Support-only total (platform + storefront). */
  total: number;
  /** Contact-form unread count (the `Messages` destination). */
  messages: number;
};

type SupportUnreadContextValue = SupportUnreadBreakdown & {
  refresh: () => void;
};

const SupportUnreadContext =
  React.createContext<SupportUnreadContextValue | null>(null);

/**
 * The single owner of support unread state for the dashboard.
 *
 * Previously five components each registered a `support` listener and ran
 * their own 15 s poll of two endpoints. One provider keeps the nav badge,
 * notification bell/drawer, launcher badge and toast watcher in agreement and
 * cuts the polling to one pair of requests per interval.
 */
export function SupportUnreadProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const inSupportSection = isSupportRoute(pathname);
  const [platform, setPlatform] = React.useState(0);
  const [storefront, setStorefront] = React.useState(0);
  const [messages, setMessages] = React.useState(0);
  const wasInSupportRef = React.useRef(inSupportSection);
  const seenRef = React.useRef<Set<string>>(new Set());

  const refresh = React.useCallback(() => {
    // Coalesce overlapping refreshes (socket read frame landing on the 15 s
    // tick, or a route change during the baseline read) into one pair of GETs.
    void shareInflight("support/unread-counts", () =>
      Promise.all([
        // Independent catches: a missing messages.read permission must not stop
        // the support counts from reconciling.
        fetchSupportUnreadCount().catch(() => null),
        fetchStorefrontBuyerUnreadCount().catch(() => null),
        fetchContactMessageUnreadCount().catch(() => null),
      ]),
    ).then(([nextPlatform, nextStorefront, nextMessages]) => {
      if (nextPlatform != null) setPlatform(nextPlatform);
      if (nextStorefront != null) setStorefront(nextStorefront);
      if (nextMessages != null) setMessages(nextMessages);
    });
  }, []);

  // One baseline read per app load — the pathname effect below must not repeat it.
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // One reconciliation poll, even when the socket is down.
  React.useEffect(() => {
    const timer = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  // Support reads happen on the open thread; only reconcile on the transition
  // into/out of the support section, not on every dashboard route change.
  React.useEffect(() => {
    const wasInSupport = wasInSupportRef.current;
    wasInSupportRef.current = inSupportSection;
    if (wasInSupport !== inSupportSection) refresh();
  }, [inSupportSection, refresh]);

  React.useEffect(() => {
    const client = getRealtimeClient();
    const unregister = client.registerListener("support-unread-provider", {
      channels: ["support"],
      onSupportMessage: (frame) => {
        const data = frame.data as Record<string, unknown>;
        const senderType = String(data.senderType ?? "");
        const conversationType = String(data.conversationType ?? "TENANT");
        const conversationId = String(data.conversationId ?? "");
        const messageId = String(data.messageId ?? "");

        const countsAsUnread =
          senderType === "SUPER_ADMIN" ||
          (senderType === "GUEST" && conversationType === "STOREFRONT");
        if (!countsAsUnread) return;
        if (conversationId && isSupportConversationFocused(conversationId)) return;

        // Idempotent increments: reconnects/echoes must not double-count.
        if (messageId) {
          if (seenRef.current.has(messageId)) return;
          seenRef.current.add(messageId);
          if (seenRef.current.size > 250) {
            const first = seenRef.current.values().next().value;
            if (first) seenRef.current.delete(first);
          }
        }

        if (conversationType === "STOREFRONT") {
          setStorefront((n) => n + 1);
          return;
        }
        setPlatform((n) => n + 1);
      },
      onSupportRead: (frame) => {
        const data = frame.data as Record<string, unknown>;
        if (String(data.readerType ?? "") === "TENANT") {
          refresh();
        }
      },
    });
    return unregister;
  }, [refresh]);

  const value = React.useMemo<SupportUnreadContextValue>(
    () => ({
      platform,
      storefront,
      total: platform + storefront,
      messages,
      refresh,
    }),
    [platform, storefront, messages, refresh],
  );

  return (
    <SupportUnreadContext.Provider value={value}>
      {children}
    </SupportUnreadContext.Provider>
  );
}

export function useSupportUnreadBreakdown(): SupportUnreadBreakdown {
  const value = React.useContext(SupportUnreadContext);
  if (!value) {
    throw new Error(
      "useSupportUnread must be used inside SupportUnreadProvider",
    );
  }
  return value;
}

/** Aggregate unread count for badges that do not need the breakdown. */
export function useSupportUnread(): number {
  return useSupportUnreadBreakdown().total;
}

/** Compact pill used inside nav rows. */
export function UnreadPill({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ${className ?? ""}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
