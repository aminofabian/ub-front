"use client";

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

const CHOICE = "h-8 border px-2.5 text-[12.5px] tabular-nums";
const CHOICE_IDLE =
  "border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white text-[var(--catalog-ink,#121A16)]";
const CHOICE_ON = "border-[#1D4B3B] bg-white text-[#1D4B3B]";
const NOTE = "text-[12px] leading-relaxed text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_62%,transparent)]";

function applyPreset(layout: TagLayout, preset: RollPreset): TagLayout {
  const next = layoutForRoll(layout, preset);
  // Square stickers are too small for a full shelf tag; start them on the sticker face.
  return preset.suggestSticker && next.templateId !== "sticker" ? applyTemplate(next, "sticker") : next;
}

/**
 * Label roll set-up: the label, how many sit side by side, and the paper size
 * to type into the printer driver so each printed page is one row of labels.
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

  return (
    <div className="flex basis-full flex-col gap-2">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Label roll">
        {ROLL_PRESETS.map((preset) => {
          const active = rollPresetMatches(layout, preset);
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={active}
              className={cn(CHOICE, active ? CHOICE_ON : CHOICE_IDLE)}
              onClick={() => onLayout((current) => applyPreset(current, preset))}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:max-w-[34rem]">
        <NumberField
          label="Label width mm"
          value={spec.widthMm}
          min={ROLL_LIMITS.minWidthMm}
          max={ROLL_LIMITS.maxWidthMm}
          step={0.5}
          onChange={(widthMm) => patch({ widthMm })}
        />
        <NumberField
          label="Label height mm"
          value={spec.heightMm}
          min={ROLL_LIMITS.minHeightMm}
          max={ROLL_LIMITS.maxHeightMm}
          step={0.5}
          onChange={(heightMm) => patch({ heightMm })}
        />
        <NumberField
          label="Labels across"
          value={spec.across}
          min={1}
          max={ROLL_LIMITS.maxAcross}
          onChange={(across) => patch({ across })}
        />
        <NumberField
          label="Gap between rows mm"
          value={layout.rollRowGapMm}
          min={0}
          max={ROLL_LIMITS.maxRowGapMm}
          step={0.5}
          onChange={(rollRowGapMm) => onLayout((current) => ({ ...current, rollRowGapMm }))}
        />
        {spec.across > 1 ? (
          <>
            <NumberField
              label="Gap between mm"
              value={spec.gapMm}
              min={0}
              max={ROLL_LIMITS.maxGapMm}
              step={0.5}
              onChange={(gapMm) => patch({ gapMm })}
            />
            <NumberField
              label="Roll edge mm"
              value={spec.edgeMm}
              min={0}
              max={ROLL_LIMITS.maxEdgeMm}
              step={0.5}
              onChange={(edgeMm) => patch({ edgeMm })}
            />
          </>
        ) : null}
      </div>
      <div className="border-l-2 border-[#1D4B3B] bg-white/70 px-3 py-2">
        <p className="text-[12.5px] font-medium text-[var(--catalog-ink,#121A16)]">
          Each printed row is {linerMm} × {spec.heightMm} mm
          {spec.across > 1 ? `, ${spec.across} labels across` : ""}, with {layout.rollRowGapMm} mm between rows.
        </p>
        <p className={NOTE}>
          “Print to label printer” sends this size to the printer itself. Only the browser “Print” button needs a
          paper size of {linerMm} × {spec.heightMm} mm set up in the printer driver.
        </p>
        <p className={NOTE}>
          {spec.across > 1
            ? `Each printed page is one row of ${spec.across} labels; tags fill a row left to right before the next. `
            : "Each printed page is one label. "}
          Set “Gap between rows” to match your roll (usually 2–3 mm), then run the printer&apos;s
          calibration once so it stops on each gap. Use “Print alignment test” under the sheet settings to
          check the position before printing a big run.
        </p>
        {tooWide ? (
          <p className="mt-1 text-[12px] text-[#A55237]">
            This roll is {linerMm} mm wide, more than the {ROLL_LIMITS.printWidthMm} mm a 4-inch printer can
            print. The right-hand edge will not print; use fewer labels across or smaller labels.
          </p>
        ) : null}
      </div>
    </div>
  );
}
