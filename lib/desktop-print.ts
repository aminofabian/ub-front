"use client";

import { apiRequest, fetchBranches, fetchSaleReceiptThermal } from "@/lib/api";
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
  /** When set, re-fetch branch receipt settings if cupsName/host are missing. */
  branchId?: string | null;
};

type LocalPrintStatus = {
  available?: boolean;
};

function hasPrinterTarget(target?: LocalReceiptPrinterTarget | null): boolean {
  return Boolean(target?.cupsName?.trim() || target?.host?.trim());
}

async function resolvePrinterTarget(
  printer?: LocalReceiptPrinterTarget | null,
): Promise<LocalReceiptPrinterTarget | null> {
  if (hasPrinterTarget(printer)) {
    return {
      cupsName: printer?.cupsName?.trim() || null,
      host: printer?.host?.trim() || null,
      port: printer?.port ?? null,
      branchId: printer?.branchId ?? null,
    };
  }
  const branchId = printer?.branchId?.trim();
  if (!branchId) return printer ?? null;
  try {
    const list = await fetchBranches();
    const branch = list.find((b) => b.id === branchId);
    const cupsName = branch?.receipt?.printerCupsName?.trim() || null;
    if (!cupsName) return printer ?? null;
    return { ...printer, cupsName, branchId };
  } catch {
    return printer ?? null;
  }
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

  const resolved = await resolvePrinterTarget(printer);

  if (localAvailable && hasPrinterTarget(resolved)) {
    try {
      const escpos = await fetchSaleReceiptThermal(id, widthMm);
      const headers: Record<string, string> = {
        "Content-Type": "application/octet-stream",
      };
      const cups = resolved?.cupsName?.trim();
      const host = resolved?.host?.trim();
      if (cups) {
        headers["X-Printer-Cups-Name"] = cups;
      } else if (host) {
        headers["X-Printer-Host"] = host;
        if (resolved?.port != null && Number.isFinite(resolved.port)) {
          headers["X-Printer-Port"] = String(resolved.port);
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
  if (!hasPrinterTarget(resolved)) {
    toast.message(
      "No receipt printer set for this branch — opened system dialog. Set CUPS name under Branches → Receipt details, Save, then try again (Java API must be restarted if you just added the field).",
    );
  }
}
