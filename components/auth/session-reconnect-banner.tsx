"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

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
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        <p>
          <span className="font-medium">Reconnecting</span>
          <span className="text-muted-foreground">
            {" "}
            — still signed in on this device.
          </span>
        </p>
      </div>
    </div>
  );
}
