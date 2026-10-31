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
    <fieldset className="flex flex-col gap-2">
      <legend className={cn("mb-1 text-[12.5px] font-semibold", COUNT_TONE.ink)}>
        Products per day
      </legend>
      <div
        className={cn(
          "grid grid-cols-4 gap-0.5 rounded-[2px] p-0.5",
          "bg-[color-mix(in_srgb,var(--op-ink,#121a16)_6%,transparent)]",
        )}
      >
        {PRESET_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            aria-pressed={value === size}
            onClick={() => onChange(size)}
            className={cn(
              "h-10 rounded-[2px] text-[16px] font-semibold tabular-nums transition-[background-color,color] duration-150",
              value === size
                ? cn(COUNT_TONE.surface, COUNT_TONE.teal, "shadow-sm")
                : COUNT_TONE.mute,
            )}
          >
            {size}
          </button>
        ))}
      </div>
      <label className={cn("flex items-center gap-2.5 text-[12.5px]", COUNT_TONE.mute)}>
        Or type
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
            if (e.key === "Enter") {
              commitTyped(e.currentTarget.value, onChange);
            }
          }}
          className={cn(
            "h-9 w-20 rounded-[2px] border bg-[var(--op-surface,#fcfaf5)] px-2.5 text-[14px] tabular-nums focus:border-[var(--op-accent,#1d4b3b)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--op-accent,#1d4b3b)_22%,transparent)]",
            COUNT_TONE.hair,
            COUNT_TONE.ink,
          )}
        />
        <span id="batch-size-range" className={cn("text-[12px]", COUNT_TONE.faint)}>
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
