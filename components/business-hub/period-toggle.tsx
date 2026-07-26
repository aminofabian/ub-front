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
    <div className="inline-flex shrink-0 items-stretch border border-[#E6E1D8] bg-[#F7F5F1] p-0.5">
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
              "relative min-w-[3.5rem] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors",
              active
                ? "bg-[#141414] text-[#F5E6C8]"
                : "text-[#666666] hover:text-[#141414]",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
