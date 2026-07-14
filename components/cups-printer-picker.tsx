"use client";

import { useState } from "react";
import { Loader2, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  fetchTillBridgeHealth,
  fetchTillCupsPrinters,
  TILL_BRIDGE_START_HINT,
  type TillCupsPrinter,
} from "@/lib/till-print-bridge";
import { cn } from "@/lib/utils";

type CupsPrinterPickerProps = {
  value?: string | null;
  onSelect: (cupsName: string) => void;
  className?: string;
  /** Compact control for cashier status strip. */
  compact?: boolean;
  disabled?: boolean;
};

function platformLabel(platform: string | null | undefined): string {
  switch (platform) {
    case "win32":
      return "Windows";
    case "darwin":
      return "macOS";
    case "linux":
      return "Linux";
    default:
      return platform?.trim() || "this PC";
  }
}

function emptyPrintersMessage(platform: string | null | undefined): string {
  switch (platform) {
    case "win32":
      return "No print queues found on Windows. The device must appear under Settings → Printers & scanners (not only in Device Manager). Install/add the printer, set it Online, restart Print Spooler if needed, then Detect again. Skip Microsoft Print to PDF / Fax.";
    case "linux":
      return "No CUPS printers found on Linux. Install cups, add the printer, then retry Detect.";
    case "darwin":
      return "No printers found on this Mac. Add the receipt printer in System Settings → Printers & Scanners first.";
    default:
      return "No printers found on this PC. Add the receipt printer in system settings first.";
  }
}

/**
 * Detect local printers via Till Print Bridge and pick one.
 * Auto-applies when there is a single / suggested thermal printer.
 */
export function CupsPrinterPicker({
  value,
  onSelect,
  className,
  compact = false,
  disabled = false,
}: CupsPrinterPickerProps) {
  const [loading, setLoading] = useState(false);
  const [printers, setPrinters] = useState<TillCupsPrinter[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detect = async () => {
    if (disabled) return;
    setLoading(true);
    setError(null);
    try {
      const health = await fetchTillBridgeHealth();
      if (!health?.ok) {
        const msg = `Till Print Bridge is not running. ${TILL_BRIDGE_START_HINT}`;
        setError(msg);
        toast.error(msg, { duration: 12_000 });
        setPrinters(null);
        return;
      }
      const listed = await fetchTillCupsPrinters();
      const platform = listed.platform || health.platform || null;
      if (listed.printers.length === 0) {
        const msg = emptyPrintersMessage(platform);
        setError(msg);
        toast.message(msg, { duration: 10_000 });
        setPrinters([]);
        return;
      }
      setPrinters(listed.printers);

      const auto =
        listed.suggested?.trim() ||
        (listed.printers.length === 1 ? listed.printers[0].name : null);
      if (auto) {
        onSelect(auto);
        toast.success(
          listed.printers.length === 1
            ? `Selected printer ${auto}`
            : `Auto-picked ${auto} (${platformLabel(platform)})`,
        );
      } else {
        toast.message(
          `Choose a printer on ${platformLabel(platform)} (skip Fax / PDF printers).`,
          { duration: 6_000 },
        );
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Could not list printers on this PC.";
      setError(msg);
      toast.error(msg, { duration: 10_000 });
      setPrinters(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className={cn("flex flex-wrap items-center gap-1.5", compact && "gap-1")}>
        <Button
          type="button"
          variant={compact ? "outline" : "secondary"}
          size={compact ? "xs" : "sm"}
          disabled={disabled || loading}
          onClick={() => void detect()}
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
          {loading ? "Detecting…" : "Detect printers"}
        </Button>
        {printers && printers.length > 0 ? (
          <label className="inline-flex min-w-0 flex-1 items-center gap-1.5">
            <Printer
              className={cn("shrink-0 text-muted-foreground", compact ? "size-3" : "size-3.5")}
              aria-hidden
            />
            <select
              className={cn(
                "min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs",
                compact && "h-6 py-0",
              )}
              value={value?.trim() || ""}
              disabled={disabled}
              onChange={(e) => {
                const name = e.target.value.trim();
                if (name) onSelect(name);
              }}
              aria-label="Choose receipt printer"
            >
              <option value="" disabled>
                Choose printer…
              </option>
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                  {p.likelyThermal ? " (receipt)" : ""}
                  {p.isDefault ? " - default" : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {error && !compact ? (
        <p className="text-[11px] text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
