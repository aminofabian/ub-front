"use client";

import { useState } from "react";

import { useFormatMoney } from "@/hooks/use-format-money";
import type { DailyRevenuePoint } from "@/lib/business-hub/build-daily-revenue-series";
import { cn } from "@/lib/utils";

const BAR_MUTED = "#cfeee3";
const BAR_PICKED = "#7ecbb8";
const BAR_TODAY = "#0f766e";

function dayOfMonth(isoDay: string): string {
  const day = isoDay.slice(8, 10);
  return day.startsWith("0") ? day.slice(1) : day;
}

function weekdayNarrow(isoDay: string): string {
  const date = new Date(`${isoDay}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { weekday: "narrow" });
}

/**
 * The revenue shape: mint bars with today picked out in the accent, a faint
 * baseline to sit them on, and a readout for the tapped (or latest) day so the
 * exact figure is always legible instead of a clipped tooltip. Taller on
 * tablets/desktop; day labels carry a weekday when there is room for one.
 */
export function RevenueBarChart({
  points,
  ariaLabel,
}: {
  points: DailyRevenuePoint[];
  ariaLabel: string;
}) {
  const { formatMoneyCompact } = useFormatMoney();
  const [picked, setPicked] = useState<string | null>(null);

  if (points.length === 0) return null;

  const max = Math.max(...points.map((point) => point.value), 1);
  const todayDay = points[points.length - 1]?.day ?? null;
  const selected =
    points.find((point) => point.day === picked) ??
    points[points.length - 1] ??
    null;
  const isTodaySelected = selected?.day === todayDay;
  const showWeekday = points.length <= 8;
  const columns = {
    gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`,
  } as const;

  return (
    <div role="group" aria-label={ariaLabel}>
      {selected ? (
        <div className="flex items-baseline justify-between gap-2 px-1">
          <span className="text-[11px] text-[#667085]">
            {selected.label}
            {isTodaySelected ? " · Today" : ""}
          </span>
          <span className="text-[12px] font-semibold tabular-nums text-[#101828]">
            {formatMoneyCompact(selected.value)}
          </span>
        </div>
      ) : null}

      <div className="relative mt-2.5">
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[#e6eaec]"
          aria-hidden
        />
        <div
          className="grid h-16 items-stretch gap-1 sm:h-28"
          style={columns}
        >
          {points.map((point) => {
            const pct = point.value <= 0 ? 4 : Math.max(6, (point.value / max) * 100);
            const isToday = point.day === todayDay;
            const isPicked = selected?.day === point.day;
            return (
              <button
                key={point.day}
                type="button"
                onClick={() =>
                  setPicked((prev) => (prev === point.day ? null : point.day))
                }
                aria-pressed={isPicked}
                aria-label={`${point.label}: ${formatMoneyCompact(point.value)}`}
                className="flex min-w-0 flex-col justify-end"
              >
                <span
                  className="w-full rounded-t-[4px] transition-[height,background-color] duration-200"
                  style={{
                    height: `${pct}%`,
                    backgroundColor: isToday
                      ? BAR_TODAY
                      : isPicked
                        ? BAR_PICKED
                        : BAR_MUTED,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-1.5 grid gap-1" style={columns}>
        {points.map((point) => {
          const isToday = point.day === todayDay;
          const weekday = weekdayNarrow(point.day);
          return (
            <span
              key={point.day}
              className={cn(
                "truncate text-center text-[11px] font-medium leading-none tabular-nums sm:text-[12px]",
                isToday ? "text-[#0f766e]" : "text-[#667085]",
              )}
            >
              {showWeekday ? (
                <span className="sm:hidden">{weekday} </span>
              ) : null}
              {dayOfMonth(point.day)}
              <span className="hidden sm:inline">{weekday}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
