"use client";

import {
  apiRequest,
  fetchBranches,
  fetchSaleReceiptThermal,
  fetchWebOrderReceiptThermal,
  isAuthRecoveryError,
} from "@/lib/api";
import { kickDesktopCashDrawer } from "@/lib/desktop-api";
import {
  appendCashTenderEscPos,
  withoutTrailingDrawerKick,
  type CashTenderEscPos,
} from "@/lib/escpos-cash-tender";
import { IS_DESKTOP } from "@/lib/runtime";
import {
  buildSupplyInvoiceEscPos,
  type SupplyInvoiceReceiptSnapshot,
} from "@/lib/supply-invoice-receipt";
import {
  buildGroceryInvoiceEscPos,
  type GroceryInvoiceReceiptSnapshot,
} from "@/lib/grocery-invoice-receipt";
import {
  buildTillSlipEscPos,
  type TillSlip,
  type TillSlipKind,
} from "@/lib/till-slip";
import {
  fetchTillCupsPrinters,
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
   * Open the cash drawer after the receipt is spooled. A separate job —
   * the pulse must not ride inside the receipt bytes.
   */
  openDrawer?: boolean;
  /** Skip toasts — used for automatic post-sale print so cashiers can sell without a printer. */
  quiet?: boolean;
};

/** Let the receipt leave the print head before the drawer pulse hits the same port. */
const DRAWER_AFTER_RECEIPT_MS = 700;

function openDrawerAfterReceipt(
  printer?: LocalReceiptPrinterTarget | null,
): void {
  window.setTimeout(() => {
    void kickCashDrawer(printer);
  }, DRAWER_AFTER_RECEIPT_MS);
}

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
): Promise<Blob> {
  const escpos = await fetchSaleReceiptThermal(
    saleId,
    widthMm,
    cashTender?.received ?? null,
  );
  let raw = withoutTrailingDrawerKick(new Uint8Array(await escpos.arrayBuffer()));
  if (cashTender && cashTender.received > 0) {
    raw = appendCashTenderEscPos(raw, cashTender, widthMm);
  }
  // Copy into a fresh ArrayBuffer. A subarray view is not a BlobPart under
  // the TypeScript lib this production build type-checks with.
  const copy = new ArrayBuffer(raw.byteLength);
  new Uint8Array(copy).set(raw);
  return new Blob([copy], { type: "application/octet-stream" });
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
 * Pass `opts.openDrawer` for cash tenders. The drawer opens in a later job
 * so the kick cannot stall the receipt on the way out.
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
        openDrawerAfterReceipt(printer);
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
      // Nothing to print to. The kick re-checks the target and, finding none,
      // says so (once per page load).
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
      const escpos = await prepareThermalEscPos(id, widthMm, cashTender);
      await printEscPosViaTillBridge(escpos, {
        name: cupsName || null,
        host: host || null,
        port: resolved?.port ?? 9100,
      });
    });
    if (openDrawer) {
      openDrawerAfterReceipt({
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

/** Why a drawer pulse was not sent. */
type DrawerKickResult =
  | { ok: true }
  | {
      ok: false;
      /**
       * `no-printer` and `bridge-down` are setup problems; `error` means a pulse
       * was attempted and something refused or dropped it.
       */
      reason: "no-printer" | "bridge-down" | "error";
      /** Plain-language cause, safe to show a cashier. */
      message: string;
      cause?: unknown;
    };

const DRAWER_TOAST_ID = "cash-drawer-kick";

/**
 * Plenty of tills run without a printer, so "no printer" is announced once per
 * page load instead of on every cash sale.
 */
let noPrinterNoticeShown = false;

function drawerErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "ClientTimeoutError") {
      return "The printer did not answer in time.";
    }
    const text = error.message.trim();
    if (text) return text;
  }
  return "The printer refused the drawer pulse.";
}

async function attemptDrawerKick(
  printer?: LocalReceiptPrinterTarget | null,
): Promise<DrawerKickResult> {
  if (IS_DESKTOP) {
    try {
      await kickDesktopCashDrawer();
      return { ok: true };
    } catch (cause) {
      return {
        ok: false,
        reason: "error",
        message: drawerErrorMessage(cause),
        cause,
      };
    }
  }

  const resolved = await resolvePrinterTarget(printer);
  const cupsName = resolved?.cupsName?.trim() || "";
  const host = resolved?.host?.trim() || "";
  if (!cupsName && !host) {
    return {
      ok: false,
      reason: "no-printer",
      message: "No receipt printer is set up on this till.",
    };
  }

  if (!(await isTillPrintBridgeUp())) {
    return {
      ok: false,
      reason: "bridge-down",
      message: "The Till Print Bridge is not running on this computer.",
    };
  }

  try {
    await kickCashDrawerViaTillBridge({
      name: cupsName || null,
      host: host || null,
      port: resolved?.port ?? 9100,
    });
    return { ok: true };
  } catch (cause) {
    return {
      ok: false,
      reason: "error",
      // fetch() rejects with a TypeError when the request never completes: the
      // bridge dropped it, or the browser blocked it (CORS / local network).
      message:
        cause instanceof TypeError
          ? "The browser could not reach the Till Print Bridge."
          : drawerErrorMessage(cause),
      cause,
    };
  }
}

