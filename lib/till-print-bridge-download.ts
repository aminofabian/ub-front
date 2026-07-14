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

/** Trigger a browser download of the installer zip for this OS. */
export function downloadTillPrintBridge(
  os: TillBridgeDownloadOs = detectTillBridgeDownloadOs(),
): void {
  if (typeof document === "undefined") return;
  const href = tillBridgeDownloadHref(os);
  const a = document.createElement("a");
  a.href = href;
  a.download = href.split("/").pop() || "palmart-till-print-bridge.zip";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
