"use client";

import { TAG_CHIP, TAG_CHIP_IDLE, TAG_CHIP_ON, TAG_CHIP_SOLID, TAG_LABEL, TAG_STRIP } from "@/components/price-tags/price-tag-chrome";
import { PriceTagRollSetup } from "@/components/price-tags/price-tag-roll-setup";
import { SHEET_COUNTS, layoutForRoll, layoutForSheet } from "@/lib/price-tags/layout";
import type { PageDirection, SheetGeometry, TagLayout } from "@/lib/price-tags/types";
import { cn } from "@/lib/utils";

const DIRECTIONS = ["portrait", "landscape"] as const satisfies readonly PageDirection[];

/** What the tags print on: A4 sheets (count and direction) or one label per tag on a roll. */
export function PriceTagMediaBar({
  layout,
  geometry,
  onLayout,
}: {
  layout: TagLayout;
  geometry: SheetGeometry;
  onLayout: (update: (current: TagLayout) => TagLayout) => void;
}) {
  const roll = layout.media === "label-roll";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1.5">
          <span className={TAG_LABEL}>Print on</span>
          <div className="flex gap-1.5" role="group" aria-label="Print on">
            <button
              type="button"
              aria-pressed={!roll}
              className={cn(TAG_CHIP, !roll ? TAG_CHIP_SOLID : TAG_CHIP_IDLE)}
              onClick={() => onLayout((current) => ({ ...current, media: "a4-sheet" }))}
            >
              A4 sheet
            </button>
            <button
              type="button"
              aria-pressed={roll}
              className={cn(TAG_CHIP, roll ? TAG_CHIP_SOLID : TAG_CHIP_IDLE)}
              onClick={() => onLayout((current) => layoutForRoll(current))}
            >
              Label roll
            </button>
          </div>
        </div>

        {roll ? null : (
          <>
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className={TAG_LABEL}>Tags per sheet</span>
              <div className={TAG_STRIP} role="group" aria-label="Tags on each A4 sheet">
                {SHEET_COUNTS.map((countOnSheet) => (
                  <button
                    key={countOnSheet}
                    type="button"
                    aria-pressed={layout.sheetCount === countOnSheet}
                    className={cn(TAG_CHIP, "min-w-11", layout.sheetCount === countOnSheet ? TAG_CHIP_ON : TAG_CHIP_IDLE)}
                    onClick={() => onLayout((current) => layoutForSheet(current, countOnSheet, current.pageDirection))}
                  >
                    {countOnSheet}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={TAG_LABEL}>Paper</span>
              <div className="flex gap-1.5" role="group" aria-label="Paper direction">
                {DIRECTIONS.map((direction) => (
                  <button
                    key={direction}
                    type="button"
                    aria-pressed={layout.pageDirection === direction}
                    className={cn(TAG_CHIP, "capitalize", layout.pageDirection === direction ? TAG_CHIP_ON : TAG_CHIP_IDLE)}
                    onClick={() => onLayout((current) => layoutForSheet(current, current.sheetCount ?? 24, direction))}
                  >
                    {direction}
                  </button>
                ))}
              </div>
            </div>
            <p className="self-end text-[12px] text-[#556159] sm:pb-2">
              {geometry.perPage} tags of {geometry.tagWidthMm} × {geometry.tagHeightMm} mm
            </p>
          </>
        )}
      </div>

      {roll ? <PriceTagRollSetup layout={layout} onLayout={onLayout} /> : null}
    </div>
  );
}
