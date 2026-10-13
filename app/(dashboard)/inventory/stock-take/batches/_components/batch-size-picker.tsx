"use client";

import { cn } from "@/lib/utils";

import { COUNT_TONE } from "./count-tone";

const PRESET_SIZES = [50, 100, 150, 200] as const;

type Props = {
  value: number;
  min: number;
  max: number;
  onChange: (size: number) => void;
};

/** Quick daily-batch presets with a typed fallback for unusual shops. */
export function BatchSizePicker({ value, min, max, onChange }: Props) {
  const isPreset = (PRESET_SIZES as readonly number[]).includes(value);
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className={cn("mb-2.5 text-[14px] font-semibold", COUNT_TONE.ink)}>
        Products per day
      </legend>
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,white)] p-1">
        {PRESET_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            aria-pressed={value === size}
            onClick={() => onChange(size)}
            className={cn(
              "h-11 rounded-[9px] font-heading text-[19px] font-semibold tabular-nums transition-[background-color,box-shadow,color] duration-200",
              value === size
                ? cn("bg-white shadow-[0_1px_3px_rgba(21,35,31,0.14)]", COUNT_TONE.teal)
                : COUNT_TONE.mute,
            )}
          >
            {size}
          </button>
        ))}
      </div>
      <label className={cn("flex items-center gap-3 text-[14px]", COUNT_TONE.mute)}>
        Or type a number
        <input
          key={value}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          defaultValue={isPreset ? "" : value}
          placeholder={String(value)}
          aria-describedby="batch-size-range"
          onBlur={(e) => commitTyped(e.currentTarget.value, onChange)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTyped(e.currentTarget.value, onChange);
          }}
          className={cn(
            "h-11 w-24 rounded-xl border bg-white px-3 text-[16px] tabular-nums focus:border-[var(--pos-primary,#0f766e)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)]",
            COUNT_TONE.hair,
            COUNT_TONE.ink,
          )}
        />
        <span id="batch-size-range" className={cn("text-[13px]", COUNT_TONE.faint)}>
          {min}–{max}
        </span>
      </label>
    </fieldset>
  );
}

function commitTyped(raw: string, onChange: (size: number) => void) {
  const next = Number(raw);
  if (raw.trim() !== "" && Number.isFinite(next) && next > 0) onChange(next);
}
