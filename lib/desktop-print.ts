"use client";

import { apiRequest, fetchSaleReceiptThermal } from "@/lib/api";
import { IS_DESKTOP } from "@/lib/runtime";
import { toast } from "sonner";

/** Default thermal roll width for ESC/POS and browser print (80mm). */
export const DESKTOP_THERMAL_WIDTH_MM = 80;

type LocalPrintStatus = {
  configured?: boolean;
};

/**
 * Print a completed sale on the configured ESC/POS printer.
 *
 * Order:
 * 1. Desktop device bridge (Tauri + JVM) when `NEXT_PUBLIC_RUNTIME=desktop`
 * 2. Local Next.js raw TCP helper when `RECEIPT_PRINTER_HOST` is set
 * 3. Browser print dialog (no auto-cut)
 */
export async function printPosReceipt(
  saleId: string,
  widthMm: number = DESKTOP_THERMAL_WIDTH_MM,
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

  let localConfigured = false;
  try {
    const statusRes = await fetch("/api/local-print", { method: "GET" });
    if (statusRes.ok) {
      const status = (await statusRes.json()) as LocalPrintStatus;
      localConfigured = Boolean(status.configured);
    }
  } catch {
    // Next route unavailable — fall through to browser print.
  }

  if (localConfigured) {
    try {
      const escpos = await fetchSaleReceiptThermal(id, widthMm);
      const printRes = await fetch("/api/local-print", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: escpos,
      });
      if (!printRes.ok) {
        const payload = (await printRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          payload.error ||
            `Printer returned HTTP ${printRes.status}. Check RECEIPT_PRINTER_HOST.`,
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
}
