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
    <div className="inline-flex shrink-0 items-stretch gap-0.5 rounded-xl bg-white p-0.5 ring-1 ring-[color-mix(in_srgb,#141414_7%,transparent)]">
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
              "relative min-w-[3.75rem] rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors",
              active
                ? "bg-[#141414] text-[#F5E6C8]"
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
