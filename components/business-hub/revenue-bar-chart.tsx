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

/** Compact KES for bar tops — keeps the runway readable without hover. */
function fmtBarKes(n: number): string {
  if (n <= 0) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

const BAR_TRACK_PX = 148;

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
  const max = Math.max(...points.map((p) => p.value), 1);
  const showEveryLabel = points.length <= 8;
  const activeDays = points.filter((p) => p.value > 0).length;

  return (
    <section
      className={cn(
        HUB_SURFACE,
        "relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 100% 0%, #F9F6F0 0%, transparent 55%), linear-gradient(180deg, #FFFFFF 0%, #FCFBF8 100%)",
        }}
        aria-hidden
      />
      <div className="relative space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className={cn("text-sm font-medium", HUB_MUTED)}>{title}</h2>
            {caption ? (
              <p className="mt-1 text-sm font-medium text-[#3A3A3A]">
                {caption}
              </p>
            ) : null}
          </div>
          <p className={cn("text-[11px] uppercase tracking-[0.14em]", HUB_MUTED)}>
            {activeDays > 0
              ? `${activeDays} day${activeDays === 1 ? "" : "s"} plotted`
              : "Waiting on sales"}
          </p>
        </div>

        <div
          className="flex items-end justify-between gap-1.5 sm:gap-2.5"
          style={{ height: BAR_TRACK_PX + 36 }}
          role="img"
          aria-label={ariaLabel}
        >
          {points.map((point, index) => {
            const heightPx =
              point.value <= 0
                ? 0
                : Math.max(10, Math.round((point.value / max) * BAR_TRACK_PX));
            const isHighlight = index === points.length - 1 && point.value > 0;
            const showLabel =
              showEveryLabel ||
              index === 0 ||
              index === points.length - 1 ||
              index % Math.ceil(points.length / 5) === 0;

            return (
              <div
                key={point.day}
                className="group relative flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                style={{ height: "100%" }}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-md border border-[#E8DFD0] bg-white px-2 py-1 text-[11px] shadow-sm group-hover:block",
                    "whitespace-nowrap text-[#3A3A3A]",
                  )}
                >
                  <span className="font-medium">{point.label}</span>
                  <span className="mx-1 text-[#CCCCCC]">·</span>
                  <span className="tabular-nums font-semibold">
                    {fmtKes(point.value)}
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
                          "mb-1 max-w-full truncate text-center text-[10px] font-semibold tabular-nums leading-none",
                          isHighlight ? "text-[#8A6B2E]" : "text-[#6B6B6B]",
                        )}
                      >
                        {fmtBarKes(point.value)}
                      </span>
                      <div
                        className="w-full max-w-[36px] origin-bottom rounded-t-md transition-[height,background-color] duration-500 ease-out"
                        style={{
                          height: heightPx,
                          backgroundColor: isHighlight
                            ? HUB_ACCENT
                            : HUB_ACCENT_LIGHT,
                          boxShadow: isHighlight
                            ? "0 8px 20px rgba(176, 141, 72, 0.22)"
                            : undefined,
                        }}
                      />
                    </>
                  ) : (
                    <div
                      className="w-full max-w-[36px] rounded-full bg-[#E8E8E8]"
                      style={{ height: 2 }}
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
    </section>
  );
}
