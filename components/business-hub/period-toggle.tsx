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
    <div className="inline-flex shrink-0 items-stretch gap-0.5 rounded-lg border border-[#E6E1D8]/90 bg-white p-0.5 shadow-[0_1px_0_rgba(20,20,20,0.04)]">
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
              "relative min-w-[3.75rem] rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors",
              active
                ? "bg-[#141414] text-[#F5E6C8] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                : "text-[#666666] hover:bg-[#F7F5F1] hover:text-[#141414]",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
