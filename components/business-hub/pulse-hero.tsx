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
    <section
      className={cn(
        HUB_SURFACE,
        "relative",
        justUpdated && "hub-scan-sweep ring-1 ring-[#B08D48]/35",
      )}
    >
      <div className="relative grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col justify-center gap-2 border-b border-[color-mix(in_srgb,#141414_6%,transparent)] px-4 py-3.5 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[13px] font-medium tracking-[-0.01em] text-[#141414]">
              {eyebrow}
            </p>
            <span className="text-[#D4CBB8]" aria-hidden>
              ·
            </span>
            <p className={cn("text-[12px]", HUB_MUTED)}>{revenueLabel}</p>
            {live ? (
              <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                <span
                  className={cn(
                    "size-1.5 rounded-full bg-emerald-500 hub-live-beacon",
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
                "text-[clamp(1.65rem,2.8vw,2.05rem)] font-medium leading-none tracking-tight text-[#141414] tabular-nums",
                justUpdated && "hub-figure-pop",
              )}
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              {revenue}
            </p>
            {trend ? (
              <span
                className={cn(
                  "mb-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
                  trendTone === "positive" &&
                    "bg-emerald-500/10 text-emerald-700",
                  trendTone === "warning" &&
                    "bg-[#C47A5A]/10 text-[#C47A5A]",
                  trendTone === "negative" &&
                    "bg-rose-500/10 text-rose-700",
                  trendTone === "muted" && "bg-[#F0EEE9] text-[#666666]",
                )}
              >
                {trend}
              </span>
            ) : null}
          </div>

          {revenueBreakdown ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] tabular-nums text-[#666666]">
              <span>
                Cash{" "}
                <span className="font-medium text-[#141414]">
                  {revenueBreakdown.cash}
                </span>
              </span>
              <span aria-hidden>·</span>
              <span>
                M-Pesa{" "}
                <span className="font-medium text-[#141414]">
                  {revenueBreakdown.mpesa}
                </span>
              </span>
              <span aria-hidden>·</span>
              <span>
                Credit{" "}
                <span className="font-medium text-[#141414]">
                  {revenueBreakdown.credit}
                </span>
              </span>
            </p>
          ) : null}

          <p className="line-clamp-2 text-[13px] leading-snug text-[#5A5A5A]">
            {headline}
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-[color-mix(in_srgb,#141414_6%,transparent)] sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const body = (
              <div className="bg-transparent px-3.5 py-3 transition-colors hover:bg-[#FAF9F6]">
                <p className={cn("text-[11px] font-medium", HUB_MUTED)}>
                  {metric.label}
                </p>
                <p className="mt-1 text-[15px] font-semibold tracking-tight text-[#141414] tabular-nums">
                  {metric.value}
                </p>
                {metric.hint ? (
                  <p
                    className={cn(
                      "mt-1 truncate text-[11px] leading-tight",
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
