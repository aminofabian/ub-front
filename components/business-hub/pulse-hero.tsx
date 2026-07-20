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
    <section
      className={cn(
        HUB_SURFACE,
        "relative overflow-hidden px-4 py-4 sm:px-5 sm:py-5",
      )}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(176,141,72,0.14) 0%, transparent 68%)",
        }}
        aria-hidden
      />

      <div className="relative space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.16em]",
                  HUB_MUTED,
                )}
              >
                {eyebrow}
              </p>
              <span className={cn("text-[10px]", HUB_MUTED)}>·</span>
              <p className={cn("text-[10px]", HUB_MUTED)}>{revenueLabel}</p>
            </div>
            <div className="mt-1 flex flex-wrap items-end gap-2.5">
              <p
                className="font-[family-name:var(--font-heading)] text-[clamp(1.85rem,4.5vw,2.65rem)] font-medium leading-none tracking-tight text-black"
                style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
              >
                {revenue}
              </p>
              {trend ? (
                <span
                  className={cn(
                    "mb-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
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
            <p className="mt-2 max-w-2xl text-sm leading-snug text-[#3A3A3A]">
              {headline}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {metrics.map((metric) => {
            const body = (
              <div className="rounded-md border border-[#F0EBE3] bg-white/70 px-3 py-2.5 transition-colors hover:border-[#E8DFD0] hover:bg-[#FCFBF8]">
                <p className={cn("text-[11px] font-medium", HUB_MUTED)}>
                  {metric.label}
                </p>
                <p className="mt-0.5 text-base font-semibold tracking-tight text-black tabular-nums sm:text-lg">
                  {metric.value}
                </p>
                {metric.hint ? (
                  <p
                    className={cn(
                      "mt-0.5 text-[11px] font-medium leading-tight",
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
