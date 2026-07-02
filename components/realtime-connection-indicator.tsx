"use client";

import { useOptionalRealtime } from "@/components/realtime-provider";
import { cn } from "@/lib/utils";
import type { RealtimeConnectionState } from "@/lib/realtime";

type IndicatorConfig = {
  label: string;
  title: string;
  dotClass: string;
  pillClass: string;
  pulse?: boolean;
};

const STATE_CONFIG: Record<RealtimeConnectionState, IndicatorConfig> = {
  connected: {
    label: "Live",
    title: "WebSocket connected — instant alerts active",
    dotClass: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.65)]",
    pillClass:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300",
  },
  connecting: {
    label: "Connecting",
    title: "WebSocket connecting…",
    dotClass: "bg-amber-500",
    pillClass:
      "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300",
    pulse: true,
  },
  reconnecting: {
    label: "Reconnecting",
    title: "WebSocket reconnecting — alerts may be delayed",
    dotClass: "bg-amber-500",
    pillClass:
      "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300",
    pulse: true,
  },
  disconnected: {
    label: "Live off",
    title: "WebSocket disconnected — alerts fall back to polling",
    dotClass: "bg-muted-foreground/50",
    pillClass: "bg-muted text-muted-foreground",
  },
};

type RealtimeConnectionIndicatorProps = {
  /** Hide text on narrow viewports (dot only). */
  compact?: boolean;
  className?: string;
};

/**
 * Shows WebSocket connection health from RealtimeProvider.
 * Distinct from browser "Online/Offline" — network can be up while the socket is down.
 */
export function RealtimeConnectionIndicator({
  compact = false,
  className,
}: RealtimeConnectionIndicatorProps) {
  const rt = useOptionalRealtime();
  const state = rt?.connectionState ?? "disconnected";
  const config = STATE_CONFIG[state];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wide",
        config.pillClass,
        className,
      )}
      title={config.title}
      aria-label={config.title}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          config.dotClass,
          config.pulse && "animate-pulse",
        )}
        aria-hidden
      />
      {!compact ? (
        <span className="hidden min-[380px]:inline">{config.label}</span>
      ) : null}
    </span>
  );
}
