"use client";

import { TAG_CHIP, TAG_CHIP_IDLE, TAG_CHIP_ON, TAG_CHIP_SOLID, TAG_STRIP } from "@/components/price-tags/price-tag-chrome";
import { PriceTagRollSetup, applyRollPreset } from "@/components/price-tags/price-tag-roll-setup";
import { ROLL_PRESETS, SHEET_COUNTS, layoutForRoll, layoutForSheet, rollPresetMatches } from "@/lib/price-tags/layout";
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

  const customRoll = roll && !ROLL_PRESETS.some((preset) => rollPresetMatches(layout, preset));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex gap-1" role="group" aria-label="Print on">
          <button
            type="button"
            aria-pressed={!roll}
            className={cn(TAG_CHIP, !roll ? TAG_CHIP_SOLID : TAG_CHIP_IDLE)}
            onClick={() => onLayout((current) => ({ ...current, media: "a4-sheet" }))}
          >
            A4
          </button>
          <button
            type="button"
            aria-pressed={roll}
            className={cn(TAG_CHIP, roll ? TAG_CHIP_SOLID : TAG_CHIP_IDLE)}
            onClick={() => onLayout((current) => layoutForRoll(current))}
          >
            Roll
          </button>
        </div>
        <span aria-hidden className="mx-0.5 hidden h-4 w-px bg-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] sm:block" />
        {roll ? (
          <div className={cn(TAG_STRIP, "min-w-0 flex-1")} role="group" aria-label="Label roll">
            {ROLL_PRESETS.map((preset) => {
              const active = rollPresetMatches(layout, preset);
              return (
                <button
                  key={preset.label}
                  type="button"
                  aria-pressed={active}
                  className={cn(TAG_CHIP, active ? TAG_CHIP_ON : TAG_CHIP_IDLE)}
                  onClick={() => onLayout((current) => applyRollPreset(current, preset))}
                >
                  {preset.label}
                </button>
              );
            })}
            {customRoll ? <span className={cn(TAG_CHIP, TAG_CHIP_ON, "pointer-events-none")}>Custom</span> : null}
          </div>
        ) : (
          <>
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
            <div className="flex gap-1" role="group" aria-label="Paper direction">
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
            <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[#556159]">
              {geometry.tagWidthMm}×{geometry.tagHeightMm}
            </span>
          </>
        )}
      </div>
      {roll ? <PriceTagRollSetup layout={layout} onLayout={onLayout} /> : null}
    </div>
  );
}
