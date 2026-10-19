import type { BatchLineFilter } from "@/lib/count-cycle/filter-batch-lines";
import { cn } from "@/lib/utils";

import { COUNT_TONE } from "./count-tone";

const CHIPS: { value: BatchLineFilter; label: string }[] = [
  { value: "todo", label: "To count" },
  { value: "counted", label: "Counted" },
  { value: "all", label: "All" },
];

type Props = {
  value: BatchLineFilter;
  onChange: (filter: BatchLineFilter) => void;
  counts: Record<BatchLineFilter, number>;
};

/** Segmented To count / Counted / All — thumb-wide, not a pill cluster. */
export function FilterChips({ value, onChange, counts }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Show"
      className={cn(
        "grid grid-cols-3 gap-px overflow-hidden rounded-[2px] border p-px",
        COUNT_TONE.hair,
        "bg-[color-mix(in_srgb,var(--op-ink,#121a16)_6%,var(--op-surface,#fcfaf5))]",
      )}
    >
      {CHIPS.map((chip) => {
        const selected = chip.value === value;
        return (
          <button
            key={chip.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(chip.value)}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-1.5 rounded-[1px] text-[13px] font-medium transition-colors",
              selected
                ? "bg-[var(--op-accent,#1d4b3b)] text-[var(--op-surface,#fcfaf5)]"
                : cn("bg-[var(--op-surface,#fcfaf5)]", COUNT_TONE.ink),
            )}
          >
            {chip.label}
            <span
              className={cn(
                "tabular-nums",
                selected ? "text-[color-mix(in_srgb,var(--op-surface,#fcfaf5)_70%,transparent)]" : COUNT_TONE.faint,
              )}
            >
              {counts[chip.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
