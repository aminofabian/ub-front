"use client";

import { cn } from "@/lib/utils";
import { HUB_BTN } from "@/lib/business-hub/constants";
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
      className="inline-flex h-8 shrink-0 items-stretch gap-1 rounded-full border border-[color-mix(in_srgb,#141414_8%,transparent)] bg-[#F1F3F2] p-0.5"
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
              HUB_BTN,
              "relative min-w-[3.25rem] rounded-full px-3 text-[11px] font-semibold sm:min-w-[3.5rem] sm:text-[12px]",
              active
                ? "bg-white text-[#0f766e] shadow-[0_1px_2px_rgba(20,20,20,0.08)]"
                : "text-[#5C5C5C] hover:text-[#0f766e]",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
