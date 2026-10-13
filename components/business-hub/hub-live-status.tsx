"use client";

import { useEffect, useState } from "react";

import { useOptionalRealtime } from "@/components/realtime-provider";
import type { RealtimeConnectionState } from "@/lib/realtime";
import { cn } from "@/lib/utils";

type HubLiveStatusProps = {
  businessActive?: boolean;
  lastLiveUpdateAt?: number | null;
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
        detail: "Tick",
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
      detail: "Listening",
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
        "relative inline-flex h-9 items-center gap-1.5 overflow-hidden text-[12px] font-semibold sm:h-8 sm:gap-2 sm:border sm:px-2.5 sm:text-[10px] sm:tracking-[-0.02em]",
        view.tone === "live" &&
          "text-[#0f766e] sm:border-emerald-300/50 sm:bg-[#0B1F17] sm:text-emerald-100",
        view.tone === "sync" &&
          "text-amber-800 sm:border-amber-300/50 sm:bg-amber-50 sm:text-amber-950",
        view.tone === "off" &&
          "text-[#666666] sm:border-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,transparent)] sm:bg-white",
        view.tone === "paused" &&
          "text-muted-foreground sm:border-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,transparent)] sm:bg-muted",
        justUpdated && view.tone === "live" && "hub-scan-sweep",
        className,
      )}
      title={view.title}
      aria-label={view.title}
      aria-live="polite"
    >
      <span
        className={cn(
          "relative size-1.5 shrink-0",
          view.tone === "live" && "bg-emerald-400 hub-live-beacon",
          view.tone === "sync" && "animate-pulse bg-amber-500",
          view.tone === "off" && "bg-[#BBBBBB]",
          view.tone === "paused" && "bg-muted-foreground/50",
        )}
        aria-hidden
      />
      <span className="tracking-normal sm:tracking-[0.14em]">{view.label}</span>
      <span
        className={cn(
          "border-l pl-2 font-medium normal-case tracking-normal",
          "hidden sm:inline",
          view.tone === "live"
            ? "border-emerald-400/30 text-emerald-200/90"
            : "border-current/20 text-current/70",
        )}
      >
        {view.detail}
      </span>
    </span>
  );
}
