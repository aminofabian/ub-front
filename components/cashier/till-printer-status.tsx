"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Printer } from "lucide-react";
import { toast } from "sonner";

import { TillBridgeDownloadButton } from "@/components/cashier/till-bridge-download-button";
import { CupsPrinterPicker } from "@/components/cups-printer-picker";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { patchBranch } from "@/lib/api";
import { EMPTY_BRANCH_RECEIPT } from "@/lib/branch-receipt";
import { IS_DESKTOP } from "@/lib/runtime";
import {
  fetchTillBridgeHealth,
  getLocalTillCupsName,
  REQUIRED_WIN_PRINT_ENGINE,
  setLocalTillCupsName,
  type TillBridgeHealth,
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
 * Cloud cashier — paper receipts are optional.
 * Default: a quiet chip. Setup (download / detect) stays behind a tap.
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
  const [health, setHealth] = useState<TillBridgeHealth | null>(null);
  const [saving, setSaving] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => {
    setLocalName(getLocalTillCupsName());
  }, [branchName]);

  useEffect(() => {
    if (IS_DESKTOP) {
      setBridgeUp(null);
      setHealth(null);
      return;
    }
    let cancelled = false;

    const check = async () => {
      const h = await fetchTillBridgeHealth();
      if (cancelled) return;
      setHealth(h);
      setBridgeUp(Boolean(h?.ok));
    };

    void check();
    const id = window.setInterval(() => void check(), 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const effectiveName = branchName || localName;
  const winEngineStale =
    health?.platform === "win32" &&
    health.printEngine !== REQUIRED_WIN_PRINT_ENGINE;
  const printerReady = Boolean(bridgeUp && effectiveName && !winEngineStale);

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

  const chipClass = cn(
    "inline-flex max-w-full items-center gap-1.5",
    compact && "h-6 px-2 text-[11px]",
  );

  const panelClass = cn(
    compact
      ? "flex flex-col gap-1.5 rounded-md border border-border/50 bg-background px-2.5 py-2 text-[11px]"
      : "flex flex-col gap-2 rounded-lg border border-border/60 bg-background px-3 py-2.5 text-xs",
  );

  const setupTools = (
    <div className="flex flex-col gap-1.5 border-t border-border/50 pt-1.5">
      {!bridgeUp || winEngineStale ? (
        <TillBridgeDownloadButton compact={compact} update={Boolean(winEngineStale)} />
      ) : null}
      {bridgeUp ? (
        <CupsPrinterPicker
          compact={compact}
          value={effectiveName}
          disabled={saving}
          onSelect={(n) => void handleSelect(n)}
        />
      ) : null}
    </div>
  );

  if (printerReady) {
    return (
      <div className={cn("inline-flex max-w-full flex-col gap-1", className)}>
        <Button
          type="button"
          variant="outline"
          size={compact ? "xs" : "sm"}
          className={chipClass}
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
          <span className="min-w-0 truncate font-medium">{effectiveName}</span>
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
            className={panelClass}
          >
            <p className="text-muted-foreground">Change printer, or update the helper on this PC.</p>
            <CupsPrinterPicker
              compact={compact}
              value={effectiveName}
              disabled={saving}
              onSelect={(n) => void handleSelect(n)}
            />
            <TillBridgeDownloadButton compact={compact} update />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex max-w-full flex-col gap-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size={compact ? "xs" : "sm"}
        className={cn(
          chipClass,
          "text-muted-foreground hover:text-foreground",
        )}
        aria-expanded={panelOpen}
        aria-controls="till-printer-panel"
        onClick={() => {
          setPanelOpen((open) => {
            if (open) setSetupOpen(false);
            return !open;
          });
        }}
      >
        <Printer className={cn("shrink-0", compact ? "size-3" : "size-3.5")} aria-hidden />
        <span className="min-w-0 truncate font-medium">Receipts on screen</span>
        <ChevronDown
          className={cn(
            "size-3 shrink-0 text-muted-foreground/70 transition-transform",
            panelOpen && "rotate-180",
          )}
          aria-hidden
        />
      </Button>
      {panelOpen ? (
        <div
          id="till-printer-panel"
          role="region"
          aria-label="Paper receipts are optional"
          className={panelClass}
        >
          <p className="font-medium text-foreground">You can sell without a printer.</p>
          <p className="leading-snug text-muted-foreground">
            After checkout, the receipt stays on this screen. Show the customer,
            or print later if you connect a printer.
          </p>
          {!setupOpen ? (
            <button
              type="button"
              className="self-start text-left font-medium text-foreground underline-offset-2 hover:underline"
              onClick={() => setSetupOpen(true)}
            >
              Connect a printer
            </button>
          ) : (
            setupTools
          )}
        </div>
      ) : null}
    </div>
  );
}
