/**
 * Download URLs + OS detection for the Till Print Bridge installer package.
 */

export type TillBridgeDownloadOs = "macos" | "windows" | "linux" | "unknown";

export const TILL_BRIDGE_DOWNLOADS = {
  macos: "/downloads/palmart-till-print-bridge-macos.zip",
  windows: "/downloads/palmart-till-print-bridge-windows.zip",
  linux: "/downloads/palmart-till-print-bridge-linux.zip",
} as const;

export function detectTillBridgeDownloadOs(
  ua = typeof navigator !== "undefined" ? navigator.userAgent : "",
): TillBridgeDownloadOs {
  const s = ua || "";
  if (/Windows/i.test(s)) return "windows";
  if (/Mac OS X|Macintosh/i.test(s)) return "macos";
  if (/Linux/i.test(s) && !/Android/i.test(s)) return "linux";
  return "unknown";
}

export function tillBridgeDownloadHref(
  os: TillBridgeDownloadOs = detectTillBridgeDownloadOs(),
): string {
  if (os === "windows") return TILL_BRIDGE_DOWNLOADS.windows;
  if (os === "linux") return TILL_BRIDGE_DOWNLOADS.linux;
  // Default to macOS package when unknown (common for our tills); user can pick others.
  return TILL_BRIDGE_DOWNLOADS.macos;
}

export function tillBridgeDownloadLabel(os: TillBridgeDownloadOs): string {
  switch (os) {
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
