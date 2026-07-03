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
    <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#EEEEEE] bg-white p-1">
      {(
        [
          { id: "week" as const, label: "This week" },
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
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border border-[#E8DFD0] bg-[#F9F6F0] text-[#B08D48]"
                : "border border-transparent text-[#666666] hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