function reportDrawerKickFailure(
  failure: Extract<DrawerKickResult, { ok: false }>,
  quiet: boolean,
): void {
  const line = `[cash-drawer] pulse not sent (${failure.reason}): ${failure.message}`;
  if (failure.reason === "error") {
    console.error(line, failure.cause);
  } else {
    console.warn(line);
  }
  // A signed-out session has its own recovery UI; a toast on top only confuses.
  if (quiet || isAuthRecoveryError(failure.cause)) return;

  if (failure.reason === "no-printer") {
    if (noPrinterNoticeShown) return;
    noPrinterNoticeShown = true;
    toast.message(
      `${failure.message} The cash drawer will not open on its own.`,
      { id: DRAWER_TOAST_ID, duration: 8_000 },
    );
    return;
  }
  toast.error(`Cash drawer did not open. ${failure.message}`, {
    id: DRAWER_TOAST_ID,
    duration: 10_000,
  });
}

/**
 * Open the cash drawer via the receipt printer (ESC/POS kick on RJ12).
 * Call after a cash (or cash-split) tender — independent of receipt print.
 *
 * Never rejects. A failure is logged to the console and shown as a toast (one
 * shared id, so repeated failures replace each other instead of stacking) so
 * the cashier knows to open the drawer by hand. A till with no printer at all
 * is told once per page load. Pass `quiet` to log only.
 */
export async function kickCashDrawer(
  printer?: LocalReceiptPrinterTarget | null,
  opts?: { quiet?: boolean },
): Promise<boolean> {
  let result: DrawerKickResult;
  try {
    result = await attemptDrawerKick(printer);
  } catch (cause) {
    result = {
      ok: false,
      reason: "error",
      message: drawerErrorMessage(cause),
      cause,
    };
  }
  if (result.ok) return true;
  reportDrawerKickFailure(result, Boolean(opts?.quiet));
  return false;
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
 * Print a department-counter (GI-*) invoice on the till thermal printer.
 * Quiet when no printer / bridge — forwarding still succeeds without paper.
 */
export async function printGroceryInvoiceReceipt(
  snapshot: GroceryInvoiceReceiptSnapshot,
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
        "No receipt printer configured — use Detect printers on this counter, or set one under Branches → Receipt details.",
        { duration: 9_000 },
      );
    }
    return false;
  }

  const bridgeUp = await isTillPrintBridgeUp();
  if (!bridgeUp) {
    if (!quiet) {
      toast.message(
        `Till Print Bridge is not running — slip not printed. ${TILL_BRIDGE_START_HINT}`,
        { duration: 12_000 },
      );
    }
    return false;
  }

  try {
    const raw = buildGroceryInvoiceEscPos(snapshot, widthMm);
    const escpos = new Blob([new Uint8Array(raw)], {
      type: "application/octet-stream",
    });
    await printEscPosViaTillBridge(escpos, {
      name: cupsName || null,
      host: host || null,
      port: resolved?.port ?? 9100,
    });
    if (!quiet) toast.success("Invoice sent to receipt printer.");
    return true;
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Could not print department invoice.";
    if (!quiet) toast.error(msg, { duration: 10_000 });
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

/**
 * One copy. A timeout counts as sent — the bytes may already be on the spool,
 * and a second attempt would print the slip again.
 */
export type TillSlipPrintResult = "printed" | "failed" | "maybe";

/**
 * Print a purchase order or goods receipt aimed at this till.
 * Does not retry. The caller decides whether a definite failure may try once more.
 */
export async function printTillSlip(
  slip: TillSlip,
  kind: TillSlipKind,
  widthMm: number = DESKTOP_THERMAL_WIDTH_MM,
  printer?: LocalReceiptPrinterTarget | null,
  opts?: { quiet?: boolean },
): Promise<TillSlipPrintResult> {
  const quiet = Boolean(opts?.quiet);
  const resolved = await resolvePrinterTarget(printer);
  let cupsName = resolved?.cupsName?.trim() || "";
  const host = resolved?.host?.trim() || "";
  const label = kind === "receipt" ? "Goods receipt" : "Purchase order";

  // Same machine as Sell: if the branch name is missing, use the printer
  // the local helper already detected.
  if (!cupsName && !host) {
    try {
      const detected = await fetchTillCupsPrinters();
      cupsName =
        detected.suggested?.trim() || detected.defaultName?.trim() || "";
    } catch {
      if (!quiet) {
        toast.error(
          `${label} is on this till, but the printer helper is not running. ${TILL_BRIDGE_START_HINT}`,
          { duration: 14_000 },
        );
      }
      return "failed";
    }
  }

  if (!cupsName && !host) {
    if (!quiet) {
      toast.message(
        `${label} is on this till, but no receipt printer is set. Use Detect printers on Sell.`,
        { duration: 12_000 },
      );
    }
    return "failed";
  }

  try {
    const raw = buildTillSlipEscPos(slip, kind, widthMm);
    const escpos = new Blob([new Uint8Array(raw)], {
      type: "application/octet-stream",
    });
    await printEscPosViaTillBridge(escpos, {
      name: cupsName || null,
      host: host || null,
      port: resolved?.port ?? 9100,
    });
    if (!quiet) toast.success(`${label} ${slip.reference} printed.`);
    return "printed";
  } catch (e) {
    if (e instanceof Error && e.name === TILL_PRINT_TIMEOUT_ERROR) {
      return "maybe";
    }
    if (!quiet) {
      const msg =
        e instanceof Error
          ? e.message
          : `Could not print ${label.toLowerCase()}.`;
      toast.error(msg, { duration: 10_000 });
    }
    return "failed";
  }
}
