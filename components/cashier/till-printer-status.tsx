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
};

/**
 * Cloud cashier only — shows whether the till Mac can print ESC/POS + auto-cut.
 */
export function TillPrinterStatus({ cupsName, className }: TillPrinterStatusProps) {
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
          "flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2 text-xs text-amber-950 dark:text-amber-50",
          className,
        )}
      >
        <Printer className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>
          <span className="font-semibold">Receipt printer not configured.</span>{" "}
          In admin go to <strong>Branches → Receipt details</strong>, set{" "}
          <strong>Receipt printer CUPS name</strong> (from{" "}
          <code className="text-[10px]">lpstat -v</code>), then Save.
        </p>
      </div>
    );
  }

  if (bridgeUp === null) return null;

  if (bridgeUp) {
    return (
      <div
        role="status"
        className={cn(
          "flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-1.5 text-xs text-emerald-950 dark:text-emerald-50",
          className,
        )}
      >
        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
        <span>
          Receipt printer ready — <code className="text-[10px]">{name}</code>
        </span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-destructive/35 bg-destructive/[0.07] px-3 py-2 text-xs text-destructive",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <div className="space-y-1">
        <p className="font-semibold">Till Print Bridge is not running</p>
        <p className="text-destructive/90">
          Printing will not auto-cut until you start the bridge on this Mac.{" "}
          {TILL_BRIDGE_START_HINT}
        </p>
        <p className="font-mono text-[10px] text-destructive/80">
          cd frontend && node scripts/till-print-bridge.mjs
        </p>
      </div>
    </div>
  );
}
