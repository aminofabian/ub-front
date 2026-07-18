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
        "relative overflow-hidden px-5 py-6 sm:px-8 sm:py-8",
      )}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full opacity-80"
        style={{
          background:
            "radial-gradient(circle, rgba(176,141,72,0.16) 0%, transparent 68%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, #E8DFD0 20%, #E8DFD0 80%, transparent)",
        }}
        aria-hidden
      />

      <div className="relative space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.18em]",
                HUB_MUTED,
              )}
            >
              {eyebrow}
            </p>
            <p className={cn("mt-2 text-sm", HUB_MUTED)}>{revenueLabel}</p>
            <p
              className="mt-1 font-[family-name:var(--font-heading)] text-[clamp(2.4rem,6vw,3.75rem)] font-medium leading-[0.95] tracking-tight text-black"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              {revenue}
            </p>
          </div>
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tabular-nums",
                trendTone === "positive" && "bg-emerald-500/10 text-emerald-700",
                trendTone === "warning" && "bg-[#C47A5A]/10 text-[#C47A5A]",
                trendTone === "negative" && "bg-rose-500/10 text-rose-700",
                trendTone === "muted" && "bg-[#F3F3F3] text-[#666666]",
              )}
            >
              {trend}
            </span>
          ) : null}
        </div>

        <p className="max-w-2xl text-base leading-relaxed text-[#3A3A3A]">
          {headline}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => {
            const body = (
              <div className="rounded-lg border border-[#F0EBE3] bg-white/70 px-4 py-3.5 transition-colors hover:border-[#E8DFD0] hover:bg-[#FCFBF8]">
                <p className={cn("text-xs font-medium", HUB_MUTED)}>
                  {metric.label}
                </p>
                <p className="mt-1.5 text-xl font-semibold tracking-tight text-black tabular-nums">
                  {metric.value}
                </p>
                {metric.hint ? (
                  <p
                    className={cn(
                      "mt-1 text-xs font-medium",
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
