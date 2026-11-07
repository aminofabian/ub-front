"use client";

import { useCallback, useEffect, useState } from "react";

import { TAG_LABEL, TAG_NOTE, TAG_PANEL } from "@/components/price-tags/price-tag-chrome";
import { FIELD_CLASS } from "@/components/price-tags/price-tag-inputs";
import { CATALOG_BTN_GHOST, CATALOG_BTN_OUTLINE } from "@/app/(dashboard)/products/_components/catalog-chrome";
import type { LabelPrinterSettings } from "@/lib/price-tags/label-printer";
import { fetchTillCupsPrinters, type TillCupsPrinter } from "@/lib/till-print-bridge";
import { cn } from "@/lib/utils";

type Detection =
  | { state: "idle" | "looking" }
  | { state: "found"; printers: TillCupsPrinter[] }
  | { state: "no-bridge"; localNetwork: PermissionState | null };

/**
 * Chrome asks before a website may reach this computer ("Local network
 * access"), and reports a refusal as a CORS error. Knowing the permission
 * lets the page say what to change instead of blaming the bridge.
 */
async function localNetworkPermission(): Promise<PermissionState | null> {
  try {
    const status = await navigator.permissions.query({
      name: "local-network-access" as PermissionName,
    });
    return status.state;
  } catch {
    // Browsers without this permission (Safari, Firefox, older Chrome).
    return null;
  }
}

function problemCopy(detection: Detection): string | null {
  if (detection.state !== "no-bridge") return null;
  if (detection.localNetwork === "denied") {
    return "Chrome is blocking this site from reaching this computer, so no printers are listed. Click the icon left of the address bar, open Site settings, set “Local network access” to Allow, reload, then press Detect printers.";
  }
  return "This page cannot reach the Palmart print bridge on this computer. Start the bridge (the same helper the till uses for receipts), or allow “Local network access” for this site and let it through any ad blocker, then press Detect printers.";
}

/**
 * Which printer on this computer gets the labels. The list comes from the
 * Palmart print bridge, the same helper that prints till receipts.
 */
export function PriceTagLabelPrinter({
  settings,
  onChange,
  onCalibrate,
}: {
  settings: LabelPrinterSettings;
  onChange: (next: LabelPrinterSettings) => void;
  /** Sends GAPDETECT so the printer learns this roll's labels and gaps. */
  onCalibrate: () => Promise<void>;
}) {
  const [calibrating, setCalibrating] = useState(false);
  const [detection, setDetection] = useState<Detection>({ state: "idle" });

  const detect = useCallback(async () => {
    setDetection({ state: "looking" });
    try {
      const list = await fetchTillCupsPrinters();
      setDetection({ state: "found", printers: list.printers });
    } catch {
      setDetection({ state: "no-bridge", localNetwork: await localNetworkPermission() });
    }
  }, []);

  useEffect(() => {
    void detect();
  }, [detect]);

  const printers = detection.state === "found" ? detection.printers : [];
  const known = printers.some((printer) => printer.name === settings.queueName);
  const problem = problemCopy(detection);
  const taught = settings.taughtRoll;

  return (
    <div className={cn(TAG_PANEL, "flex flex-col gap-2 px-3 py-2.5")}>
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <label className="flex min-w-0 flex-1 basis-56 flex-col gap-1.5">
          <span className={TAG_LABEL}>Label printer on this computer</span>
          <select
            value={settings.queueName}
            className={FIELD_CLASS}
            onChange={(event) => onChange({ ...settings, queueName: event.target.value })}
          >
            <option value="">{detection.state === "looking" ? "Looking for printers…" : "Choose a printer"}</option>
            {printers.map((printer) => (
              <option key={printer.name} value={printer.name}>
                {printer.name}
              </option>
            ))}
            {settings.queueName && !known ? <option value={settings.queueName}>{settings.queueName}</option> : null}
          </select>
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={CATALOG_BTN_GHOST} disabled={detection.state === "looking"} onClick={() => void detect()}>
            {detection.state === "looking" ? "Looking…" : "Detect printers"}
          </button>
          <button
            type="button"
            className={CATALOG_BTN_OUTLINE}
            disabled={!settings.queueName || calibrating}
            title="The printer feeds a few labels while it measures them. Do this whenever you load a new kind of roll."
            onClick={() => {
              setCalibrating(true);
              void onCalibrate().finally(() => setCalibrating(false));
            }}
          >
            {calibrating ? "Sending…" : "Teach printer this roll"}
          </button>
          <label className="flex h-8 items-center gap-2 px-1 text-[12.5px] pointer-coarse:h-10">
            <input
              type="checkbox"
              className="size-4 accent-[#1D4B3B]"
              checked={settings.flip}
              onChange={(event) => onChange({ ...settings, flip: event.target.checked })}
            />
            Upside down? Turn 180°
          </label>
        </div>
      </div>
      {problem ? (
        <p className={cn(TAG_NOTE, "max-w-prose text-[#A55237]")}>{problem}</p>
      ) : (
        <p className={cn(TAG_NOTE, "max-w-prose")}>
          {taught
            ? `Taught ${taught.labelWidthMm} × ${taught.labelHeightMm} mm${taught.across > 1 ? `, ${taught.across} across` : ""}. `
            : "Not taught a roll yet: teach it once so it stops on each gap. "}
          Labels go straight to the printer; no driver or paper size needed.
        </p>
      )}
    </div>
  );
}
