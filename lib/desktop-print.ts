"use client";

import { apiRequest, fetchBranches, fetchSaleReceiptThermal } from "@/lib/api";
import {
  appendCashTenderEscPos,
  type CashTenderEscPos,
} from "@/lib/escpos-cash-tender";
import { IS_DESKTOP } from "@/lib/runtime";
import {
  isTillPrintBridgeUp,
  printEscPosViaTillBridge,
  TILL_BRIDGE_START_HINT,
} from "@/lib/till-print-bridge";
import { toast } from "sonner";

/** Default thermal roll width for ESC/POS and browser print (80mm). */
export const DESKTOP_THERMAL_WIDTH_MM = 80;

export type LocalReceiptPrinterTarget = {
  /** CUPS queue from branch settings (`lpstat -v`), e.g. Caysn_CN811_UB. */
  cupsName?: string | null;
  /** Optional network raw printer (port 9100) — till bridge network mode TBD. */
  host?: string | null;
  port?: number | null;
  /** When set, re-fetch branch receipt settings if cupsName is missing. */
  branchId?: string | null;
};

function hasCupsTarget(target?: LocalReceiptPrinterTarget | null): boolean {
  return Boolean(target?.cupsName?.trim());
}

async function resolvePrinterTarget(
  printer?: LocalReceiptPrinterTarget | null,
): Promise<LocalReceiptPrinterTarget | null> {
  if (hasCupsTarget(printer)) {
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
    if (!cupsName) return { ...printer, branchId, cupsName: null };
    return { ...printer, cupsName, branchId };
  } catch {
    return printer ?? null;
  }
}

async function prepareThermalEscPos(
  saleId: string,
  widthMm: number,
  cashTender?: CashTenderEscPos | null,
): Promise<Blob> {
  const escpos = await fetchSaleReceiptThermal(
    saleId,
    widthMm,
    cashTender?.received ?? null,
  );
  if (!cashTender || cashTender.received <= 0) {
    return escpos;
  }
  const raw = new Uint8Array(await escpos.arrayBuffer());
  const patched = appendCashTenderEscPos(raw, cashTender, widthMm);
  return new Blob([new Uint8Array(patched)], { type: "application/octet-stream" });
}

/**
 * Print a completed sale on the configured ESC/POS printer.
 *
 * Cloud (online) cashier:
 *   1. Java API builds ESC/POS + cut bytes
 *   2. Browser POSTs to Till Print Bridge on this Mac (127.0.0.1:19500)
 *   3. Bridge runs `lp -o raw` with branch CUPS name from admin settings
 *
 * Palmart Desktop: JVM device bridge (Settings → Desktop & LAN).
 *
 * Pass `cashTender` when the on-screen receipt shows Received / Change so
 * thermal print matches even before the API has persisted cash_received.
 */
export async function printPosReceipt(
  saleId: string,
  widthMm: number = DESKTOP_THERMAL_WIDTH_MM,
  printer?: LocalReceiptPrinterTarget | null,
  cashTender?: CashTenderEscPos | null,
): Promise<void> {
  const id = saleId.trim();
  if (!id) {
    window.print();
    return;
  }

  if (IS_DESKTOP) {
    try {
      const params = new URLSearchParams({ widthMm: String(widthMm) });
      if (cashTender?.received != null && cashTender.received > 0) {
        params.set("cashReceived", String(cashTender.received));
      }
      await apiRequest<void>(
        `/api/v1/desktop/devices/print/sale/${encodeURIComponent(id)}?${params}`,
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

  const resolved = await resolvePrinterTarget(printer);
  const cupsName = resolved?.cupsName?.trim();

  if (!cupsName) {
    toast.message(
      "No receipt printer configured for this branch. Set CUPS name under Branches → Receipt details, then Save.",
      { duration: 10_000 },
    );
    return;
  }

  const bridgeUp = await isTillPrintBridgeUp();
  if (!bridgeUp) {
    toast.error(
      `Till Print Bridge is not running on this Mac. ${TILL_BRIDGE_START_HINT}`,
      { duration: 14_000 },
    );
    return;
  }

  try {
    const escpos = await prepareThermalEscPos(id, widthMm, cashTender);
    await printEscPosViaTillBridge(escpos, cupsName);
    toast.success("Sent to receipt printer.");
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Could not reach the receipt printer.";
    toast.error(msg, { duration: 10_000 });
    throw e;
  }
}
