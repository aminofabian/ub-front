"use client";

import { TAG_CHIP, TAG_CHIP_IDLE, TAG_CHIP_ON, TAG_LABEL, TAG_NOTE, TAG_STRIP } from "@/components/price-tags/price-tag-chrome";
import { NumberField } from "@/components/price-tags/price-tag-inputs";
import {
  ROLL_LIMITS,
  ROLL_PRESETS,
  layoutForRoll,
  rollLinerWidthMm,
  rollPresetMatches,
  rollSpecOf,
  type RollPreset,
} from "@/lib/price-tags/layout";
import { applyTemplate } from "@/lib/price-tags/templates";
import type { TagLayout } from "@/lib/price-tags/types";
import { cn } from "@/lib/utils";

function applyPreset(layout: TagLayout, preset: RollPreset): TagLayout {
  const next = layoutForRoll(layout, preset);
  // Square stickers are too small for a full shelf tag; start them on the sticker face.
  return preset.suggestSticker && next.templateId !== "sticker" ? applyTemplate(next, "sticker") : next;
}

/**
 * Label roll set-up: which roll is loaded, and the few measurements the
 * printer needs. The common rolls are one tap; the fields are for the rest.
 */
export function PriceTagRollSetup({
  layout,
  onLayout,
}: {
  layout: TagLayout;
  onLayout: (update: (current: TagLayout) => TagLayout) => void;
}) {
  const spec = rollSpecOf(layout);
  const linerMm = rollLinerWidthMm(spec);
  const tooWide = linerMm > ROLL_LIMITS.printWidthMm;
  const patch = (next: Parameters<typeof layoutForRoll>[1]) => onLayout((current) => layoutForRoll(current, next));
  const custom = !ROLL_PRESETS.some((preset) => rollPresetMatches(layout, preset));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className={TAG_LABEL}>Roll</span>
        <div className={TAG_STRIP} role="group" aria-label="Label roll">
          {ROLL_PRESETS.map((preset) => {
            const active = rollPresetMatches(layout, preset);
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={active}
                className={cn(TAG_CHIP, active ? TAG_CHIP_ON : TAG_CHIP_IDLE)}
                onClick={() => onLayout((current) => applyPreset(current, preset))}
              >
                {preset.label}
              </button>
            );
          })}
          {custom ? <span className={cn(TAG_CHIP, TAG_CHIP_ON, "pointer-events-none")}>Custom</span> : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
        <NumberField label="Label width mm" value={spec.widthMm} min={ROLL_LIMITS.minWidthMm} max={ROLL_LIMITS.maxWidthMm} step={0.5} onChange={(widthMm) => patch({ widthMm })} />
        <NumberField label="Label height mm" value={spec.heightMm} min={ROLL_LIMITS.minHeightMm} max={ROLL_LIMITS.maxHeightMm} step={0.5} onChange={(heightMm) => patch({ heightMm })} />
        <NumberField label="Labels across" value={spec.across} min={1} max={ROLL_LIMITS.maxAcross} onChange={(across) => patch({ across })} />
        <NumberField
          label="Row gap mm"
          value={layout.rollRowGapMm}
          min={0}
          max={ROLL_LIMITS.maxRowGapMm}
          step={0.5}
          onChange={(rollRowGapMm) => onLayout((current) => ({ ...current, rollRowGapMm }))}
        />
        {spec.across > 1 ? (
          <>
            <NumberField label="Label gap mm" value={spec.gapMm} min={0} max={ROLL_LIMITS.maxGapMm} step={0.5} onChange={(gapMm) => patch({ gapMm })} />
            <NumberField label="Roll edge mm" value={spec.edgeMm} min={0} max={ROLL_LIMITS.maxEdgeMm} step={0.5} onChange={(edgeMm) => patch({ edgeMm })} />
          </>
        ) : null}
      </div>

      <p className={cn(TAG_NOTE, "text-[var(--catalog-ink,#121A16)]")}>
        Each printed row is <span className="tabular-nums">{linerMm} × {spec.heightMm} mm</span>
        {spec.across > 1 ? `, ${spec.across} labels across` : ""}, with {layout.rollRowGapMm} mm between rows.
        {tooWide ? (
          <span className="text-[#A55237]">
            {" "}
            That is wider than the {ROLL_LIMITS.printWidthMm} mm a 4-inch printer can print; use fewer labels across or smaller labels.
          </span>
        ) : null}
      </p>
      <details className="group">
        <summary className={cn(TAG_NOTE, "cursor-pointer list-none text-[#1D4B3B] underline-offset-2 hover:underline")}>
          <span className="group-open:hidden">How the roll gets set up</span>
          <span className="hidden group-open:inline">Hide</span>
        </summary>
        <p className={cn(TAG_NOTE, "mt-1 max-w-prose")}>
          “Print to label printer” tells the printer the row size itself. Only the browser’s Print button needs a paper
          size of {linerMm} × {spec.heightMm} mm set up in the printer driver.{" "}
          {spec.across > 1 ? `Tags fill a row left to right before the next. ` : ""}
          Set “Gap between rows” to match the roll (usually 2–3 mm), press “Teach printer this roll” once so it stops on
          each gap, then print the alignment test from the settings below before a long run.
        </p>
      </details>
    </div>
  );
}
