"use client";

import Link from "next/link";

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
  eyebrow: string;
  revenueLabel: string;
  revenue: string;
  revenueBreakdown?: { cash: string; mpesa: string; credit: string } | null;
  headline: string;
  trend?: string | null;
  trendTone?: "muted" | "positive" | "warning" | "negative";
  metrics: PulseMetric[];
  live?: boolean;
  justUpdated?: boolean;
}) {
  return (
    <section className={cn(justUpdated && "hub-scan-sweep")}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-[13px] font-semibold tracking-tight text-[#141414]">
              {eyebrow}
            </p>
            <span className="text-[#C4BBA8]" aria-hidden>
              ·
            </span>
            <p className="text-[12px] text-[#666666]">{revenueLabel}</p>
            {live ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
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
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <p
              key={justUpdated ? `${revenue}-tick` : revenue}
              className={cn(
                "text-[1.65rem] font-medium leading-none tracking-tight text-[#141414] tabular-nums",
                justUpdated && "hub-figure-pop",
              )}
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              {revenue}
            </p>
            {trend ? (
              <span
                className={cn(
                  "text-[11px] font-semibold tabular-nums",
                  trendTone === "positive" && "text-emerald-700",
                  trendTone === "warning" && "text-[#C47A5A]",
                  trendTone === "negative" && "text-rose-700",
                  trendTone === "muted" && "text-[#888888]",
                )}
              >
                {trend}
              </span>
            ) : null}
          </div>
          {revenueBreakdown ? (
            <p className="mt-1 flex flex-wrap gap-x-2.5 text-[11px] tabular-nums text-[#666666]">
              <span>
                Cash{" "}
                <span className="font-medium text-[#141414]">
                  {revenueBreakdown.cash}
                </span>
              </span>
              <span>
                M-Pesa{" "}
                <span className="font-medium text-[#141414]">
                  {revenueBreakdown.mpesa}
                </span>
              </span>
              <span>
                Credit{" "}
                <span className="font-medium text-[#141414]">
                  {revenueBreakdown.credit}
                </span>
              </span>
            </p>
          ) : null}
          <p className="mt-1 line-clamp-1 text-[11px] text-[#888888]">{headline}</p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        {metrics.map((metric) => {
          const body = (
            <div className="py-1.5 transition-colors hover:text-[#8A6B2E]">
              <p className="text-[11px] text-[#888888]">{metric.label}</p>
              <p className="text-[14px] font-semibold tracking-tight text-[#141414] tabular-nums">
                {metric.value}
              </p>
              {metric.hint ? (
                <p
                  className={cn(
                    "truncate text-[10px] leading-tight",
                    metric.tone === "positive" && "text-emerald-600",
                    metric.tone === "warning" && "text-[#C47A5A]",
                    metric.tone === "negative" && "text-rose-600",
                    (!metric.tone || metric.tone === "muted") && "text-[#AAAAAA]",
                  )}
                >
                  {metric.hint}
                </p>
              ) : null}
            </div>
          );
          return metric.href ? (
            <Link key={metric.label} href={metric.href} className="block min-w-0">
              {body}
            </Link>
          ) : (
            <div key={metric.label} className="min-w-0">
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
