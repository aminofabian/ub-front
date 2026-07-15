"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  detectTillBridgeDownloadOs,
  downloadTillPrintBridge,
  tillBridgeDownloadHref,
  tillBridgeDownloadLabel,
  TILL_BRIDGE_DOWNLOADS,
  type TillBridgeDownloadOs,
} from "@/lib/till-print-bridge-download";
import { cn } from "@/lib/utils";

type TillBridgeDownloadButtonProps = {
  compact?: boolean;
  className?: string;
  /** Force a specific package; default = detect from user agent. */
  os?: TillBridgeDownloadOs;
  /** When the bridge is already installed — label as update/reinstall. */
  update?: boolean;
};

function toastForOs(os: TillBridgeDownloadOs): string {
  if (os === "windows7") {
    return "Download started. Unzip, run Install-Palmart-Print-Bridge-Win7.cmd (no Node.js). Then Detect printers. Use Chrome 109 on Windows 7.";
  }
  if (os === "windows") {
    return "Download started. Unzip, run Install-Palmart-Print-Bridge.cmd. On Windows 7 the same zip auto-switches to the no-Node installer.";
  }
  return "Download started. Unzip, run the installer once, then come back and Detect printers.";
}

function isWindowsFamily(os: TillBridgeDownloadOs): boolean {
  return os === "windows" || os === "windows7";
}

/**
 * Starts a zip download of the Till Print Bridge installer for this OS.
 */
export function TillBridgeDownloadButton({
  compact = false,
  className,
  os,
  update = false,
}: TillBridgeDownloadButtonProps) {
  const resolved = os ?? detectTillBridgeDownloadOs();
  const label = update
    ? resolved === "windows7"
      ? "Update bridge (Win7)"
      : resolved === "windows"
        ? "Update print bridge"
        : `Update bridge (${tillBridgeDownloadLabel(resolved)})`
    : tillBridgeDownloadLabel(resolved);
  const windowsFamily = isWindowsFamily(resolved);

  const onDownload = (target: TillBridgeDownloadOs) => {
    downloadTillPrintBridge(target);
    toast.message(toastForOs(target), { duration: 12_000 });
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className={cn("flex flex-wrap items-center gap-1.5", compact && "gap-1")}>
        <Button
          type="button"
          variant={compact || update ? "outline" : "default"}
          size={compact ? "xs" : "sm"}
          onClick={() => onDownload(resolved === "windows7" ? "windows7" : resolved)}
        >
          <Download className="size-3.5" aria-hidden />
          {label}
        </Button>
        {windowsFamily ? (
          <Button
            type="button"
            variant="outline"
            size={compact ? "xs" : "sm"}
            onClick={() => onDownload("windows7")}
            title="PowerShell bridge - no Node.js"
          >
            <Download className="size-3.5" aria-hidden />
            {update ? "Update Win7 (no Node)" : "Windows 7 (no Node)"}
          </Button>
        ) : null}
      </div>
      {!compact ? (
        <p className="text-[10px] text-muted-foreground">
          Or:{" "}
          <a className="underline" href={TILL_BRIDGE_DOWNLOADS.macos} download>
            macOS
          </a>
          {" · "}
          <a className="underline" href={TILL_BRIDGE_DOWNLOADS.windows} download>
            Windows 10/11
          </a>
          {" · "}
          <a
            className="underline"
            href={TILL_BRIDGE_DOWNLOADS.windows7}
            download
          >
            Windows 7 (no Node)
          </a>
          {" · "}
          <a className="underline" href={TILL_BRIDGE_DOWNLOADS.linux} download>
            Linux
          </a>
          {" - "}
          <a
            className="underline"
            href={tillBridgeDownloadHref(resolved)}
            download
          >
            direct link
          </a>
        </p>
      ) : (
        <p className="text-[10px] leading-snug text-muted-foreground">
          Windows 7: use{" "}
          <strong className="font-medium text-foreground">Windows 7 (no Node)</strong>{" "}
          - do not install Node.js.
        </p>
      )}
    </div>
  );
}
