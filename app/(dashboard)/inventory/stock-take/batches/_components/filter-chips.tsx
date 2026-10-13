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

/** To count / Counted / All, each with how many products it holds. */
export function FilterChips({ value, onChange, counts }: Props) {
  return (
    <div role="radiogroup" aria-label="Show" className="flex gap-1.5">
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
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium transition-colors",
              selected
                ? "border-transparent bg-[var(--order-ink,#15231f)] text-white"
                : cn("bg-white", COUNT_TONE.hair, COUNT_TONE.ink),
            )}
          >
            {chip.label}
            <span className={cn("tabular-nums", selected ? "text-white/65" : COUNT_TONE.faint)}>
              {counts[chip.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
