"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

import { TillBridgeDownloadButton } from "@/components/cashier/till-bridge-download-button";
import { CupsPrinterPicker } from "@/components/cups-printer-picker";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { patchBranch } from "@/lib/api";
import { EMPTY_BRANCH_RECEIPT } from "@/lib/branch-receipt";
import { IS_DESKTOP } from "@/lib/runtime";
import {
  getLocalTillCupsName,
  isTillPrintBridgeUp,
  setLocalTillCupsName,
} from "@/lib/till-print-bridge";
import { cn } from "@/lib/utils";

type TillPrinterStatusProps = {
  cupsName?: string | null;
  /** When set, Detect can save the printer name onto this branch (if permitted). */
  branchId?: string | null;
  className?: string;
  /** Slim ink-line treatment for the market-till command strip. */
  compact?: boolean;
  /** Called after a printer is chosen so the parent can refresh branch data. */
  onCupsNameChosen?: (cupsName: string) => void;
};

/**
 * Cloud cashier only — shows whether this till PC can print ESC/POS + auto-cut.
 * When ready, collapses behind a small Printer button so Detect remains available.
 */
export function TillPrinterStatus({
  cupsName,
  branchId,
  className,
  compact = false,
  onCupsNameChosen,
}: TillPrinterStatusProps) {
  const { canManageBusinessSettings, refreshBranches } = useDashboard();
  const branchName = cupsName?.trim() || null;
  const [localName, setLocalName] = useState<string | null>(null);
  const [bridgeUp, setBridgeUp] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    setLocalName(getLocalTillCupsName());
  }, [branchName]);

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

  const effectiveName = branchName || localName;

  const handleSelect = useCallback(
    async (name: string) => {
      const cups = name.trim();
      if (!cups) return;
      setLocalTillCupsName(cups);
      setLocalName(cups);
      onCupsNameChosen?.(cups);

      const bid = branchId?.trim();
      if (bid && canManageBusinessSettings) {
        setSaving(true);
        try {
          await patchBranch(bid, {
            receipt: {
              ...EMPTY_BRANCH_RECEIPT,
              printerCupsName: cups,
            },
          });
          await refreshBranches();
          toast.success(`Saved printer ${cups} for this branch.`);
        } catch {
          toast.message(
            `Using ${cups} on this PC. Could not save to branch — set it under Branches → Receipt details.`,
            { duration: 10_000 },
          );
        } finally {
          setSaving(false);
        }
      } else {
        toast.success(`Using ${cups} on this PC.`);
      }
    },
    [branchId, canManageBusinessSettings, onCupsNameChosen, refreshBranches],
  );

  if (IS_DESKTOP) return null;
  if (bridgeUp === null) return null;

  if (!bridgeUp) {
    return (
      <div
        role="alert"
        className={cn(
          compact
            ? "inline-flex max-w-full flex-col gap-1.5 text-[11px] text-destructive"
            : "flex flex-col gap-2 rounded-lg border border-destructive/35 bg-destructive/[0.07] px-3 py-2 text-xs text-destructive",
          className,
        )}
      >
        <div className="flex items-start gap-1.5">
          <AlertTriangle
            className={cn("shrink-0", compact ? "mt-0.5 size-3" : "mt-0.5 size-3.5")}
            aria-hidden
          />
          <div className="min-w-0 space-y-0.5">
            <p className="font-semibold">Print bridge not installed on this PC</p>
            <p className={cn(compact ? "text-destructive/80" : "text-destructive/90")}>
              Download and run the installer once. On Windows 7 click{" "}
              <strong className="font-semibold">Windows 7 (no Node)</strong>
              {" - "}do not install Node.js. Then Detect printers.
            </p>
          </div>
        </div>
        <TillBridgeDownloadButton compact={compact} />
      </div>
    );
  }

  if (!effectiveName) {
    return (
      <div
        role="status"
        className={cn(
          compact
            ? "inline-flex max-w-full flex-col gap-1 text-[11px] text-amber-900 dark:text-amber-100"
            : "flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2 text-xs text-amber-950 dark:text-amber-50",
          className,
        )}
      >
        <div className="flex items-start gap-1.5">
          <Printer
            className={cn("shrink-0", compact ? "mt-0.5 size-3" : "mt-0.5 size-3.5")}
            aria-hidden
          />
          {compact ? (
            <span>
              <span className="font-semibold">Printer not set</span>
              <span className="text-muted-foreground"> — detect on this PC</span>
            </span>
          ) : (
            <p>
              <span className="font-semibold">Receipt printer not configured.</span>{" "}
              Detect printers on this PC, or set one under{" "}
              <strong>Branches → Receipt details</strong>.
            </p>
          )}
        </div>
        <CupsPrinterPicker
          compact={compact}
          disabled={saving}
          onSelect={(n) => void handleSelect(n)}
        />
      </div>
    );
  }

  // Printer configured + bridge up — collapse behind a button; Detect stays available.
  return (
    <div className={cn("inline-flex max-w-full flex-col gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size={compact ? "xs" : "sm"}
        className={cn(
          "inline-flex max-w-full items-center gap-1.5",
          compact && "h-6 px-2 text-[11px]",
        )}
        aria-expanded={panelOpen}
        aria-controls="till-printer-panel"
        onClick={() => setPanelOpen((open) => !open)}
      >
        <CheckCircle2
          className={cn(
            "shrink-0 text-[var(--pos-primary)]",
            compact ? "size-3" : "size-3.5",
          )}
          aria-hidden
        />
        <Printer className={cn("shrink-0", compact ? "size-3" : "size-3.5")} aria-hidden />
        <span className="min-w-0 truncate font-medium">
          {effectiveName}
        </span>
        <ChevronDown
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform",
            panelOpen && "rotate-180",
          )}
          aria-hidden
        />
      </Button>
      {panelOpen ? (
        <div
          id="till-printer-panel"
          role="region"
          aria-label="Receipt printer options"
          className={cn(
            compact
              ? "flex flex-col gap-1 rounded-md border border-border/50 bg-background/90 px-2 py-1.5 text-[11px]"
              : "flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs",
          )}
        >
          <p className="text-muted-foreground">
            Change or re-detect the receipt printer on this PC.
          </p>
          <CupsPrinterPicker
            compact={compact}
            value={effectiveName}
            disabled={saving}
            onSelect={(n) => void handleSelect(n)}
          />
        </div>
      ) : null}
    </div>
  );
}
