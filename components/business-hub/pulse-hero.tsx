"use client";

import Link from "next/link";

import {
  HUB_MUTED,
  HUB_SECTION,
  HUB_SURFACE,
} from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export type PulseMetric = {
  label: string;
  value: string;
  hint?: string;
  tone?: "muted" | "positive" | "warning" | "negative";
  href?: string;
};

/**
 * Summary board: revenue leads, then a tidy stats grid.
 * Phone = 2-col tiles under the figure; desktop = figure + side metrics.
 */
export function PulseHero({
  eyebrow: _eyebrow,
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
  void _eyebrow;
  const a11y = [revenueLabel, revenue, headline].filter(Boolean).join(". ");

  return (
    <section className="space-y-2" aria-label={a11y}>
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 className={HUB_SECTION}>Summary</h2>
        {live ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium tracking-wide text-emerald-800">
            <span
              className={cn(
                "size-1.5 bg-emerald-500 hub-live-beacon",
                justUpdated && "animate-pulse",
              )}
              aria-hidden
            />
            Live
          </span>
        ) : null}
      </div>

      <div
        className={cn(HUB_SURFACE, "relative", justUpdated && "hub-scan-sweep")}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#0f766e_0%,#0f766e_14%,transparent_14%)]"
          aria-hidden
        />

        {/* Row 1 — revenue figure */}
        <div className="border-b border-[color-mix(in_srgb,#141414_8%,transparent)] px-3.5 py-3.5 sm:px-4 sm:py-3">
          <p className="text-[11px] font-medium text-[#6B6B6B]">
            {revenueLabel ?? "Revenue"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-end gap-x-2.5 gap-y-1">
            <p
              key={justUpdated ? `${revenue}-tick` : revenue}
              className={cn(
                "font-medium leading-none tracking-[-0.04em] text-[#141414] tabular-nums",
                "text-[2.15rem] sm:text-[1.85rem]",
                justUpdated && "hub-figure-pop",
              )}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {revenue}
            </p>
            {trend ? (
              <span
                className={cn(
                  "mb-0.5 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                  trendTone === "positive" &&
                    "bg-emerald-500/10 text-emerald-800",
                  trendTone === "warning" && "bg-[#C47A5A]/10 text-[#C47A5A]",
                  trendTone === "negative" && "bg-rose-500/10 text-rose-700",
                  trendTone === "muted" && "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[#5C5C5C]",
                )}
              >
                {trend}
              </span>
            ) : null}
          </div>

          {revenueBreakdown ? (
            <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden border border-[color-mix(in_srgb,#141414_8%,transparent)] bg-[color-mix(in_srgb,#141414_8%,transparent)]">
              {(
                [
                  ["Cash", revenueBreakdown.cash],
                  ["M-Pesa", revenueBreakdown.mpesa],
                  ["Credit", revenueBreakdown.credit],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="bg-white px-2.5 py-2 text-center sm:text-left"
                >
                  <p className={cn("text-[10px] font-medium", HUB_MUTED)}>
                    {label}
                  </p>
                  <p className="mt-0.5 text-[12px] font-semibold tabular-nums text-[#141414] sm:text-[13px]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          ) : headline ? (
            <p
              className="mt-2 truncate text-[11px] text-[#7A7A7A]"
              title={headline}
            >
              {headline}
            </p>
          ) : null}
        </div>

        {/* Row 2 — summary stats grid */}
        {metrics.length > 0 ? (
          <div
            className={cn(
              "grid divide-x divide-y divide-[color-mix(in_srgb,#141414_8%,transparent)]",
              "grid-cols-2",
              metrics.length === 3 && "sm:grid-cols-3",
              metrics.length === 4 && "sm:grid-cols-4",
              metrics.length >= 5 && "sm:grid-cols-3 lg:grid-cols-5",
            )}
          >
            {metrics.map((metric) => {
              const body = (
                <div className="flex h-full min-h-[4.25rem] flex-col justify-center gap-1 px-3 py-2.5 transition-colors hover:bg-white sm:min-h-[3.75rem]">
                  <p
                    className={cn(
                      "truncate text-[10px] font-medium",
                      HUB_MUTED,
                    )}
                  >
                    {metric.label}
                  </p>
                  <p
                    className="truncate text-[15px] font-semibold leading-none tracking-[-0.025em] text-[#141414] tabular-nums sm:text-[14px]"
                    style={{ fontFamily: "var(--font-heading)" }}
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
        ) : null}
      </div>
    </section>
  );
}
