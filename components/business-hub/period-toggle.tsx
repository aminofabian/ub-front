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
      className="inline-flex h-9 shrink-0 items-stretch gap-px rounded-none border border-[color-mix(in_srgb,#141414_7%,transparent)] bg-[color-mix(in_srgb,#141414_7%,transparent)] p-px sm:h-8"
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
              "relative min-w-[2.75rem] rounded-none px-2 text-[12px] font-semibold sm:min-w-[3.5rem] sm:px-3",
              active
                ? "bg-[#0f766e] text-white"
                : "bg-white text-[#5C5C5C] hover:text-[#0f766e]",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
