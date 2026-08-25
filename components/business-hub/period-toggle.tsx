"use client";

import { cn } from "@/lib/utils";
import type { Period } from "@/lib/business-hub/types";

export function PeriodToggle({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="inline-flex shrink-0 items-stretch gap-1.5 bg-transparent">
      {(
        [
          { id: "week" as const, label: "Week" },
          { id: "today" as const, label: "Today" },
        ] as const
      ).map(({ id, label }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "relative min-w-[3.75rem] border bg-white px-2.5 py-1.5 text-[12px] font-medium transition-colors",
              active
                ? "border-[#B08D48] text-[#8A6B2E]"
                : "border-[#E6E1D8] text-[#666666] hover:border-[#D4C4A0] hover:text-[#141414]",
            )}
          >
            {label}
            {active ? (
              <span
                className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 bg-[#B08D48]"
                aria-hidden
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
