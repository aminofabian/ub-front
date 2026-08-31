"use client";

import { useEffect, useState } from "react";

import { WaitingBoxes } from "@/components/auth/waiting-boxes";
import { isPosSoftAuthActive } from "@/lib/pos-soft-auth";
import {
  isSessionReconnecting,
  subscribeSessionReconnect,
} from "@/lib/session-reconnect";
import { cn } from "@/lib/utils";

/**
 * Quiet status strip while the client restores the session. Not an error —
 * PIN lock / sign-in own the dead-session case.
 */
export function SessionReconnectBanner() {
  const [active, setActive] = useState(isSessionReconnecting);

  useEffect(() => {
    setActive(isSessionReconnecting());
    return subscribeSessionReconnect((state) => {
      setActive(state === "reconnecting" && !isPosSoftAuthActive());
    });
  }, []);

  if (!active || isPosSoftAuthActive()) {
    return null;
  }

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
        <WaitingBoxes size="mini" className="shrink-0" />
        <p className="min-w-0 text-sm">
          <span className="font-medium">Reconnecting</span>
          <span className="text-muted-foreground">
            {" "}
            — drag a crate, or just wait. Still signed in.
          </span>
        </p>
      </div>
    </div>
  );
}
