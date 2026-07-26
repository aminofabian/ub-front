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
        "hub-rise relative overflow-hidden",
        justUpdated && "hub-scan-sweep border-[#B08D48]/55",
      )}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[#141414]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          background:
            "linear-gradient(135deg, rgba(176,141,72,0.08) 0%, transparent 42%, transparent 100%)",
        }}
        aria-hidden
      />

      <div className="relative grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-3 border-b border-[#E6E1D8] px-4 py-4 sm:px-5 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B08D48]">
              {eyebrow}
            </p>
            <span className="text-[#D4CBB8]" aria-hidden>
              /
            </span>
            <p className={cn("text-[10px] uppercase tracking-[0.12em]", HUB_MUTED)}>
              {revenueLabel}
            </p>
            {live ? (
              <span className="ml-auto inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                <span
                  className={cn(
                    "size-1.5 bg-emerald-500 hub-live-beacon",
                    justUpdated && "animate-pulse",
                  )}
                  aria-hidden
                />
                Streaming
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-2.5">
            <p
              key={justUpdated ? `${revenue}-tick` : revenue}
              className={cn(
                "text-[clamp(2rem,5vw,2.85rem)] font-medium leading-none tracking-tight text-[#141414] tabular-nums",
                justUpdated && "hub-figure-pop",
              )}
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              {revenue}
            </p>
            {trend ? (
              <span
                className={cn(
                  "mb-1 inline-flex items-center border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
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

          <p className="max-w-xl text-sm leading-relaxed text-[#3A3A3A]">
            {headline}
          </p>
        </div>

        <div className="grid grid-cols-2 bg-[#E6E1D8]">
          {metrics.map((metric, i) => {
            const body = (
              <div className="group relative flex h-full flex-col justify-between bg-white px-3.5 py-3 transition-colors hover:bg-[#FCFAF6]">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "text-[10px] font-medium uppercase tracking-[0.1em]",
                      HUB_MUTED,
                    )}
                  >
                    {metric.label}
                  </p>
                  <span
                    className="font-mono text-[9px] tabular-nums text-[#D0C6B4]"
                    aria-hidden
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="mt-2">
                  <p className="text-lg font-semibold tracking-tight text-[#141414] tabular-nums sm:text-xl">
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
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-[#B08D48] transition-transform duration-300 group-hover:scale-x-100"
                  aria-hidden
                />
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
