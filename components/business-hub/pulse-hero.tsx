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
  headline: string;
  trend?: string | null;
  trendTone?: "muted" | "positive" | "warning" | "negative";
  metrics: PulseMetric[];
  live?: boolean;
  justUpdated?: boolean;
}) {
  return (
    <section
      className={cn(
        HUB_SURFACE,
        "relative overflow-hidden",
        justUpdated && "hub-scan-sweep border-[#B08D48]/55",
      )}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-0.5 bg-[#141414]"
        aria-hidden
      />

      <div className="relative grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col justify-center gap-2 border-b border-[#E6E1D8] px-4 py-3.5 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B08D48]">
              {eyebrow}
            </p>
            <span className="text-[#D4CBB8]" aria-hidden>
              /
            </span>
            <p className={cn("text-[10px] uppercase tracking-[0.1em]", HUB_MUTED)}>
              {revenueLabel}
            </p>
            {live ? (
              <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
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

          <div className="flex flex-wrap items-end gap-2.5">
            <p
              key={justUpdated ? `${revenue}-tick` : revenue}
              className={cn(
                "text-[clamp(1.55rem,2.6vw,1.95rem)] font-medium leading-none tracking-tight text-[#141414] tabular-nums",
                justUpdated && "hub-figure-pop",
              )}
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              {revenue}
            </p>
            {trend ? (
              <span
                className={cn(
                  "mb-0.5 inline-flex items-center border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  trendTone === "positive" &&
                    "border-emerald-200 bg-emerald-500/10 text-emerald-700",
                  trendTone === "warning" &&
                    "border-[#E8C9BB] bg-[#C47A5A]/10 text-[#C47A5A]",
                  trendTone === "negative" &&
                    "border-rose-200 bg-rose-500/10 text-rose-700",
                  trendTone === "muted" &&
                    "border-[#E6E1D8] bg-[#F7F5F1] text-[#666666]",
                )}
              >
                {trend}
              </span>
            ) : null}
          </div>

          <p className="line-clamp-2 text-xs leading-snug text-[#5A5A5A]">
            {headline}
          </p>
        </div>

        <div className="grid grid-cols-2 bg-[#E6E1D8] sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const body = (
              <div className="bg-white px-3 py-3 transition-colors hover:bg-[#FCFAF6]">
                <p className={cn("text-[10px] font-medium uppercase tracking-[0.08em]", HUB_MUTED)}>
                  {metric.label}
                </p>
                <p className="mt-1 text-[15px] font-semibold tracking-tight text-[#141414] tabular-nums">
                  {metric.value}
                </p>
                {metric.hint ? (
                  <p
                    className={cn(
                      "mt-1 truncate text-[10px] font-medium leading-tight",
                      metric.tone === "positive" && "text-emerald-600",
                      metric.tone === "warning" && "text-[#C47A5A]",
                      metric.tone === "negative" && "text-rose-600",
                      (!metric.tone || metric.tone === "muted") &&
                        "text-[#888888]",
                    )}
                  >
                    {metric.hint}
                  </p>
                ) : null}
              </div>
            );
            return metric.href ? (
              <Link key={metric.label} href={metric.href} className="block">
                {body}
              </Link>
            ) : (
              <div key={metric.label}>{body}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
