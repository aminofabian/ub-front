"use client";

import {
  apiRequest,
  fetchBranches,
  fetchSaleReceiptThermal,
  fetchWebOrderReceiptThermal,
} from "@/lib/api";
import {
  appendCashTenderEscPos,
  appendDrawerKickEscPos,
  type CashTenderEscPos,
} from "@/lib/escpos-cash-tender";
import { IS_DESKTOP } from "@/lib/runtime";
import {
  buildSupplyInvoiceEscPos,
  type SupplyInvoiceReceiptSnapshot,
} from "@/lib/supply-invoice-receipt";
import {
  getLocalTillCupsName,
  getLocalTillNetworkTarget,
  isTillPrintBridgeUp,
  kickCashDrawerViaTillBridge,
  printEscPosViaTillBridge,
  TILL_BRIDGE_START_HINT,
  TILL_PRINT_TIMEOUT_ERROR,
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

export type PrintPosReceiptOptions = {
  /**
   * Append ESC/POS cash-drawer kick to the print job (and also try a
   * separate /drawer/kick). Use for cash / cash-split tenders.
   */
  openDrawer?: boolean;
  /** Skip toasts — used for automatic post-sale print so cashiers can sell without a printer. */
  quiet?: boolean;
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

/**
 * Retry a receipt once. Skipped for print timeouts, where the job may already be
 * spooled and a second attempt would hand the customer two receipts.
 */
async function withOneRetry(run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (e) {
    if (e instanceof Error && e.name === TILL_PRINT_TIMEOUT_ERROR) {
      throw e;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    await run();
  }
}

async function prepareThermalEscPos(
  saleId: string,
  widthMm: number,
  cashTender?: CashTenderEscPos | null,
  openDrawer?: boolean,
): Promise<Blob> {
  const escpos = await fetchSaleReceiptThermal(
    saleId,
    widthMm,
    cashTender?.received ?? null,
  );
  let raw = new Uint8Array(await escpos.arrayBuffer());
  if (cashTender && cashTender.received > 0) {
    raw = new Uint8Array(appendCashTenderEscPos(raw, cashTender, widthMm));
  }
  if (openDrawer) {
    raw = new Uint8Array(appendDrawerKickEscPos(raw));
  }
  return new Blob([raw], { type: "application/octet-stream" });
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
 * Pass `opts.openDrawer` for cash tenders so the drawer opens with the receipt
 * (works even on older till bridges that lack POST /drawer/kick).
 */
export async function printPosReceipt(
  saleId: string,
  widthMm: number = DESKTOP_THERMAL_WIDTH_MM,
  printer?: LocalReceiptPrinterTarget | null,
  cashTender?: CashTenderEscPos | null,
  opts?: PrintPosReceiptOptions,
): Promise<boolean> {
  const id = saleId.trim();
  const openDrawer = Boolean(opts?.openDrawer);
  const quiet = Boolean(opts?.quiet);
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
      if (openDrawer) {
        void kickCashDrawer(printer);
      }
      if (!quiet) toast.success("Sent to receipt printer.");
      return true;
    } catch (e) {
      if (!quiet) {
        toast.error(
          e instanceof Error
            ? e.message
            : "Could not reach the printer. Check Settings → Desktop & LAN → Printer.",
        );
      }
      throw e;
    }
  }

  const resolved = await resolvePrinterTarget(printer);
  const cupsName = resolved?.cupsName?.trim() || "";
  const host = resolved?.host?.trim() || "";

  if (!cupsName && !host) {
    if (!quiet) {
      toast.message("No printer on this till. The receipt is on screen.", {
        duration: 6_000,
      });
    }
    if (openDrawer) {
      // Still try kick in case a local override exists later — will no-op quietly.
      void kickCashDrawer(printer);
    }
    return false;
  }

  const bridgeUp = await isTillPrintBridgeUp();
  if (!bridgeUp) {
    if (!quiet) {
      toast.message(
        "Printer helper is not running. The receipt is on screen — you can still sell.",
        { duration: 7_000 },
      );
    }
    return false;
  }

  try {
    // Retried once: building the ESC/POS needs an API round-trip, so a single slow
    // response or bridge hiccup should not cost the cashier the automatic receipt.
    await withOneRetry(async () => {
      const escpos = await prepareThermalEscPos(
        id,
        widthMm,
        cashTender,
        openDrawer,
      );
      await printEscPosViaTillBridge(escpos, {
        name: cupsName || null,
        host: host || null,
        port: resolved?.port ?? 9100,
      });
    });
    // Separate kick is best-effort (older bridges return 404 — kick is already
    // in the print job above).
    if (openDrawer) {
      void kickCashDrawer({
        cupsName: cupsName || null,
        host: host || null,
        port: resolved?.port ?? 9100,
        branchId: resolved?.branchId ?? printer?.branchId ?? null,
      });
    }
    if (!quiet) toast.success("Sent to receipt printer.");
    return true;
  } catch (e) {
    if (!quiet) {
      const msg =
        e instanceof Error ? e.message : "Could not reach the receipt printer.";
      toast.error(msg, { duration: 10_000 });
    }
    throw e;
  }
}

/**
 * Open the cash drawer via the receipt printer (ESC/POS kick on RJ12).
 * Call after a cash (or cash-split) tender — independent of receipt print.
 * Quiet on missing printer / bridge (cashier can unlock manually).
 */
export async function kickCashDrawer(
  printer?: LocalReceiptPrinterTarget | null,
): Promise<boolean> {
  if (IS_DESKTOP) {
    try {
      await apiRequest<void>(`/api/v1/desktop/devices/drawer/kick`, {
        method: "POST",
        toast: false,
      });
      return true;
    } catch {
      return false;
    }
  }

  const resolved = await resolvePrinterTarget(printer);
  const cupsName = resolved?.cupsName?.trim() || "";
  const host = resolved?.host?.trim() || "";
  if (!cupsName && !host) {
    return false;
  }

  const bridgeUp = await isTillPrintBridgeUp();
  if (!bridgeUp) {
    return false;
  }

  try {
    await kickCashDrawerViaTillBridge({
      name: cupsName || null,
      host: host || null,
      port: resolved?.port ?? 9100,
    });
    return true;
  } catch {
    return false;
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

/**
 * Print a Path B supply invoice on the till thermal printer (client-built ESC/POS).
 * Quiet when no printer / bridge — receive till still succeeds without paper.
 */
export async function printSupplyInvoiceReceipt(
  snapshot: SupplyInvoiceReceiptSnapshot,
  widthMm: number = DESKTOP_THERMAL_WIDTH_MM,
  printer?: LocalReceiptPrinterTarget | null,
  opts?: { quiet?: boolean },
): Promise<boolean> {
  const quiet = Boolean(opts?.quiet);

  const resolved = await resolvePrinterTarget(printer);
  const cupsName = resolved?.cupsName?.trim() || "";
  const host = resolved?.host?.trim() || "";

  if (!cupsName && !host) {
    if (!quiet) {
      toast.message(
        "Supply posted. No receipt printer configured — set one under Branches → Receipt details, or use Detect printers.",
        { duration: 9_000 },
      );
    }
    return false;
  }

  const bridgeUp = await isTillPrintBridgeUp();
  if (!bridgeUp) {
    if (!quiet) {
      toast.message(
        `Supply posted. Till Print Bridge is not running — slip not printed. ${TILL_BRIDGE_START_HINT}`,
        { duration: 12_000 },
      );
    }
    return false;
  }

  try {
    const raw = buildSupplyInvoiceEscPos(snapshot, widthMm);
    const escpos = new Blob([new Uint8Array(raw)], {
      type: "application/octet-stream",
    });
    await printEscPosViaTillBridge(escpos, {
      name: cupsName || null,
      host: host || null,
      port: resolved?.port ?? 9100,
    });
    if (!quiet) toast.success("Supply invoice sent to printer.");
    return true;
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Could not print supply invoice.";
    toast.error(msg, { duration: 10_000 });
    return false;
  }
}
