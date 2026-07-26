"use client";

import { useEffect, useState } from "react";

import { useOptionalRealtime } from "@/components/realtime-provider";
import { HUB_MUTED } from "@/lib/business-hub/constants";
import type { RealtimeConnectionState } from "@/lib/realtime";
import { cn } from "@/lib/utils";

type HubLiveStatusProps = {
  /** Business is active (not paused). */
  businessActive?: boolean;
  /** Epoch ms of the last websocket-driven hub refresh. */
  lastLiveUpdateAt?: number | null;
  /** Brief flash after a realtime invalidate. */
  justUpdated?: boolean;
  className?: string;
};

type StatusView = {
  label: string;
  detail: string;
  title: string;
  tone: "live" | "sync" | "off" | "paused";
};

function formatAgo(at: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - at) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function resolveStatus(
  state: RealtimeConnectionState,
  businessActive: boolean,
  lastLiveUpdateAt: number | null | undefined,
  justUpdated: boolean,
  now: number,
): StatusView {
  if (!businessActive) {
    return {
      label: "Paused",
      detail: "Business offline",
      title: "Business is paused — live updates are stopped",
      tone: "paused",
    };
  }

  if (state === "connected") {
    if (justUpdated) {
      return {
        label: "Live",
        detail: "Updated",
        title: "WebSocket connected — board just refreshed from a live event",
        tone: "live",
      };
    }
    if (lastLiveUpdateAt) {
      return {
        label: "Live",
        detail: formatAgo(lastLiveUpdateAt, now),
        title:
          "WebSocket connected — figures refresh when sales, payments, or shifts change",
        tone: "live",
      };
    }
    return {
      label: "Live",
      detail: "Realtime",
      title:
        "WebSocket connected — figures refresh when sales, payments, or shifts change",
      tone: "live",
    };
  }

  if (state === "connecting" || state === "reconnecting") {
    return {
      label: "Syncing",
      detail: state === "connecting" ? "Connecting" : "Reconnecting",
      title: "Reconnecting realtime — refresh may lag until the socket is back",
      tone: "sync",
    };
  }

  return {
    label: "Offline",
    detail: "Manual",
    title: "WebSocket offline — use refresh; figures are not streaming live",
    tone: "off",
  };
}

export function HubLiveStatus({
  businessActive = true,
  lastLiveUpdateAt = null,
  justUpdated = false,
  className,
}: HubLiveStatusProps) {
  const rt = useOptionalRealtime();
  const state = rt?.connectionState ?? "disconnected";
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!lastLiveUpdateAt || state !== "connected") return;
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, [lastLiveUpdateAt, state]);

  const view = resolveStatus(
    state,
    businessActive,
    lastLiveUpdateAt,
    justUpdated,
    now,
  );

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
        view.tone === "live" &&
          "border-emerald-200 bg-emerald-500/10 text-emerald-800",
        view.tone === "sync" &&
          "border-amber-200 bg-amber-500/10 text-amber-900",
        view.tone === "off" && "border-[#EEEEEE] bg-[#F7F7F7] text-[#666666]",
        view.tone === "paused" && "border-[#EEEEEE] bg-muted text-muted-foreground",
        justUpdated && "ring-1 ring-emerald-400/50",
        className,
      )}
      title={view.title}
      aria-label={view.title}
      aria-live="polite"
    >
      <span
        className={cn(
          "size-1.5 shrink-0",
          view.tone === "live" && "bg-emerald-500",
          view.tone === "sync" && "animate-pulse bg-amber-500",
          view.tone === "off" && "bg-[#BBBBBB]",
          view.tone === "paused" && "bg-muted-foreground/50",
          view.tone === "live" && justUpdated && "animate-pulse",
        )}
        aria-hidden
      />
      <span>{view.label}</span>
      <span className={cn("font-medium normal-case tracking-normal", HUB_MUTED)}>
        · {view.detail}
      </span>
    </span>
  );
}
