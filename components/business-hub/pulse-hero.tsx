"use client";

import Link from "next/link";

import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export type PulseMetric = {
  label: string;
  value: string;
  hint?: string;
  tone?: "muted" | "positive" | "warning" | "negative";
  href?: string;
};

export function PulseHero({
  eyebrow,
  revenueLabel,
  revenue,
  revenueBreakdown,
  headline,
  trend,
  trendTone = "muted",
  metrics,
  live = false,
  justUpdated = false,
}: {
  eyebrow?: string;
  revenueLabel?: string;
  revenue: string;
  revenueBreakdown?: { cash: string; mpesa: string; credit: string } | null;
  headline: string;
  trend?: string | null;
  trendTone?: "muted" | "positive" | "warning" | "negative";
  metrics: PulseMetric[];
  live?: boolean;
  justUpdated?: boolean;
}) {
  const a11y = [eyebrow, revenueLabel, revenue, headline]
    .filter(Boolean)
    .join(". ");

  const metricCols =
    metrics.length <= 2
      ? "grid-cols-2 divide-y-0"
      : metrics.length === 3
        ? "grid-cols-3 divide-y-0"
        : metrics.length === 4
          ? "grid-cols-2 sm:grid-cols-4 sm:divide-y-0"
          : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 xl:divide-y-0";

  return (
    <section
      className={cn(HUB_SURFACE, "relative", justUpdated && "hub-scan-sweep")}
      aria-label={a11y}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#B08D48_0%,#B08D48_14%,transparent_14%)]"
        aria-hidden
      />

      <div className="flex flex-col md:flex-row md:items-stretch">
        <div className="flex min-w-0 md:w-[min(42%,22rem)] md:shrink-0 flex-col justify-center gap-1 border-b border-[color-mix(in_srgb,#141414_8%,transparent)] px-3 py-2 md:border-b-0 md:border-r">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p
              key={justUpdated ? `${revenue}-tick` : revenue}
              className={cn(
                "text-[1.4rem] font-medium leading-none tracking-[-0.035em] text-[#141414] tabular-nums sm:text-[1.55rem]",
                justUpdated && "hub-figure-pop",
              )}
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              {revenue}
            </p>
            {trend ? (
              <span
                className={cn(
                  "inline-flex items-center px-1 py-px text-[10px] font-medium tabular-nums",
                  trendTone === "positive" &&
                    "bg-emerald-500/10 text-emerald-800",
                  trendTone === "warning" &&
                    "bg-[#C47A5A]/10 text-[#C47A5A]",
                  trendTone === "negative" &&
                    "bg-rose-500/10 text-rose-700",
                  trendTone === "muted" && "bg-[#EFECE6] text-[#5C5C5C]",
                )}
              >
                {trend}
              </span>
            ) : null}
            {live ? (
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium tracking-wide text-emerald-800">
                <span
                  className={cn(
                    "size-1.5 rounded-none bg-emerald-500 hub-live-beacon",
                    justUpdated && "animate-pulse",
                  )}
                  aria-hidden
                />
                Live
              </span>
            ) : null}
          </div>

          {revenueBreakdown ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0 text-[11px] tabular-nums text-[#6B6B6B]">
              <span>
                Cash{" "}
                <span className="font-medium text-[#141414]">
                  {revenueBreakdown.cash}
                </span>
              </span>
              <span aria-hidden className="text-[#C9BFA8]">
                ·
              </span>
              <span>
                M-Pesa{" "}
                <span className="font-medium text-[#141414]">
                  {revenueBreakdown.mpesa}
                </span>
              </span>
              <span aria-hidden className="text-[#C9BFA8]">
                ·
              </span>
              <span>
                Credit{" "}
                <span className="font-medium text-[#141414]">
                  {revenueBreakdown.credit}
                </span>
              </span>
            </p>
          ) : headline ? (
            <p className="truncate text-[11px] text-[#7A7A7A]" title={headline}>
              {headline}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            "grid min-w-0 flex-1 divide-x divide-y divide-[color-mix(in_srgb,#141414_8%,transparent)]",
            metricCols,
          )}
        >
          {metrics.map((metric) => {
            const body = (
              <div className="flex h-full min-h-[3.25rem] flex-col justify-center gap-0.5 px-2.5 py-1.5 transition-colors hover:bg-[#FAF8F3] sm:px-3 sm:py-2">
                <p className={cn("truncate text-[10px] font-medium", HUB_MUTED)}>
                  {metric.label}
                </p>
                <p
                  className="truncate text-[13px] font-semibold leading-none tracking-[-0.02em] text-[#141414] tabular-nums sm:text-[14px]"
                  style={{
                    fontFamily: "var(--font-heading), Georgia, serif",
                  }}
                >
                  {metric.value}
                </p>
                {metric.hint ? (
                  <p
                    className={cn(
                      "truncate text-[10px] leading-tight",
                      metric.tone === "positive" && "text-emerald-700",
                      metric.tone === "warning" && "text-[#C47A5A]",
                      metric.tone === "negative" && "text-rose-600",
                      (!metric.tone || metric.tone === "muted") &&
                        "text-[#8A8A8A]",
                    )}
                  >
                    {metric.hint}
                  </p>
                ) : null}
              </div>
            );
            return metric.href ? (
              <Link
                key={metric.label}
                href={metric.href}
                className="min-w-0"
                title={`${metric.label}: ${metric.value}${metric.hint ? ` · ${metric.hint}` : ""}`}
              >
                {body}
              </Link>
            ) : (
              <div key={metric.label} className="min-w-0">
                {body}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
