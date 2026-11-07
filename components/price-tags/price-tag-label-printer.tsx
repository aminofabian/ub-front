"use client";

import { useCallback, useEffect, useState } from "react";

import { FIELD_CLASS } from "@/components/price-tags/price-tag-inputs";
import { CATALOG_BTN_GHOST } from "@/app/(dashboard)/products/_components/catalog-chrome";
import type { LabelPrinterSettings } from "@/lib/price-tags/label-printer";
import { fetchTillCupsPrinters, type TillCupsPrinter } from "@/lib/till-print-bridge";
import { cn } from "@/lib/utils";

type Detection =
  | { state: "idle" | "looking" }
  | { state: "found"; printers: TillCupsPrinter[] }
  | { state: "no-bridge" };

/**
 * Which printer on this computer gets the labels. The list comes from the
 * Palmart print bridge, the same helper that prints till receipts.
 */
export function PriceTagLabelPrinter({
  settings,
  onChange,
}: {
  settings: LabelPrinterSettings;
  onChange: (next: LabelPrinterSettings) => void;
}) {
  const [detection, setDetection] = useState<Detection>({ state: "idle" });

  const detect = useCallback(async () => {
    setDetection({ state: "looking" });
    try {
      const list = await fetchTillCupsPrinters();
      setDetection({ state: "found", printers: list.printers });
    } catch {
      setDetection({ state: "no-bridge" });
    }
  }, []);

  useEffect(() => {
    void detect();
  }, [detect]);

  const printers = detection.state === "found" ? detection.printers : [];
  const known = printers.some((printer) => printer.name === settings.queueName);

  return (
    <div className="flex flex-wrap items-end gap-2 border-l-2 border-[#1D4B3B] bg-white/70 px-3 py-2">
      <label className="flex min-w-56 flex-col gap-1 text-[11px] text-[#556159]">
        Label printer on this computer
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
      <button
        type="button"
        className={CATALOG_BTN_GHOST}
        disabled={detection.state === "looking"}
        onClick={() => void detect()}
      >
        Detect printers
      </button>
      <label className="flex h-8 items-center gap-1.5 text-[12.5px]">
        <input
          type="checkbox"
          checked={settings.flip}
          onChange={(event) => onChange({ ...settings, flip: event.target.checked })}
        />
        Upside down? Turn 180°
      </label>
      <p className={cn("basis-full text-[12px] leading-relaxed text-[#556159]")}>
        {detection.state === "no-bridge"
          ? "The Palmart print bridge is not running on this computer, so labels cannot go straight to the printer. Start it (the same helper the till uses for receipts), then Detect printers."
          : "Labels go straight to the printer as TSPL, the language most 4-inch label printers speak, so no printer driver or paper size is needed. Prices are checked first."}
      </p>
    </div>
  );
}
