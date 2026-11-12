"use client";

import { useCallback, useEffect, useState } from "react";

import { TAG_NOTE } from "@/components/price-tags/price-tag-chrome";
import { FIELD_CLASS } from "@/components/price-tags/price-tag-inputs";
import { CATALOG_BTN_GHOST, CATALOG_BTN_OUTLINE } from "@/app/(dashboard)/products/_components/catalog-chrome";
import type { LabelPrinterSettings } from "@/lib/price-tags/label-printer";
import {
  fetchTillCupsPrinters,
  queryLoopbackPermission,
  type TillCupsPrinter,
} from "@/lib/till-print-bridge";
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
  return queryLoopbackPermission();
}

function problemCopy(detection: Detection): string | null {
  if (detection.state !== "no-bridge") return null;
  if (detection.localNetwork === "denied") {
    return "Chrome is blocking this computer. Allow local network access, reload, then Detect.";
  }
  return "Print bridge is off. Start it, then Detect.";
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

  const taughtLabel = taught
    ? `${taught.labelWidthMm}×${taught.labelHeightMm}${taught.across > 1 ? ` · ${taught.across}` : ""}`
    : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          aria-label="Label printer"
          value={settings.queueName}
          className={cn(FIELD_CLASS, "min-w-0 flex-1 basis-40")}
          onChange={(event) => onChange({ ...settings, queueName: event.target.value })}
        >
          <option value="">{detection.state === "looking" ? "Looking…" : "Printer"}</option>
          {printers.map((printer) => (
            <option key={printer.name} value={printer.name}>
              {printer.name}
            </option>
          ))}
          {settings.queueName && !known ? <option value={settings.queueName}>{settings.queueName}</option> : null}
        </select>
        <button type="button" className={CATALOG_BTN_GHOST} disabled={detection.state === "looking"} onClick={() => void detect()}>
          {detection.state === "looking" ? "Looking…" : "Detect"}
        </button>
        <button
          type="button"
          className={CATALOG_BTN_OUTLINE}
          disabled={!settings.queueName || calibrating}
          title="Feeds a few labels so the printer learns the gap. Once each time you load a different roll."
          onClick={() => {
            setCalibrating(true);
            void onCalibrate().finally(() => setCalibrating(false));
          }}
        >
          {calibrating ? "Sending…" : "Teach"}
        </button>
        <label className="flex h-8 items-center gap-1.5 px-1 text-[12.5px] text-[#556159] pointer-coarse:h-10" title="Turn every label upside down">
          <input
            type="checkbox"
            className="size-4 accent-[#1D4B3B]"
            checked={settings.flip}
            onChange={(event) => onChange({ ...settings, flip: event.target.checked })}
          />
          180°
        </label>
        {taughtLabel && !problem ? (
          <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[#556159]" title="Roll the printer was last taught">
            Taught {taughtLabel}
          </span>
        ) : null}
      </div>
      {problem ? <p className={cn(TAG_NOTE, "text-[#A55237]")}>{problem}</p> : null}
    </div>
  );
}
