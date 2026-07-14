"use client";

import {
  apiRequest,
  fetchBranches,
  fetchSaleReceiptThermal,
  fetchWebOrderReceiptThermal,
} from "@/lib/api";
import {
  appendCashTenderEscPos,
  type CashTenderEscPos,
} from "@/lib/escpos-cash-tender";
import { IS_DESKTOP } from "@/lib/runtime";
import {
  getLocalTillCupsName,
  getLocalTillNetworkTarget,
  isTillPrintBridgeUp,
  printEscPosViaTillBridge,
  TILL_BRIDGE_START_HINT,
} from "@/lib/till-print-bridge";
import { toast } from "sonner";

/** Default thermal roll width for ESC/POS and browser print (80mm). */
export const DESKTOP_THERMAL_WIDTH_MM = 80;

export type LocalReceiptPrinterTarget = {
  /** Spooler / CUPS / Windows printer name from branch settings. */
  cupsName?: string | null;
  /** Network ESC/POS host (Ethernet/Wi‑Fi, typically port 9100). */
  host?: string | null;
  port?: number | null;
  /** When set, re-fetch branch receipt settings if cupsName is missing. */
  branchId?: string | null;
};

function hasCupsTarget(target?: LocalReceiptPrinterTarget | null): boolean {
  return Boolean(target?.cupsName?.trim());
}

function hasNetworkTarget(target?: LocalReceiptPrinterTarget | null): boolean {
  return Boolean(target?.host?.trim());
}

async function resolvePrinterTarget(
  printer?: LocalReceiptPrinterTarget | null,
): Promise<LocalReceiptPrinterTarget | null> {
  const localCups = getLocalTillCupsName();
  const localNet = getLocalTillNetworkTarget();

  // Per-machine override wins so a new till can use a different queue / IP.
  if (localCups || localNet) {
    return {
      cupsName: localCups || printer?.cupsName?.trim() || null,
      host: localNet?.host || printer?.host?.trim() || null,
      port: localNet?.port ?? printer?.port ?? null,
      branchId: printer?.branchId ?? null,
    };
  }

  if (hasCupsTarget(printer) || hasNetworkTarget(printer)) {
    return {
      cupsName: printer?.cupsName?.trim() || null,
      host: printer?.host?.trim() || null,
      port: printer?.port ?? null,
      branchId: printer?.branchId ?? null,
    };
  }

  const branchId = printer?.branchId?.trim();
  let cupsName: string | null = null;
  if (branchId) {
    try {
      const list = await fetchBranches();
      const branch = list.find((b) => b.id === branchId);
      cupsName = branch?.receipt?.printerCupsName?.trim() || null;
    } catch {
      // leave null
    }
  }
  return {
    cupsName,
    host: printer?.host?.trim() || null,
    port: printer?.port ?? null,
    branchId: branchId || printer?.branchId || null,
  };
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
 *   2. Browser POSTs to Till Print Bridge on this PC (127.0.0.1:19500)
 *   3. Bridge sends raw to CUPS / Windows spooler / TCP 9100
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
): Promise<boolean> {
  const id = saleId.trim();
  if (!id) {
    window.print();
    return false;
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
      return true;
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Could not reach the printer. Check Settings → Desktop & LAN → Printer.",
      );
      throw e;
    }
  }

  const resolved = await resolvePrinterTarget(printer);
  const cupsName = resolved?.cupsName?.trim() || "";
  const host = resolved?.host?.trim() || "";

  if (!cupsName && !host) {
    toast.message(
      "No receipt printer configured. Use Detect printers on the till, or set the printer name under Branches → Receipt details.",
      { duration: 10_000 },
    );
    return false;
  }

  const bridgeUp = await isTillPrintBridgeUp();
  if (!bridgeUp) {
    toast.error(
      `Till Print Bridge is not running on this PC. ${TILL_BRIDGE_START_HINT}`,
      { duration: 14_000 },
    );
    return false;
  }

  try {
    const escpos = await prepareThermalEscPos(id, widthMm, cashTender);
    await printEscPosViaTillBridge(escpos, {
      name: cupsName || null,
      host: host || null,
      port: resolved?.port ?? 9100,
    });
    toast.success("Sent to receipt printer.");
    return true;
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Could not reach the receipt printer.";
    toast.error(msg, { duration: 10_000 });
    throw e;
  }
}

/**
 * Print a storefront web-order pickup ticket on the branch thermal printer.
 * Same till-bridge path as POS receipts. Quiet on missing printer when
 * `opts.quiet` is set (used for background auto-print).
 */
export async function printWebOrderReceipt(
  orderId: string,
  widthMm: number = DESKTOP_THERMAL_WIDTH_MM,
  printer?: LocalReceiptPrinterTarget | null,
  opts?: { quiet?: boolean },
): Promise<boolean> {
  const id = orderId.trim();
  if (!id) {
    return false;
  }

  const quiet = Boolean(opts?.quiet);

  if (IS_DESKTOP) {
    try {
      const params = new URLSearchParams({ widthMm: String(widthMm) });
      await apiRequest<void>(
        `/api/v1/desktop/devices/print/web-order/${encodeURIComponent(id)}?${params}`,
        { method: "POST", toast: false },
      );
      if (!quiet) toast.success("Web order sent to receipt printer.");
      return true;
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Could not auto-print web order. Check Settings → Desktop & LAN → Printer.",
        { duration: quiet ? 8_000 : 10_000 },
      );
      return false;
    }
  }

  const resolved = await resolvePrinterTarget(printer);
  const cupsName = resolved?.cupsName?.trim() || "";
  const host = resolved?.host?.trim() || "";

  if (!cupsName && !host) {
    toast.message(
      "Web order received, but no receipt printer is configured. Use Detect printers on the till, or set the printer name under Branches → Receipt details.",
      { duration: 10_000 },
    );
    return false;
  }

  const bridgeUp = await isTillPrintBridgeUp();
  if (!bridgeUp) {
    toast.error(
      `Web order received, but Till Print Bridge is not running. ${TILL_BRIDGE_START_HINT}`,
      { duration: 14_000 },
    );
    return false;
  }

  try {
    const escpos = await fetchWebOrderReceiptThermal(id, widthMm);
    await printEscPosViaTillBridge(escpos, {
      name: cupsName || null,
      host: host || null,
      port: resolved?.port ?? 9100,
    });
    if (!quiet) toast.success("Web order sent to receipt printer.");
    return true;
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Could not auto-print web order.";
    toast.error(msg, { duration: 10_000 });
    return false;
  }
}
