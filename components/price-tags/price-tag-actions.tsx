"use client";

import { TAG_CHIP, TAG_CHIP_IDLE, TAG_CHIP_ON, TAG_LABEL, TAG_STRIP } from "@/components/price-tags/price-tag-chrome";
import { DraftNumberInput, rangeParser } from "@/components/price-tags/price-tag-inputs";
import { CATALOG_BTN_OUTLINE, CATALOG_BTN_PRIMARY } from "@/app/(dashboard)/products/_components/catalog-chrome";
import { TEMPLATE_COPY, applyTemplate } from "@/lib/price-tags/templates";
import type { SheetGeometry, TagLayout, TagTemplateId } from "@/lib/price-tags/types";
import { cn } from "@/lib/utils";

const TEMPLATES = Object.keys(TEMPLATE_COPY) as TagTemplateId[];
const RANGE_INPUT = "h-8 w-14 px-0 text-center pointer-coarse:h-10";
/** Full width on a phone, where the buttons stack under the thumb; natural width beside the range on wider screens. */
const ACTION = "h-9 flex-1 justify-center sm:flex-none pointer-coarse:h-11";

export type OutputKind = "print" | "pdf" | "label";

/**
 * The tag face to use, which pages or rows to print, and the output buttons.
 * One forest button per view: the label printer when a roll is loaded,
 * otherwise the browser print.
 */
export function PriceTagActions({
  layout,
  geometry,
  totalPages,
  printFrom,
  printTo,
  startAt,
  busy,
  canOutput,
  labelPrinterReady,
  onLayout,
  onPrintFrom,
  onPrintTo,
  onStartAt,
  onOutput,
}: {
  layout: TagLayout;
  geometry: SheetGeometry;
  totalPages: number;
  printFrom: number;
  printTo: number;
  startAt: number;
  busy: OutputKind | null;
  canOutput: boolean;
  labelPrinterReady: boolean;
  onLayout: (update: (current: TagLayout) => TagLayout) => void;
  onPrintFrom: (value: number) => void;
  onPrintTo: (value: number) => void;
  onStartAt: (value: number) => void;
  onOutput: (kind: OutputKind) => void;
}) {
  const roll = layout.media === "label-roll";
  const rangeName = roll ? (geometry.perPage > 1 ? "Rows" : "Labels") : "Pages";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className={TAG_LABEL}>Tag face</span>
        <div className={TAG_STRIP} role="group" aria-label="Tag face">
          {TEMPLATES.map((templateId) => (
            <button
              key={templateId}
              type="button"
              title={TEMPLATE_COPY[templateId].detail}
              aria-pressed={layout.templateId === templateId}
              className={cn(TAG_CHIP, layout.templateId === templateId ? TAG_CHIP_ON : TAG_CHIP_IDLE)}
              onClick={() => onLayout((current) => applyTemplate(current, templateId))}
            >
              {TEMPLATE_COPY[templateId].label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        {geometry.perPage > 1 && !roll ? (
          <label
            className="flex flex-col gap-1.5"
            title="On a part-used sticker sheet, start at the first free label (counted left to right, top to bottom)."
          >
            <span className={TAG_LABEL}>Start at label</span>
            <DraftNumberInput
              value={startAt}
              inputMode="numeric"
              aria-label="Start at label number"
              className={RANGE_INPUT}
              parse={rangeParser(1, geometry.perPage, true)}
              onValue={onStartAt}
            />
          </label>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <span className={TAG_LABEL}>{rangeName}</span>
          <div className="flex items-center gap-1">
            <DraftNumberInput
              value={printFrom}
              inputMode="numeric"
              aria-label={`First ${rangeName.toLowerCase().replace(/s$/, "")} to print`}
              className={RANGE_INPUT}
              parse={rangeParser(1, totalPages, true)}
              onValue={onPrintFrom}
            />
            <span className="text-[12px] text-[#556159]">to</span>
            <DraftNumberInput
              value={printTo}
              inputMode="numeric"
              aria-label={`Last ${rangeName.toLowerCase().replace(/s$/, "")} to print`}
              className={RANGE_INPUT}
              parse={rangeParser(1, totalPages, true)}
              onValue={onPrintTo}
            />
            <span className="pl-1 text-[12px] tabular-nums text-[#556159]">of {totalPages}</span>
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
          <button type="button" className={cn(CATALOG_BTN_OUTLINE, ACTION)} disabled={!canOutput} onClick={() => onOutput("pdf")}>
            {busy === "pdf" ? "Checking prices…" : "Download PDF"}
          </button>
          <button
            type="button"
            className={cn(roll ? CATALOG_BTN_OUTLINE : CATALOG_BTN_PRIMARY, ACTION)}
            disabled={!canOutput}
            onClick={() => onOutput("print")}
          >
            {busy === "print" ? "Checking prices…" : "Print"}
          </button>
          {roll ? (
            <button
              type="button"
              className={cn(CATALOG_BTN_PRIMARY, ACTION, "basis-full sm:basis-auto")}
              disabled={!canOutput}
              title={labelPrinterReady ? undefined : "Choose the label printer first."}
              onClick={() => onOutput("label")}
            >
              {busy === "label" ? "Sending…" : "Print to label printer"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
