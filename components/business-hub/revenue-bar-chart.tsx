"use client";

import {
  HUB_ACCENT,
  HUB_MUTED,
  HUB_SURFACE,
} from "@/lib/business-hub/constants";
import type { DailyRevenuePoint } from "@/lib/business-hub/build-daily-revenue-series";
import { HubSectionLabel } from "@/components/business-hub/hub-section-label";
import { useFormatMoney } from "@/hooks/use-format-money";
import { cn } from "@/lib/utils";

const BAR_TRACK_PX = 44;
const BAR_FILL = "#C9A86A";
const BAR_FILL_TODAY = HUB_ACCENT;

export function RevenueBarChart({
  points,
  ariaLabel,
  caption,
  title = "Revenue runway",
}: {
  points: DailyRevenuePoint[];
  ariaLabel: string;
  caption?: string;
  title?: string;
}) {
  const { formatMoneyCompact } = useFormatMoney();
  const max = Math.max(...points.map((p) => p.value), 1);
  const showEveryLabel = points.length <= 8;
  const activeDays = points.filter((p) => p.value > 0).length;
  const peakIndex = points.reduce(
    (best, point, index) =>
      point.value > points[best]!.value ? index : best,
    0,
  );

  return (
    <section className={cn(HUB_SURFACE, "relative overflow-hidden px-3 py-2")}>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <HubSectionLabel
            index="02"
            title={title}
            meta={
              activeDays > 0
                ? `${activeDays}d`
                : "Waiting"
            }
          />
          {caption ? (
            <p className="max-w-[55%] truncate text-[10px] font-medium text-[#5A5A5A]">
              {caption}
            </p>
          ) : null}
        </div>

        <div
          className="relative flex items-end justify-between gap-1 border-b border-[#E6E1D8]"
          style={{ height: BAR_TRACK_PX + 14 }}
          role="img"
          aria-label={ariaLabel}
        >
          <div
            className="pointer-events-none absolute inset-x-0 bottom-4 border-t border-dashed border-[#EDE8DF]"
            style={{ top: 4 }}
            aria-hidden
          />

          {points.map((point, index) => {
            const heightPx =
              point.value <= 0
                ? 0
                : Math.max(4, Math.round((point.value / max) * BAR_TRACK_PX));
            const isHighlight = index === points.length - 1 && point.value > 0;
            const isPeak = index === peakIndex && point.value > 0 && !isHighlight;
            const showLabel =
              showEveryLabel ||
              index === 0 ||
              index === points.length - 1 ||
              index % Math.ceil(points.length / 5) === 0;

            return (
              <div
                key={point.day}
                className="group relative flex min-w-0 flex-1 flex-col items-center justify-end gap-1 pb-0"
                style={{ height: "100%" }}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute bottom-full z-10 mb-1.5 hidden border border-[#E6E1D8] bg-[#141414] px-2 py-1 text-[11px] text-white group-hover:block",
                    "whitespace-nowrap",
                  )}
                >
                  <span className="font-medium">{point.label}</span>
                  <span className="mx-1 text-[#888888]">·</span>
                  <span className="tabular-nums font-semibold">
                    {formatMoneyCompact(point.value)}
                  </span>
                </div>

                <div
                  className="flex w-full flex-col items-center justify-end"
                  style={{ height: BAR_TRACK_PX }}
                >
                  {point.value > 0 ? (
                    <div
                      className={cn(
                        "hub-bar-grow w-full max-w-[22px]",
                        isHighlight && "ring-1 ring-[#B08D48]/35 ring-offset-1 ring-offset-white",
                      )}
                      style={{
                        height: heightPx,
                        animationDelay: `${index * 40}ms`,
                        background: isHighlight
                          ? `linear-gradient(180deg, #D4B06A 0%, ${BAR_FILL_TODAY} 100%)`
                          : isPeak
                            ? `linear-gradient(180deg, #D9C7A0 0%, ${BAR_FILL} 100%)`
                            : `linear-gradient(180deg, #D9C7A0 0%, ${BAR_FILL} 100%)`,
                      }}
                    />
                  ) : (
                    <div
                      className="w-full max-w-[22px] bg-[#E8E8E8]"
                      style={{ height: 2 }}
                    />
                  )}
                </div>

                <span
                  className={cn(
                    "w-full truncate text-center text-[9px] leading-none sm:text-[10px]",
                    HUB_MUTED,
                    isHighlight && "font-semibold text-[#8A6B2E]",
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
    </section>
  );
}
