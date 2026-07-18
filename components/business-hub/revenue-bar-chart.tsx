"use client";

import {
  HUB_ACCENT,
  HUB_ACCENT_LIGHT,
  HUB_MUTED,
  HUB_SURFACE,
} from "@/lib/business-hub/constants";
import type { DailyRevenuePoint } from "@/lib/business-hub/build-daily-revenue-series";
import { fmtKes } from "@/lib/business-hub/formatters";
import { cn } from "@/lib/utils";

export function RevenueBarChart({
  points,
  ariaLabel,
}: {
  points: DailyRevenuePoint[];
  ariaLabel: string;
}) {
  const max = Math.max(...points.map((p) => p.value), 1);
  const showEveryLabel = points.length <= 8;

  return (
    <div className={cn(HUB_SURFACE, "px-6 py-6")}>
      <div
        className="flex h-36 items-end justify-between gap-1.5 sm:gap-2"
        role="img"
        aria-label={ariaLabel}
      >
        {points.map((point, index) => {
          const heightPct =
            point.value <= 0 ? 0 : Math.max(4, Math.round((point.value / max) * 100));
          const isHighlight = index === points.length - 1;
          const showLabel =
            showEveryLabel ||
            index === 0 ||
            index === points.length - 1 ||
            index % Math.ceil(points.length / 5) === 0;

          return (
            <div
              key={point.day}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
              style={{ height: "100%" }}
              title={`${point.label}: ${fmtKes(point.value)}`}
            >
              <div className="flex w-full flex-1 items-end justify-center">
                {point.value > 0 ? (
                  <div
                    className="w-full max-w-[28px] rounded-lg"
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: isHighlight ? HUB_ACCENT : HUB_ACCENT_LIGHT,
                    }}
                  />
                ) : (
                  <div
                    className="w-full max-w-[28px] rounded-full"
                    style={{
                      height: 2,
                      backgroundColor: "#E8E8E8",
                    }}
                  />
                )}
              </div>
              <span
                className={cn(
                  "w-full truncate text-center text-[10px] leading-none",
                  HUB_MUTED,
                  !showLabel && "invisible",
                )}
              >
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
