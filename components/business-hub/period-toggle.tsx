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
    <div
      className="inline-flex h-9 shrink-0 items-center gap-0.5 rounded-full bg-[#eef1f0] p-0.5"
      role="group"
      aria-label="Time period"
    >
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
            aria-pressed={active}
            className={cn(
              "h-full min-w-[3.25rem] rounded-full px-3 text-[12px] font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]",
              active
                ? "bg-white text-[#101828] shadow-[0_1px_2px_rgba(16,24,40,0.10)]"
                : "text-[#667085] hover:text-[#101828]",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
