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
}: {
  eyebrow: string;
  revenueLabel: string;
  revenue: string;
  headline: string;
  trend?: string | null;
  trendTone?: "muted" | "positive" | "warning" | "negative";
  metrics: PulseMetric[];
}) {
  return (
    <section className={cn(HUB_SURFACE, "px-3.5 py-3 sm:px-4")}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.14em]",
                  HUB_MUTED,
                )}
              >
                {eyebrow}
              </p>
              <span className={cn("text-[10px]", HUB_MUTED)}>·</span>
              <p className={cn("text-[10px]", HUB_MUTED)}>{revenueLabel}</p>
            </div>
            <div className="mt-1 flex flex-wrap items-end gap-2">
              <p
                className="text-[clamp(1.5rem,3.8vw,2.15rem)] font-medium leading-none tracking-tight text-black"
                style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
              >
                {revenue}
              </p>
              {trend ? (
                <span
                  className={cn(
                    "mb-0.5 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    trendTone === "positive" &&
                      "bg-emerald-500/10 text-emerald-700",
                    trendTone === "warning" &&
                      "bg-[#C47A5A]/10 text-[#C47A5A]",
                    trendTone === "negative" && "bg-rose-500/10 text-rose-700",
                    trendTone === "muted" && "bg-[#F3F3F3] text-[#666666]",
                  )}
                >
                  {trend}
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 max-w-2xl text-xs leading-snug text-[#3A3A3A] sm:text-sm">
              {headline}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border border-[#F0EBE3] bg-[#F0EBE3] lg:grid-cols-4">
          {metrics.map((metric) => {
            const body = (
              <div className="bg-white px-3 py-2 transition-colors hover:bg-[#FCFBF8]">
                <p className={cn("text-[10px] font-medium", HUB_MUTED)}>
                  {metric.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold tracking-tight text-black tabular-nums sm:text-base">
                  {metric.value}
                </p>
                {metric.hint ? (
                  <p
                    className={cn(
                      "mt-0.5 text-[10px] font-medium leading-tight",
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
