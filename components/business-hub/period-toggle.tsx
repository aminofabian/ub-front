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
    <div className="inline-flex shrink-0 items-stretch gap-0.5 rounded-none border border-[color-mix(in_srgb,#141414_9%,transparent)] bg-white p-0.5">
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
              HUB_BTN,
              "relative min-w-[3.5rem] px-2.5 py-1.5 text-[12px] font-medium",
              active
                ? "bg-[#141414] text-[#F5E6C8]"
                : "text-[#5C5C5C] hover:bg-[#F4F2ED] hover:text-[#141414]",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
