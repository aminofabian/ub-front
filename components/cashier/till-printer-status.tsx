"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Printer } from "lucide-react";

import { IS_DESKTOP } from "@/lib/runtime";
import {
  isTillPrintBridgeUp,
  TILL_BRIDGE_START_HINT,
} from "@/lib/till-print-bridge";
import { cn } from "@/lib/utils";

type TillPrinterStatusProps = {
  cupsName?: string | null;
  className?: string;
  /** Slim ink-line treatment for the market-till command strip. */
  compact?: boolean;
};

/**
 * Cloud cashier only — shows whether the till Mac can print ESC/POS + auto-cut.
 */
export function TillPrinterStatus({
  cupsName,
  className,
  compact = false,
}: TillPrinterStatusProps) {
  const name = cupsName?.trim() || null;
  const [bridgeUp, setBridgeUp] = useState<boolean | null>(null);

  useEffect(() => {
    if (IS_DESKTOP) {
      setBridgeUp(null);
      return;
    }
    let cancelled = false;

    const check = async () => {
      const up = await isTillPrintBridgeUp();
      if (!cancelled) setBridgeUp(up);
    };

    void check();
    const id = window.setInterval(() => void check(), 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (IS_DESKTOP) return null;

  if (!name) {
    return (
      <div
        role="status"
        className={cn(
          compact
            ? "inline-flex items-center gap-1.5 text-[11px] text-amber-900 dark:text-amber-100"
            : "flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2 text-xs text-amber-950 dark:text-amber-50",
          className,
        )}
      >
        <Printer className={cn("shrink-0", compact ? "size-3" : "mt-0.5 size-3.5")} aria-hidden />
        {compact ? (
          <span>
            <span className="font-semibold">Printer not set</span>
            <span className="text-muted-foreground"> — Branches → Receipt details</span>
          </span>
        ) : (
          <p>
            <span className="font-semibold">Receipt printer not configured.</span>{" "}
            In admin go to <strong>Branches → Receipt details</strong>, set{" "}
            <strong>Receipt printer CUPS name</strong> (from{" "}
            <code className="text-[10px]">lpstat -v</code>), then Save.
          </p>
        )}
      </div>
    );
  }

  if (bridgeUp === null) return null;

  if (bridgeUp) {
    return (
      <div
        role="status"
        className={cn(
          compact
            ? "inline-flex items-center gap-1.5 text-[11px] text-[color-mix(in_srgb,var(--pos-primary)_85%,#1c1915)]"
            : "flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-1.5 text-xs text-emerald-950 dark:text-emerald-50",
          className,
        )}
      >
        <CheckCircle2
          className={cn(
            "shrink-0",
            compact ? "size-3 text-[var(--pos-primary)]" : "size-3.5 text-emerald-600",
          )}
          aria-hidden
        />
        <span>
          {compact ? "Printer ready" : "Receipt printer ready"} —{" "}
          <code className="text-[10px]">{name}</code>
        </span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        compact
          ? "inline-flex max-w-full flex-wrap items-start gap-1.5 text-[11px] text-destructive"
          : "flex items-start gap-2 rounded-lg border border-destructive/35 bg-destructive/[0.07] px-3 py-2 text-xs text-destructive",
        className,
      )}
    >
      <AlertTriangle className={cn("shrink-0", compact ? "mt-0.5 size-3" : "mt-0.5 size-3.5")} aria-hidden />
      {compact ? (
        <span>
          <span className="font-semibold">Print bridge down</span>
          <span className="text-destructive/80"> — {TILL_BRIDGE_START_HINT}</span>
        </span>
      ) : (
        <div className="space-y-1">
          <p className="font-semibold">Till Print Bridge is not running</p>
          <p className="text-destructive/90">
            Printing will not auto-cut until you start the bridge on this Mac.{" "}
            {TILL_BRIDGE_START_HINT}
          </p>
          <p className="font-mono text-[10px] text-destructive/80">
            cd frontend && node scripts/till-print-bridge.mjs
          </p>
          <p className="text-[10px] text-destructive/80">
            One-time autostart:{" "}
            <code className="font-mono">
              bash scripts/install-till-print-bridge-autostart.sh
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
