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
      className="inline-flex h-9 shrink-0 items-stretch gap-0.5 rounded-full border border-[color-mix(in_srgb,#141414_10%,transparent)] bg-[color-mix(in_srgb,#141414_4%,white)] p-0.5 sm:h-8 sm:rounded-none sm:border-[color-mix(in_srgb,#141414_8%,transparent)] sm:bg-white"
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
              "relative min-w-[3.25rem] rounded-full px-3 text-[12px] font-semibold sm:min-w-[3.5rem] sm:rounded-none sm:px-2.5 sm:text-[12px] sm:font-medium",
              active
                ? "bg-[#0f766e] text-white shadow-sm sm:border sm:border-[#0f766e] sm:bg-white sm:text-[#0f766e] sm:shadow-none"
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
