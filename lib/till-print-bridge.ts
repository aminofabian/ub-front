/**
 * Client helpers for the Till Print Bridge (localhost ESC/POS on the till PC).
 *
 * Cloud Palmart cannot print to USB printers — the browser must POST raw bytes to
 * a process on the till machine (this bridge or Palmart Desktop's device server).
 *
 * Supports macOS/Linux (CUPS), Windows (spooler RAW), and network ESC/POS (TCP 9100).
 */

export const TILL_PRINT_BRIDGE_URL =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_TILL_PRINT_BRIDGE_URL?.trim()) ||
  "http://127.0.0.1:19500";

/** Machine-local printer name override when branch settings differ per till. */
const LOCAL_PRINTER_KEY = "palmart:till-printer-cups:v1";
/** Optional machine-local network raw target: { host, port }. */
const LOCAL_NETWORK_KEY = "palmart:till-printer-network:v1";

export type TillBridgeHealth = {
  ok?: boolean;
  platform?: string;
  cups?: boolean;
  lpstat?: boolean;
  spooler?: boolean;
  powershell?: boolean;
  networkRaw?: boolean;
  port?: number;
};

export type TillCupsPrinter = {
  name: string;
  uri: string;
  isDefault: boolean;
  likelyThermal: boolean;
};

export type TillCupsPrinterList = {
  ok: boolean;
  platform?: string | null;
  printers: TillCupsPrinter[];
  /** Best guess for a receipt printer (thermal hint, else default, else sole queue). */
  suggested: string | null;
  defaultName: string | null;
};

export type TillBridgePrintTarget = {
  /** Local spooler / CUPS / Windows printer name. */
  name?: string | null;
  /** Network ESC/POS host (Ethernet/Wi‑Fi printers). */
  host?: string | null;
  port?: number | null;
};

export type TillNetworkTarget = {
  host: string;
  port: number;
};

/** True when the till bridge responds on localhost (run `pnpm till-print-bridge`). */
export async function isTillPrintBridgeUp(): Promise<boolean> {
  try {
    const health = await fetchTillBridgeHealth();
    return Boolean(health?.ok);
  } catch {
    return false;
  }
}

export async function fetchTillBridgeHealth(): Promise<TillBridgeHealth | null> {
  try {
    const res = await fetch(`${TILL_PRINT_BRIDGE_URL}/health`, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as TillBridgeHealth;
  } catch {
    return null;
  }
}

/** List local printers on this machine via the till bridge. */
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
    platform: typeof data.platform === "string" ? data.platform : null,
    printers: Array.isArray(data.printers) ? data.printers : [],
    suggested: typeof data.suggested === "string" ? data.suggested : null,
    defaultName: typeof data.defaultName === "string" ? data.defaultName : null,
  };
}

export function getLocalTillCupsName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(LOCAL_PRINTER_KEY)?.trim();
    return v || null;
  } catch {
    return null;
  }
}

export function setLocalTillCupsName(name: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const t = name?.trim() || "";
    if (!t) window.localStorage.removeItem(LOCAL_PRINTER_KEY);
    else window.localStorage.setItem(LOCAL_PRINTER_KEY, t);
  } catch {
    // ignore quota / private mode
  }
}

export function getLocalTillNetworkTarget(): TillNetworkTarget | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_NETWORK_KEY)?.trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { host?: unknown; port?: unknown };
    const host = typeof parsed.host === "string" ? parsed.host.trim() : "";
    const port =
      typeof parsed.port === "number" && Number.isFinite(parsed.port)
        ? Math.trunc(parsed.port)
        : 9100;
    if (!host) return null;
    return { host, port: port > 0 && port <= 65535 ? port : 9100 };
  } catch {
    return null;
  }
}

export function setLocalTillNetworkTarget(
  target: TillNetworkTarget | null,
): void {
  if (typeof window === "undefined") return;
  try {
    if (!target?.host?.trim()) {
      window.localStorage.removeItem(LOCAL_NETWORK_KEY);
      return;
    }
    window.localStorage.setItem(
      LOCAL_NETWORK_KEY,
      JSON.stringify({
        host: target.host.trim(),
        port: target.port > 0 && target.port <= 65535 ? target.port : 9100,
      }),
    );
  } catch {
    // ignore
  }
}

/** Send raw ESC/POS bytes to the till bridge (local spooler or TCP 9100). */
export async function printEscPosViaTillBridge(
  escpos: Blob,
  target: string | TillBridgePrintTarget,
): Promise<void> {
  const opts: TillBridgePrintTarget =
    typeof target === "string" ? { name: target } : target ?? {};
  const name = opts.name?.trim() || "";
  const host = opts.host?.trim() || "";
  const port =
    opts.port != null && Number.isFinite(opts.port)
      ? Math.trunc(opts.port)
      : 9100;

  if (!host && !name) {
    throw new Error("No receipt printer configured for this branch.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
  };
  if (host) {
    headers["X-Printer-Host"] = host;
    headers["X-Printer-Port"] = String(port > 0 ? port : 9100);
  }
  if (name) {
    headers["X-Printer-Cups-Name"] = name;
  }

  const res = await fetch(`${TILL_PRINT_BRIDGE_URL}/print`, {
    method: "POST",
    mode: "cors",
    headers,
    body: escpos,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text.trim() ||
        `Till print bridge returned HTTP ${res.status}. Is the till print bridge running?`,
    );
  }
}

export const TILL_BRIDGE_START_HINT =
  "The bridge must run on THIS computer (the one with the printer), not another PC. Windows: unzip Download → run Install-Palmart-Print-Bridge.cmd once (autostarts hidden at sign-in). macOS: Install Palmart Print Bridge.command. Linux: bash install-palmart-print-bridge.sh.";
