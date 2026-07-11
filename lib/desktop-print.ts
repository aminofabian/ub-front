"use client";

import { apiRequest, fetchSaleReceiptThermal } from "@/lib/api";
import { IS_DESKTOP } from "@/lib/runtime";
import { toast } from "sonner";

/** Default thermal roll width for ESC/POS and browser print (80mm). */
export const DESKTOP_THERMAL_WIDTH_MM = 80;

export type LocalReceiptPrinterTarget = {
  /** CUPS queue from branch settings (`lpstat -v`), e.g. Caysn_CN811_UB. */
  cupsName?: string | null;
  /** Optional network raw printer (port 9100). */
  host?: string | null;
  port?: number | null;
};

type LocalPrintStatus = {
  available?: boolean;
};

function hasPrinterTarget(target?: LocalReceiptPrinterTarget | null): boolean {
  return Boolean(target?.cupsName?.trim() || target?.host?.trim());
}

/**
 * Print a completed sale on the configured ESC/POS printer.
 *
 * Order:
 * 1. Desktop device bridge when `NEXT_PUBLIC_RUNTIME=desktop`
 * 2. Local Next.js `/api/local-print` using branch printer settings
 * 3. Browser print dialog (no auto-cut)
 */
export async function printPosReceipt(
  saleId: string,
  widthMm: number = DESKTOP_THERMAL_WIDTH_MM,
  printer?: LocalReceiptPrinterTarget | null,
): Promise<void> {
  const id = saleId.trim();
  if (!id) {
    window.print();
    return;
  }

  if (IS_DESKTOP) {
    try {
      await apiRequest<void>(
        `/api/v1/desktop/devices/print/sale/${encodeURIComponent(id)}?widthMm=${widthMm}`,
        { method: "POST", toast: false },
      );
      toast.success("Sent to receipt printer.");
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Could not reach the printer. Check Settings → Desktop & LAN → Printer.",
      );
      throw e;
    }
    return;
  }

  let localAvailable = false;
  try {
    const statusRes = await fetch("/api/local-print", { method: "GET" });
    if (statusRes.ok) {
      const status = (await statusRes.json()) as LocalPrintStatus;
      localAvailable = Boolean(status.available);
    }
  } catch {
    // Next route unavailable — fall through to browser print.
  }

  if (localAvailable && hasPrinterTarget(printer)) {
    try {
      const escpos = await fetchSaleReceiptThermal(id, widthMm);
      const headers: Record<string, string> = {
        "Content-Type": "application/octet-stream",
      };
      const cups = printer?.cupsName?.trim();
      const host = printer?.host?.trim();
      if (cups) {
        headers["X-Printer-Cups-Name"] = cups;
      } else if (host) {
        headers["X-Printer-Host"] = host;
        if (printer?.port != null && Number.isFinite(printer.port)) {
          headers["X-Printer-Port"] = String(printer.port);
        }
      }
      const printRes = await fetch("/api/local-print", {
        method: "POST",
        headers,
        body: escpos,
      });
      if (!printRes.ok) {
        const payload = (await printRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          payload.error ||
            `Printer returned HTTP ${printRes.status}. Check Branches → Receipt printer.`,
        );
      }
      toast.success("Sent to receipt printer.");
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Could not reach the receipt printer.",
      );
      throw e;
    }
    return;
  }

  window.print();
  if (!hasPrinterTarget(printer)) {
    toast.message(
      "No receipt printer set for this branch — opened system dialog. Set CUPS name under Branches → Receipt details.",
    );
  }
}
