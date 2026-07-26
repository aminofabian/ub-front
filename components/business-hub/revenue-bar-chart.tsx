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

function fmtBarAmount(n: number): string {
  if (n <= 0) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

const BAR_TRACK_PX = 88;
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
    <section className={cn(HUB_SURFACE, "hub-rise hub-rise-delay-1 relative overflow-hidden px-3.5 py-3.5 sm:px-4")}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(176,141,72,0.55), transparent)",
        }}
        aria-hidden
      />
      <div className="space-y-3">
        <div>
          <HubSectionLabel
            index="02"
            title={title}
            meta={
              activeDays > 0
                ? `${activeDays} day${activeDays === 1 ? "" : "s"} plotted`
                : "Waiting on sales"
            }
          />
          {caption ? (
            <p className="mt-1 text-xs font-medium leading-snug text-[#3A3A3A] sm:text-sm">
              {caption}
            </p>
          ) : null}
        </div>

        <div
          className="relative flex items-end justify-between gap-1 border-b border-[#E6E1D8] sm:gap-1.5"
          style={{ height: BAR_TRACK_PX + 28 }}
          role="img"
          aria-label={ariaLabel}
        >
          <div
            className="pointer-events-none absolute inset-x-0 bottom-6 border-t border-dashed border-[#EDE8DF]"
            style={{ top: 12 }}
            aria-hidden
          />

          {points.map((point, index) => {
            const heightPx =
              point.value <= 0
                ? 0
                : Math.max(6, Math.round((point.value / max) * BAR_TRACK_PX));
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
                className="group relative flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5 pb-0"
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
                    <>
                      <span
                        className={cn(
                          "mb-1 max-w-full truncate text-center text-[9px] font-semibold tabular-nums leading-none sm:text-[10px]",
                          isHighlight
                            ? "text-[#8A6B2E]"
                            : isPeak
                              ? "text-[#141414]"
                              : "text-[#6B6B6B]",
                        )}
                      >
                        {fmtBarAmount(point.value)}
                      </span>
                      <div
                        className={cn(
                          "hub-bar-grow w-full max-w-[26px]",
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
                    </>
                  ) : (
                    <div
                      className="w-full max-w-[26px] bg-[#E8E8E8]"
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
