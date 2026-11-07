"use client";

import { TAG_CHIP, TAG_CHIP_IDLE, TAG_CHIP_ON, TAG_STRIP } from "@/components/price-tags/price-tag-chrome";
import { DraftNumberInput, rangeParser } from "@/components/price-tags/price-tag-inputs";
import { CATALOG_BTN_OUTLINE, CATALOG_BTN_PRIMARY } from "@/app/(dashboard)/products/_components/catalog-chrome";
import { TEMPLATE_COPY, applyTemplate } from "@/lib/price-tags/templates";
import type { SheetGeometry, TagLayout, TagTemplateId } from "@/lib/price-tags/types";
import { cn } from "@/lib/utils";

const TEMPLATES = Object.keys(TEMPLATE_COPY) as TagTemplateId[];
const RANGE_INPUT = "h-8 w-14 px-0 text-center pointer-coarse:h-10";
/** Beside the range on a laptop. A phone prints from the thumb bar instead. */
const ACTION = "h-9 justify-center pointer-coarse:h-11";

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

  const singular = rangeName.toLowerCase().replace(/s$/, "");

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_10%,transparent)] pt-2">
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
      {geometry.perPage > 1 && !roll ? (
        <label
          className="inline-flex h-8 items-center gap-1 text-[12px] text-[#556159] pointer-coarse:h-10"
          title="On a part-used sheet, start at the first free label, left to right, top to bottom."
        >
          Start
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
      <div className="inline-flex h-8 items-center gap-1 text-[12px] text-[#556159] pointer-coarse:h-10" aria-label={rangeName}>
        <DraftNumberInput
          value={printFrom}
          inputMode="numeric"
          aria-label={`First ${singular} to print`}
          className={RANGE_INPUT}
          parse={rangeParser(1, totalPages, true)}
          onValue={onPrintFrom}
        />
        <span>–</span>
        <DraftNumberInput
          value={printTo}
          inputMode="numeric"
          aria-label={`Last ${singular} to print`}
          className={RANGE_INPUT}
          parse={rangeParser(1, totalPages, true)}
          onValue={onPrintTo}
        />
        <span className="tabular-nums">/ {totalPages}</span>
      </div>
      <div className="hidden flex-wrap gap-1.5 lg:ml-auto lg:flex">
        <button type="button" className={cn(CATALOG_BTN_OUTLINE, ACTION)} disabled={!canOutput} title="Download PDF" onClick={() => onOutput("pdf")}>
          {busy === "pdf" ? "Checking…" : "PDF"}
        </button>
        <button
          type="button"
          className={cn(roll ? CATALOG_BTN_OUTLINE : CATALOG_BTN_PRIMARY, ACTION)}
          disabled={!canOutput}
          onClick={() => onOutput("print")}
        >
          {busy === "print" ? "Checking…" : "Print"}
        </button>
        {roll ? (
          <button
            type="button"
            className={cn(CATALOG_BTN_PRIMARY, ACTION)}
            disabled={!canOutput}
            title={labelPrinterReady ? "Print to the label printer" : "Choose the label printer first."}
            onClick={() => onOutput("label")}
          >
            {busy === "label" ? "Sending…" : "Print labels"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
