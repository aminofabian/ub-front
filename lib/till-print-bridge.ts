/**
 * Client helpers for the Till Print Bridge (localhost ESC/POS on the cashier Mac).
 *
 * Cloud Palmart cannot print to USB printers — the browser must POST raw bytes to
 * a process on the till machine (this bridge or Palmart Desktop's device server).
 */

export const TILL_PRINT_BRIDGE_URL =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_TILL_PRINT_BRIDGE_URL?.trim()) ||
  "http://127.0.0.1:19500";

/** Machine-local CUPS override when branch settings are empty or differ per till Mac. */
const LOCAL_CUPS_KEY = "palmart:till-printer-cups:v1";

export type TillBridgeHealth = {
  ok?: boolean;
  cups?: boolean;
  lpstat?: boolean;
};

export type TillCupsPrinter = {
  name: string;
  uri: string;
  isDefault: boolean;
  likelyThermal: boolean;
};

export type TillCupsPrinterList = {
  ok: boolean;
  printers: TillCupsPrinter[];
  /** Best guess for a receipt printer (thermal hint, else default, else sole queue). */
  suggested: string | null;
  defaultName: string | null;
};

/** True when the till bridge responds on localhost (run `pnpm till-print-bridge`). */
export async function isTillPrintBridgeUp(): Promise<boolean> {
  try {
    const res = await fetch(`${TILL_PRINT_BRIDGE_URL}/health`, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as TillBridgeHealth;
    return Boolean(data.ok);
  } catch {
    return false;
  }
}

/** List CUPS queues on this Mac via the till bridge (`lpstat -v`). */
export async function fetchTillCupsPrinters(): Promise<TillCupsPrinterList> {
  const res = await fetch(`${TILL_PRINT_BRIDGE_URL}/printers`, {
    method: "GET",
    mode: "cors",
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text.trim() ||
        `Till print bridge returned HTTP ${res.status} listing printers.`,
    );
  }
  const data = (await res.json()) as TillCupsPrinterList;
  return {
    ok: Boolean(data.ok),
    printers: Array.isArray(data.printers) ? data.printers : [],
    suggested: typeof data.suggested === "string" ? data.suggested : null,
    defaultName: typeof data.defaultName === "string" ? data.defaultName : null,
  };
}

export function getLocalTillCupsName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(LOCAL_CUPS_KEY)?.trim();
    return v || null;
  } catch {
    return null;
  }
}

export function setLocalTillCupsName(name: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const t = name?.trim() || "";
    if (!t) window.localStorage.removeItem(LOCAL_CUPS_KEY);
    else window.localStorage.setItem(LOCAL_CUPS_KEY, t);
  } catch {
    // ignore quota / private mode
  }
}

/** Send raw ESC/POS bytes to the till bridge → CUPS `lp -o raw`. */
export async function printEscPosViaTillBridge(
  escpos: Blob,
  cupsName: string,
): Promise<void> {
  const name = cupsName.trim();
  if (!name) {
    throw new Error("No CUPS printer name configured for this branch.");
  }
  const res = await fetch(`${TILL_PRINT_BRIDGE_URL}/print`, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Printer-Cups-Name": name,
    },
    body: escpos,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text.trim() ||
        `Till print bridge returned HTTP ${res.status}. Is pnpm till-print-bridge running?`,
    );
  }
}

export const TILL_BRIDGE_START_HINT =
  "On this Mac, in the frontend folder run: node scripts/till-print-bridge.mjs (or double-click scripts/start-till-print-bridge.command) and leave it open while cashiering.";
