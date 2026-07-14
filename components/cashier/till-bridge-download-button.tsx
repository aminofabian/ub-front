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
};

/**
 * Starts a zip download of the Till Print Bridge installer for this OS.
 */
export function TillBridgeDownloadButton({
  compact = false,
  className,
  os,
}: TillBridgeDownloadButtonProps) {
  const resolved = os ?? detectTillBridgeDownloadOs();
  const label = tillBridgeDownloadLabel(resolved);

  const onClick = () => {
    downloadTillPrintBridge(resolved);
    toast.message(
      "Download started. Unzip, run the installer, then come back and Detect printers.",
      { duration: 12_000 },
    );
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Button
        type="button"
        variant={compact ? "outline" : "default"}
        size={compact ? "xs" : "sm"}
        onClick={onClick}
      >
        <Download className="size-3.5" aria-hidden />
        {label}
      </Button>
      {!compact ? (
        <p className="text-[10px] text-muted-foreground">
          Or:{" "}
          <a className="underline" href={TILL_BRIDGE_DOWNLOADS.macos} download>
            macOS
          </a>
          {" · "}
          <a className="underline" href={TILL_BRIDGE_DOWNLOADS.windows} download>
            Windows
          </a>
          {" · "}
          <a className="underline" href={TILL_BRIDGE_DOWNLOADS.linux} download>
            Linux
          </a>
          {" — "}
          <a className="underline" href={tillBridgeDownloadHref(resolved)} download>
            direct link
          </a>
        </p>
      ) : null}
    </div>
  );
}
