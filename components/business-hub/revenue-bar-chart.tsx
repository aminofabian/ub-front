"use client";

import {
  HUB_ACCENT,
} from "@/lib/business-hub/constants";
import type { DailyRevenuePoint } from "@/lib/business-hub/build-daily-revenue-series";
import { chartWindowStats } from "@/lib/business-hub/pulse-insights";
import { HubSectionLabel } from "@/components/business-hub/hub-section-label";
import { useFormatMoney } from "@/hooks/use-format-money";
import { cn } from "@/lib/utils";

const METER_TRACK_PX = 28;

function dayOfMonth(isoDay: string): string {
  const day = isoDay.slice(8, 10);
  return day.startsWith("0") ? day.slice(1) : day;
}

export function RevenueBarChart({
  points,
  ariaLabel,
  title = "Revenue runway",
}: {
  points: DailyRevenuePoint[];
  ariaLabel: string;
  /** Kept for callers; stats are derived from points instead of a caption string. */
  caption?: string;
  title?: string;
}) {
  const { formatMoneyCompact } = useFormatMoney();
  const max = Math.max(...points.map((p) => p.value), 1);
  const stats = chartWindowStats(points);
  const peakDay = stats.best?.day ?? null;
  const todayDay = points[points.length - 1]?.day ?? null;

  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <HubSectionLabel
          title={title}
          meta={
            stats.activeDays > 0
              ? `${stats.activeDays} of ${points.length}`
              : undefined
          }
        />
      </div>

      <div className="py-1" role="img" aria-label={ariaLabel}>
          <div
            className="grid items-end gap-1"
            style={{
              gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(0, 1fr))`,
            }}
          >
            {points.map((point) => {
              const heightPx =
                point.value <= 0
                  ? 0
                  : Math.max(3, Math.round((point.value / max) * METER_TRACK_PX));
              const isToday = point.day === todayDay;
              const isPeak = point.day === peakDay && point.value > 0 && !isToday;

              return (
                <div
                  key={point.day}
                  className="group relative flex min-w-0 flex-col items-stretch gap-1.5"
                  title={`${point.label} · ${formatMoneyCompact(point.value)}`}
                >
                  <div
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 border border-[#E6E1D8] bg-white px-2 py-1 text-[11px] shadow-sm group-hover:block"
                  >
                    <span className="whitespace-nowrap font-medium text-[#141414]">
                      {point.label}
                    </span>
                    <span className="mx-1 text-[#C4BBA8]" aria-hidden>
                      ·
                    </span>
                    <span className="whitespace-nowrap font-semibold tabular-nums text-[#8A6B2E]">
                      {formatMoneyCompact(point.value)}
                    </span>
                  </div>

                  <div
                    className="flex w-full items-end justify-center"
                    style={{ height: METER_TRACK_PX }}
                  >
                    {point.value > 0 ? (
                      <div
                        className="hub-bar-grow w-full"
                        style={{
                          height: heightPx,
                          backgroundColor: isToday
                            ? HUB_ACCENT
                            : isPeak
                              ? "#C9A86A"
                              : "#D9C7A0",
                        }}
                      />
                    ) : (
                      <div className="w-full bg-[#EDE8DF]" style={{ height: 2 }} />
                    )}
                  </div>

                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "text-[9px] font-semibold tabular-nums leading-none",
                        isToday ? "text-[#8A6B2E]" : "text-[#141414]",
                      )}
                    >
                      {dayOfMonth(point.day)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
    </section>
  );
}
