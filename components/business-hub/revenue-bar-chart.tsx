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

const METER_TRACK_PX = 28;

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
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[color-mix(in_srgb,#141414_6%,transparent)] px-3 py-1.5 sm:px-3.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="text-[13px] font-medium tracking-[-0.01em] text-[#141414]">
            {title}
          </h2>
          <p className={cn("text-[11px] tabular-nums", HUB_MUTED)}>
            {stats.activeDays > 0
              ? `${stats.activeDays} of ${points.length}`
              : "Waiting"}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 sm:gap-x-4">
          {summary.map((item) => (
            <p
              key={item.id}
              className="flex items-baseline gap-1 text-[11px] tabular-nums"
              title={`${item.label}: ${item.value} · ${item.hint}`}
            >
              <span className={HUB_MUTED}>{item.label}</span>
              <span className="font-semibold text-[#141414]">{item.value}</span>
            </p>
          ))}
        </div>
      </div>

      <div className="px-3 py-2 sm:px-3.5" role="img" aria-label={ariaLabel}>
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
                : Math.max(2, Math.round((point.value / max) * METER_TRACK_PX));
            const isToday = point.day === todayDay;
            const isPeak = point.day === peakDay && point.value > 0 && !isToday;

            return (
              <div
                key={point.day}
                className="group relative flex min-w-0 flex-col items-stretch gap-1"
                title={`${point.label} · ${formatMoneyCompact(point.value)}`}
              >
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md bg-white px-1.5 py-0.5 text-[10px] shadow-[0_4px_16px_-4px_rgba(20,20,20,0.18)] ring-1 ring-[color-mix(in_srgb,#141414_8%,transparent)] group-hover:block">
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
                      className={cn(
                        "hub-bar-grow w-full rounded-sm",
                        isToday && "ring-1 ring-[#B08D48]/50",
                      )}
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

                <div className="flex items-center justify-center gap-0.5">
                  <span
                    className={cn(
                      "text-[9px] font-medium tabular-nums leading-none",
                      isToday ? "text-[#8A6B2E]" : "text-[#666666]",
                    )}
                  >
                    {dayOfMonth(point.day)}
                  </span>
                  <span
                    className={cn(
                      "text-[8px] uppercase leading-none",
                      isToday ? "text-[#B08D48]" : "text-[#B0A898]",
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
