"use client";

import {
  HUB_ACCENT,
  HUB_MUTED,
  HUB_SURFACE,
} from "@/lib/business-hub/constants";
import type { DailyRevenuePoint } from "@/lib/business-hub/build-daily-revenue-series";
import { chartWindowStats } from "@/lib/business-hub/pulse-insights";
import { useFormatMoney } from "@/hooks/use-format-money";
import { cn } from "@/lib/utils";

const METER_TRACK_PX = 26;

function dayOfMonth(isoDay: string): string {
  const day = isoDay.slice(8, 10);
  return day.startsWith("0") ? day.slice(1) : day;
}

function weekdayInitial(isoDay: string): string {
  const date = new Date(`${isoDay}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { weekday: "narrow" });
}

export function RevenueBarChart({
  points,
  ariaLabel,
}: {
  points: DailyRevenuePoint[];
  ariaLabel: string;
  caption?: string;
}) {
  const { formatMoneyCompact } = useFormatMoney();
  const max = Math.max(...points.map((p) => p.value), 1);
  const stats = chartWindowStats(points);
  const peakDay = stats.best?.day ?? null;
  const todayDay = points[points.length - 1]?.day ?? null;

  const summary = [
    {
      id: "window",
      label: "Window",
      value: formatMoneyCompact(stats.total),
      hint: `${points.length} days`,
    },
    {
      id: "avg",
      label: "Avg",
      value: formatMoneyCompact(stats.average),
      hint: "Daily",
    },
    {
      id: "best",
      label: "Best",
      value: stats.best ? stats.best.label : "—",
      hint: stats.best ? formatMoneyCompact(stats.best.value) : "No sales",
    },
    {
      id: "active",
      label: "Active",
      value: String(stats.activeDays),
      hint: stats.activeDays === 1 ? "day" : "days",
    },
  ] as const;

  return (
    <section className={cn(HUB_SURFACE, "overflow-hidden")}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-[color-mix(in_srgb,#141414_8%,transparent)] px-3 py-1.5 sm:justify-end">
        {summary.map((item) => (
          <p
            key={item.id}
            className="flex items-baseline gap-1 text-[10px] tabular-nums sm:text-[11px]"
            title={`${item.label}: ${item.value} · ${item.hint}`}
          >
            <span className={HUB_MUTED}>{item.label}</span>
            <span className="font-semibold text-[#141414]">{item.value}</span>
          </p>
        ))}
      </div>

      <div className="px-2.5 py-2 sm:px-3" role="img" aria-label={ariaLabel}>
        <div
          className="grid items-end gap-px"
          style={{
            gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {points.map((point) => {
            const heightPx =
              point.value <= 0
                ? 0
                : Math.max(2, Math.round((point.value / max) * METER_TRACK_PX));
            const isToday = point.day === todayDay;
            const isPeak = point.day === peakDay && point.value > 0 && !isToday;

            return (
              <div
                key={point.day}
                className="group relative flex min-w-0 flex-col items-stretch gap-0.5 px-px"
                title={`${point.label} · ${formatMoneyCompact(point.value)}`}
              >
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 border border-[#0f766e] bg-white px-1.5 py-0.5 text-[10px] text-[#0f766e] group-hover:block">
                  <span className="whitespace-nowrap font-medium">
                    {point.label}
                  </span>
                  <span className="mx-1 text-[#8A8A8A]" aria-hidden>
                    ·
                  </span>
                  <span className="whitespace-nowrap font-semibold tabular-nums">
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
                            ? "#0d9488"
                            : "#99f6e4",
                      }}
                    />
                  ) : (
                    <div
                      className="w-full bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]"
                      style={{ height: 2 }}
                    />
                  )}
                </div>

                <div className="flex items-center justify-center gap-0.5">
                  <span
                    className={cn(
                      "text-[8px] font-medium tabular-nums leading-none sm:text-[9px]",
                      isToday ? "text-[#0f766e]" : "text-[#666666]",
                    )}
                  >
                    {dayOfMonth(point.day)}
                  </span>
                  <span
                    className={cn(
                      "hidden text-[8px] uppercase leading-none sm:inline",
                      isToday ? "text-[#0f766e]" : "text-[#B0A898]",
                    )}
                  >
                    {weekdayInitial(point.day)}
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
