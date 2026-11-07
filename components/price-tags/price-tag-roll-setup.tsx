"use client";

import { DraftNumberInput, rangeParser } from "@/components/price-tags/price-tag-inputs";
import {
  ROLL_LIMITS,
  layoutForRoll,
  rollLinerWidthMm,
  rollSpecOf,
  type RollPreset,
} from "@/lib/price-tags/layout";
import { applyTemplate } from "@/lib/price-tags/templates";
import type { TagLayout } from "@/lib/price-tags/types";
import { cn } from "@/lib/utils";

/** Square stickers start on the sticker face; a full shelf tag will not fit. */
export function applyRollPreset(layout: TagLayout, preset: RollPreset): TagLayout {
  const next = layoutForRoll(layout, preset);
  return preset.suggestSticker && next.templateId !== "sticker" ? applyTemplate(next, "sticker") : next;
}

/**
 * The roll as one specification line: width × height, how many across, and the gaps.
 * Presets live with the media switch; these fields are the roll that is not a preset.
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
    <div className="flex flex-wrap items-center gap-1.5">
      <Measure name="Width" unit="mm" value={spec.widthMm} min={ROLL_LIMITS.minWidthMm} max={ROLL_LIMITS.maxWidthMm} step={0.5} onChange={(widthMm) => patch({ widthMm })} />
      <span aria-hidden className="text-[12px] text-[#556159]">×</span>
      <Measure name="Height" unit="mm" value={spec.heightMm} min={ROLL_LIMITS.minHeightMm} max={ROLL_LIMITS.maxHeightMm} step={0.5} onChange={(heightMm) => patch({ heightMm })} />
      <Measure name="Across" value={spec.across} min={1} max={ROLL_LIMITS.maxAcross} onChange={(across) => patch({ across })} />
      <Measure
        name="Row"
        unit="mm"
        value={layout.rollRowGapMm}
        min={0}
        max={ROLL_LIMITS.maxRowGapMm}
        step={0.5}
        onChange={(rollRowGapMm) => onLayout((current) => ({ ...current, rollRowGapMm }))}
      />
      {spec.across > 1 ? (
        <>
          <Measure name="Gap" unit="mm" value={spec.gapMm} min={0} max={ROLL_LIMITS.maxGapMm} step={0.5} onChange={(gapMm) => patch({ gapMm })} />
          <Measure name="Edge" unit="mm" value={spec.edgeMm} min={0} max={ROLL_LIMITS.maxEdgeMm} step={0.5} onChange={(edgeMm) => patch({ edgeMm })} />
        </>
      ) : null}
      <span
        className={cn(
          "font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums",
          tooWide ? "text-[#A55237]" : "text-[#556159]",
        )}
        title={tooWide ? `Wider than the ${ROLL_LIMITS.printWidthMm} mm a 4-inch printer can print.` : "Width of one printed row"}
      >
        {linerMm} mm{tooWide ? " wide" : ""}
      </span>
    </div>
  );
}

/** A named measurement: the word, the number, and the unit share one control. */
function Measure({
  name,
  unit,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  name: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const integer = Number.isInteger(step);
  return (
    <label className="inline-flex h-8 items-center gap-1 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white pl-2 pr-1.5 text-[12px] text-[#556159] focus-within:border-[#1D4B3B] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,#1D4B3B_28%,transparent)] pointer-coarse:h-10">
      <span>{name}</span>
      <DraftNumberInput
        value={value}
        aria-label={unit ? `${name} ${unit}` : name}
        inputMode={integer && min >= 0 ? "numeric" : "decimal"}
        parse={rangeParser(min, max, integer)}
        onValue={onChange}
        className="h-7 w-12 border-0 bg-transparent px-0 text-right shadow-none focus:border-transparent focus-visible:ring-0 pointer-coarse:h-9"
      />
      {unit ? <span>{unit}</span> : null}
    </label>
  );
}
