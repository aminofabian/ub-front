"use client";

import { PriceTagRollSetup } from "@/components/price-tags/price-tag-roll-setup";
import { SHEET_COUNTS, layoutForRoll, layoutForSheet } from "@/lib/price-tags/layout";
import type { PageDirection, SheetGeometry, TagLayout } from "@/lib/price-tags/types";
import { cn } from "@/lib/utils";

const CHOICE = "h-8 border px-2.5 text-[12.5px] tabular-nums";
const CHOICE_IDLE =
  "border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white text-[var(--catalog-ink,#121A16)]";
const CHOICE_SOLID = "border-[#1D4B3B] bg-[#1D4B3B] text-white";
const CHOICE_OUTLINE = "border-[#1D4B3B] bg-white text-[#1D4B3B]";
const CAPTION = "text-[12px] text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_62%,transparent)]";
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
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
      <div className="flex gap-1" role="group" aria-label="Print on">
        <button
          type="button"
          aria-pressed={!roll}
          className={cn(CHOICE, !roll ? CHOICE_SOLID : CHOICE_IDLE)}
          onClick={() => onLayout((current) => ({ ...current, media: "a4-sheet" }))}
        >
          A4 sheet
        </button>
        <button
          type="button"
          aria-pressed={roll}
          className={cn(CHOICE, roll ? CHOICE_SOLID : CHOICE_IDLE)}
          onClick={() =>
            onLayout((current) => layoutForRoll(current))
          }
        >
          Label roll
        </button>
      </div>

      {roll ? (
        <>
          <PriceTagRollSetup layout={layout} onLayout={onLayout} />
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Tags on each A4 sheet">
            {SHEET_COUNTS.map((countOnSheet) => (
              <button
                key={countOnSheet}
                type="button"
                aria-pressed={layout.sheetCount === countOnSheet}
                className={cn(CHOICE, "min-w-10", layout.sheetCount === countOnSheet ? CHOICE_SOLID : CHOICE_IDLE)}
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
                className={cn(CHOICE, "capitalize", layout.pageDirection === direction ? CHOICE_OUTLINE : CHOICE_IDLE)}
                onClick={() =>
                  onLayout((current) => layoutForSheet(current, current.sheetCount ?? 24, direction))
                }
              >
                {direction}
              </button>
            ))}
          </div>
          <p className={CAPTION}>
            {geometry.perPage} on an A4 {layout.pageDirection} sheet
          </p>
        </>
      )}
    </div>
  );
}
