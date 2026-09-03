"use client";

import { useEffect, useState } from "react";

import {
  getConnectionHealth,
  subscribeConnectionHealth,
  type ConnectionHealth,
} from "@/lib/connection-health";
import { cn } from "@/lib/utils";

const COPY: Record<
  Exclude<ConnectionHealth, "ok">,
  { label: string; hint: string }
> = {
  offline: {
    label: "You're offline",
    hint: "Your work is safe. This will catch up when the network is back.",
  },
  unstable: {
    label: "Reconnecting",
    hint: "The server is slow to answer. Retrying on its own — nothing to do.",
  },
};

/**
 * Ambient connection strip. Replaces the "Request failed" toast for transport
 * failures: it never interrupts, it disappears on its own when a request
 * succeeds, and it never blames the user for a gateway timeout.
 */
export function ConnectionHealthBanner() {
  const [state, setState] = useState<ConnectionHealth>("ok");

  useEffect(() => {
    setState(getConnectionHealth());
    return subscribeConnectionHealth(setState);
  }, []);

  if (state === "ok") {
    return null;
  }

  const copy = COPY[state];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "shrink-0 border-b px-4 py-2 sm:px-6",
        "border-border bg-muted/60 text-foreground",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "size-2 shrink-0 rounded-full bg-muted-foreground",
            state === "unstable" && "motion-safe:animate-pulse",
          )}
        />
        <p className="min-w-0 text-sm">
          <span className="font-medium">{copy.label}</span>
          <span className="text-muted-foreground"> — {copy.hint}</span>
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="ml-auto shrink-0 text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
