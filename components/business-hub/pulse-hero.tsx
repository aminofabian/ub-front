"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
import { HubSectionLabel } from "@/components/business-hub/hub-section-label";
import { cn } from "@/lib/utils";

export type PulseMetric = {
  label: string;
  value: string;
  hint?: string;
  tone?: "muted" | "positive" | "warning" | "negative";
  href?: string;
};

const CELL_DIVIDE = "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]";
const CELL_FILL = "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]";

/**
 * Column count per breakpoint, chosen so the common 3 / 4 / 5 metric sets fill
 * their rows instead of trailing off — a half-empty row is what made the old
 * board read as unbalanced.
 */
function metricGrid(count: number) {
  const cols =
    count <= 2
      ? { phone: 2, sm: 2, xl: 2 }
      : count === 3
        ? { phone: 3, sm: 3, xl: 3 }
        : count === 4
          ? { phone: 2, sm: 4, xl: 4 }
          : { phone: 2, sm: 3, xl: 5 };
  const gridClass =
    count <= 2
      ? "grid-cols-2"
      : count === 3
        ? "grid-cols-3"
        : count === 4
          ? "grid-cols-2 sm:grid-cols-4"
          : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5";
  return {
    gridClass,
    phoneFill: (cols.phone - (count % cols.phone)) % cols.phone,
    smFill: (cols.sm - (count % cols.sm)) % cols.sm,
    xlFill: (cols.xl - (count % cols.xl)) % cols.xl,
  };
}

/**
 * Summary board: revenue leads, tenders split, then a metric matrix that always
 * closes its rows. `footer` carries the trend meter so the whole "how are we
 * doing" answer lives in one panel instead of three stacked sections.
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
  justUpdated = false,
  footer,
}: {
  eyebrow?: string;
  revenueLabel?: string;
  revenue: string;
  revenueBreakdown?: { cash: string; mpesa: string; credit: string } | null;
  headline: string;
  trend?: string | null;
  trendTone?: "muted" | "positive" | "warning" | "negative";
  metrics: PulseMetric[];
  justUpdated?: boolean;
  /** Rendered flush under the metrics, behind a hairline (the trend meter). */
  footer?: ReactNode;
}) {
  void _eyebrow;
  const a11y = [revenueLabel, revenue, headline].filter(Boolean).join(". ");
  const grid = metricGrid(metrics.length);

  const tenders = revenueBreakdown
    ? ([
        ["Cash", revenueBreakdown.cash],
        ["M-Pesa", revenueBreakdown.mpesa],
        ["Credit", revenueBreakdown.credit],
      ] as const)
    : null;

  return (
    <section className="space-y-1.5 sm:space-y-2" aria-label={a11y}>
      <HubSectionLabel title="Summary" className="px-0.5" />

      <div
        className={cn(HUB_SURFACE, "relative", justUpdated && "hub-scan-sweep")}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#0f766e_0%,#0f766e_14%,transparent_14%)]"
          aria-hidden
        />

        {/* Revenue — one dense line on a phone */}
        <div className="border-b border-[color-mix(in_srgb,#141414_8%,transparent)] px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#6B6B6B] sm:normal-case sm:tracking-normal sm:text-[11px]">
                {revenueLabel ?? "Revenue"}
              </p>
              <p
                key={justUpdated ? `${revenue}-tick` : revenue}
                className={cn(
                  "mt-0.5 font-medium leading-none tracking-[-0.04em] text-[#141414] tabular-nums",
                  "text-[1.45rem] sm:mt-1 sm:text-[1.85rem]",
                  justUpdated && "hub-figure-pop",
                )}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {revenue}
              </p>
            </div>
            {trend ? (
              <span
                className={cn(
                  "mb-0.5 inline-flex shrink-0 items-center px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                  trendTone === "positive" &&
                    "bg-emerald-500/10 text-emerald-800",
                  trendTone === "warning" && "bg-[#C47A5A]/10 text-[#C47A5A]",
                  trendTone === "negative" && "bg-rose-500/10 text-rose-700",
                  trendTone === "muted" &&
                    "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[#5C5C5C]",
                )}
              >
                {trend}
              </span>
            ) : null}
          </div>

          {/* Tender split — phone keeps one thin strip, desk gets tiles */}
          {tenders ? (
            <>
              <div className="mt-2 flex gap-px overflow-hidden border border-[color-mix(in_srgb,#141414_8%,transparent)] bg-[color-mix(in_srgb,#141414_8%,transparent)] sm:hidden">
                {tenders.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex min-w-0 flex-1 flex-col gap-0.5 bg-white px-2 py-1"
                  >
                    <span className={cn("truncate text-[9px] font-medium", HUB_MUTED)}>
                      {label}
                    </span>
                    {/* Stacked, not inline: a third of a 320px phone cannot hold
                        "M-Pesa" and a six-figure tender on one line. */}
                    <span className="truncate text-[11px] font-semibold leading-none tabular-nums text-[#141414]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 hidden grid-cols-3 gap-px overflow-hidden border border-[color-mix(in_srgb,#141414_8%,transparent)] bg-[color-mix(in_srgb,#141414_8%,transparent)] sm:grid">
                {tenders.map(([label, value]) => (
                  <div key={label} className="bg-white px-2.5 py-2 text-left">
                    <p className={cn("text-[10px] font-medium", HUB_MUTED)}>
                      {label}
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-[#141414]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : headline ? (
            <p
              className="mt-1 truncate text-[10px] text-[#7A7A7A] sm:mt-2 sm:text-[11px]"
              title={headline}
            >
              {headline}
            </p>
          ) : null}
        </div>

        {metrics.length > 0 ? (
          <div
            className={cn(
              "grid gap-px",
              footer && "border-b border-[color-mix(in_srgb,#141414_8%,transparent)]",
              CELL_DIVIDE,
              grid.gridClass,
            )}
          >
            {metrics.map((metric) => {
              const body = (
                <div className="flex h-full min-h-0 flex-col justify-center gap-0.5 bg-white px-2 py-1.5 transition-colors hover:bg-[color-mix(in_srgb,#0f766e_3%,white)] sm:min-h-[3.75rem] sm:px-3 sm:py-2.5">
                  <p
                    className={cn(
                      "truncate text-[9px] font-medium uppercase tracking-[0.04em] sm:normal-case sm:tracking-normal sm:text-[10px]",
                      HUB_MUTED,
                    )}
                  >
                    {metric.label}
                  </p>
                  <p
                    className="truncate text-[13px] font-semibold leading-none tracking-[-0.025em] text-[#141414] tabular-nums sm:text-[14px]"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {metric.value}
                  </p>
                  {metric.hint ? (
                    <p
                      className={cn(
                        "mt-0.5 hidden truncate text-[10px] leading-tight sm:block",
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

            {/* Keep every row closed, whatever the metric count. */}
            {Array.from({ length: grid.phoneFill }).map((_, index) => (
              <span
                key={`phone-fill-${index}`}
                aria-hidden
                className={cn("sm:hidden", CELL_FILL)}
              />
            ))}
            {Array.from({ length: grid.smFill }).map((_, index) => (
              <span
                key={`sm-fill-${index}`}
                aria-hidden
                className={cn("hidden sm:block xl:hidden", CELL_FILL)}
              />
            ))}
            {Array.from({ length: grid.xlFill }).map((_, index) => (
              <span
                key={`xl-fill-${index}`}
                aria-hidden
                className={cn("hidden xl:block", CELL_FILL)}
              />
            ))}
          </div>
        ) : null}

        {footer ? <div className="bg-white">{footer}</div> : null}
      </div>
    </section>
  );
}
