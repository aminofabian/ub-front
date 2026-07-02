"use client";

import {
  HUB_ACCENT,
  HUB_ACCENT_LIGHT,
  HUB_SURFACE,
} from "@/lib/business-hub/constants";
import { padChartValues } from "@/lib/business-hub/formatters";
import { cn } from "@/lib/utils";

export function RevenueBarChart({
  values,
  barCount = 12,
  ariaLabel,
}: {
  values: number[];
  barCount?: number;
  ariaLabel: string;
}) {
  const bars = padChartValues(values, barCount);
  const max = Math.max(...bars, 1);

  return (
    <div className={cn(HUB_SURFACE, "px-6 py-8")}>
      <div
        className="flex h-36 items-end justify-between gap-2 sm:gap-3"
        role="img"
        aria-label={ariaLabel}
      >
        {bars.map((value, index) => {
          const heightPct = Math.max(12, Math.round((value / max) * 100));
          const isHighlight = index === bars.length - 1;
          return (
            <div
              key={index}
              className="flex flex-1 items-end justify-center"
              style={{ height: "100%" }}
            >
              <div
                className="w-full max-w-[28px] rounded-lg"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: isHighlight ? HUB_ACCENT : HUB_ACCENT_LIGHT,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
