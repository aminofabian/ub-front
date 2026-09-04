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
        justUpdated && "hub-scan-sweep",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#B08D48_0%,#B08D48_28%,transparent_28%)]" aria-hidden />

      <div className="relative grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="flex flex-col justify-center gap-2 border-b border-[color-mix(in_srgb,#141414_8%,transparent)] px-4 py-3.5 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-heading text-[15px] font-medium tracking-[-0.02em] text-[#141414]">
              {eyebrow}
            </p>
            <span className="text-[#C9BFA8]" aria-hidden>
              /
            </span>
            <p className={cn("text-[12px]", HUB_MUTED)}>{revenueLabel}</p>
            {live ? (
              <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-emerald-800">
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
                "text-[clamp(1.85rem,3.2vw,2.35rem)] font-medium leading-none tracking-[-0.035em] text-[#141414] tabular-nums",
                justUpdated && "hub-figure-pop",
              )}
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              {revenue}
            </p>
            {trend ? (
              <span
                className={cn(
                  "mb-0.5 inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
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
          </div>

          {revenueBreakdown ? (
            <dl className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] tabular-nums text-[#5C5C5C]">
              <div>
                <dt className="inline">Cash </dt>
                <dd className="inline font-medium text-[#141414]">
                  {revenueBreakdown.cash}
                </dd>
              </div>
              <span aria-hidden className="text-[#C9BFA8]">
                ·
              </span>
              <div>
                <dt className="inline">M-Pesa </dt>
                <dd className="inline font-medium text-[#141414]">
                  {revenueBreakdown.mpesa}
                </dd>
              </div>
              <span aria-hidden className="text-[#C9BFA8]">
                ·
              </span>
              <div>
                <dt className="inline">Credit </dt>
                <dd className="inline font-medium text-[#141414]">
                  {revenueBreakdown.credit}
                </dd>
              </div>
            </dl>
          ) : null}

          <p className="line-clamp-2 max-w-prose text-[13px] leading-snug text-[#4A4A4A]">
            {headline}
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-[color-mix(in_srgb,#141414_8%,transparent)] sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const body = (
              <div className="bg-transparent px-3.5 py-3 transition-colors hover:bg-[#FAF8F3]">
                <p className={cn("text-[11px] font-medium", HUB_MUTED)}>
                  {metric.label}
                </p>
                <p
                  className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-[#141414] tabular-nums"
                  style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
                >
                  {metric.value}
                </p>
                {metric.hint ? (
                  <p
                    className={cn(
                      "mt-1 truncate text-[11px] leading-tight",
                      metric.tone === "positive" && "text-emerald-700",
                      metric.tone === "warning" && "text-[#C47A5A]",
                      metric.tone === "negative" && "text-rose-600",
                      (!metric.tone || metric.tone === "muted") &&
                        "text-[#7A7A7A]",
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
