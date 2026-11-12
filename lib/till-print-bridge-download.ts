/**
 * Download URLs + OS detection for the Till Print Bridge installer package.
 */

export type TillBridgeDownloadOs =
  | "macos"
  | "windows"
  | "windows7"
  | "linux"
  | "unknown";

export const TILL_BRIDGE_DOWNLOADS = {
  macos: "/downloads/palmart-till-print-bridge-macos.zip",
  windows: "/downloads/palmart-till-print-bridge-windows.zip",
  /** One-file Windows 10/11 installer: the zip embedded in a .cmd. */
  windowsOneClick: "/downloads/Install-Palmart-Print-Bridge.cmd",
  windows7: "/downloads/palmart-till-print-bridge-windows7.zip",
  linux: "/downloads/palmart-till-print-bridge-linux.zip",
} as const;

/** True when UA looks like Windows 7 / Server 2008 R2. */
export function isWindows7UserAgent(
  ua = typeof navigator !== "undefined" ? navigator.userAgent : "",
): boolean {
  // NT 6.1 = Windows 7 / Server 2008 R2
  return /Windows NT 6\.1/i.test(ua || "");
}

export function detectTillBridgeDownloadOs(
  ua = typeof navigator !== "undefined" ? navigator.userAgent : "",
): TillBridgeDownloadOs {
  const s = ua || "";
  if (/Windows/i.test(s)) {
    return isWindows7UserAgent(s) ? "windows7" : "windows";
  }
  if (/Mac OS X|Macintosh/i.test(s)) return "macos";
  if (/Linux/i.test(s) && !/Android/i.test(s)) return "linux";
  return "unknown";
}

export function tillBridgeDownloadHref(
  os: TillBridgeDownloadOs = detectTillBridgeDownloadOs(),
): string {
  if (os === "windows7") return TILL_BRIDGE_DOWNLOADS.windows7;
  if (os === "windows") return TILL_BRIDGE_DOWNLOADS.windows;
  if (os === "linux") return TILL_BRIDGE_DOWNLOADS.linux;
  // Default to macOS package when unknown (common for our tills); user can pick others.
  return TILL_BRIDGE_DOWNLOADS.macos;
}

export function tillBridgeDownloadLabel(os: TillBridgeDownloadOs): string {
  switch (os) {
    case "windows7":
      return "Download for Windows 7";
    case "windows":
      return "Download for Windows";
    case "linux":
      return "Download for Linux";
    case "macos":
      return "Download for macOS";
    default:
      return "Download Print Bridge";
  }
}

function clickDownload(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Placeholder the pack script leaves in the one-file installer. */
const ORIGIN_PLACEHOLDER = "__PALMART_ORIGIN__";

/**
 * Windows 10/11: hand out the single .cmd with this site's origin baked in, so
 * the installer can pre-grant browser local-network access for this tenant
 * (custom domains included) and open Cashier when it is done. Falls back to
 * the zip if the one-file installer is not deployed.
 */
export async function downloadTillPrintBridgeWindowsOneClick(): Promise<boolean> {
  if (typeof document === "undefined" || typeof window === "undefined") return false;
  try {
    const res = await fetch(TILL_BRIDGE_DOWNLOADS.windowsOneClick, { cache: "no-store" });
    if (!res.ok) return false;
    const text = await res.text();
    if (!text.includes(ORIGIN_PLACEHOLDER)) return false;
    const origin = window.location.origin;
    const safeOrigin = /^https?:\/\/[A-Za-z0-9.\-]+(:\d+)?$/.test(origin) ? origin : "";
    const body = text.replace(ORIGIN_PLACEHOLDER, safeOrigin);
    const url = URL.createObjectURL(new Blob([body], { type: "application/octet-stream" }));
    try {
      clickDownload(url, "Install-Palmart-Print-Bridge.cmd");
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
    return true;
  } catch {
    return false;
  }
}

/** Trigger a browser download of the installer for this OS. */
export async function downloadTillPrintBridge(
  os: TillBridgeDownloadOs = detectTillBridgeDownloadOs(),
): Promise<void> {
  if (typeof document === "undefined") return;
  if (os === "windows" && (await downloadTillPrintBridgeWindowsOneClick())) {
    return;
  }
  const href = tillBridgeDownloadHref(os);
  clickDownload(href, href.split("/").pop() || "palmart-till-print-bridge.zip");
}
