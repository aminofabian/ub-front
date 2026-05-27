"use client";

import { apiRequest } from "@/lib/api";
import { IS_DESKTOP } from "@/lib/runtime";
import { toast } from "sonner";

/** Thermal roll width used by the POS preview (50 mm). */
export const DESKTOP_THERMAL_WIDTH_MM = 50;

/**
 * Print a completed sale on the configured ESC/POS printer (desktop) or fall back
 * to the browser print dialog (cloud / dev).
 */
export async function printPosReceipt(
  saleId: string,
  widthMm: number = DESKTOP_THERMAL_WIDTH_MM,
): Promise<void> {
  if (IS_DESKTOP && saleId.trim()) {
    try {
      await apiRequest<void>(
        `/api/v1/desktop/devices/print/sale/${encodeURIComponent(saleId)}?widthMm=${widthMm}`,
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
  window.print();
}
