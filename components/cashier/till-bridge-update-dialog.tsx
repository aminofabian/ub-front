"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  detectTillBridgeDownloadOs,
  downloadTillPrintBridge,
  type TillBridgeDownloadOs,
} from "@/lib/till-print-bridge-download";

const DISMISS_KEY = "kiosk.till-bridge-update.drawer-queue";

function updateWasDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismiss(): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Private mode. The message simply returns on the next page load.
  }
}

/** Asks whoever is at the till to download and run the printer-helper update. */
export function TillBridgeUpdateDialog({ needed }: { needed: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const os = detectTillBridgeDownloadOs();

  useEffect(() => {
    setDismissed(updateWasDismissed());
  }, []);

  const dismiss = () => {
    rememberDismiss();
    setDismissed(true);
  };

  return (
    <Dialog open={needed && !dismissed} onOpenChange={(next) => { if (!next) dismiss(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update the printer helper</DialogTitle>
          <DialogDescription>
            This computer&apos;s printer helper cannot record a drawer opening that has no sale and no drawout. Anyone at this till can update it.
          </DialogDescription>
        </DialogHeader>
        {downloaded ? <UpdateSteps os={os} /> : <BeforeDownload />}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={dismiss}>
            Not now
          </Button>
          <Button type="button" onClick={() => void startDownload(setDownloaded)}>
            {downloaded ? "Download again" : "Download the update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BeforeDownload() {
  return (
    <p className="text-[13px] leading-snug text-[var(--op-muted,#556159)]">
      The helper runs on this computer, next to the printer. Download puts the update in Downloads. Open that file and click Run. Selling can continue.
    </p>
  );
}

function UpdateSteps({ os }: { os: TillBridgeDownloadOs }) {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-[13px] leading-snug text-[var(--op-ink,#121A16)]">
      {stepsFor(os).map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}

function stepsFor(os: TillBridgeDownloadOs): string[] {
  if (os === "windows") {
    return [
      "Open Downloads.",
      "Open Install-Kiosk-Print-Bridge.cmd and click Run.",
      "Leave this page open. This message closes when the helper has restarted.",
    ];
  }
  return [
    "Open Downloads and unzip the file.",
    "Run the installer in that folder.",
    "Leave this page open. This message closes when the helper has restarted.",
  ];
}

async function startDownload(markDownloaded: (done: boolean) => void): Promise<void> {
  await downloadTillPrintBridge();
  markDownloaded(true);
}
