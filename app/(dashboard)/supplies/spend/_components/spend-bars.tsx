"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

import { formatSupplyMoney } from "../../_components/supplies-shared";
import type { SpendBarPoint } from "../_lib/spend-periods";

function compactAxis(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${Math.round(value / 1_000)}k`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.round(value));
}

export function SpendBars({
  points,
  currency,
  label,
  emptyLabel = "No bills in this window yet.",
}: {
  points: SpendBarPoint[];
  currency: string;
  label: string;
  emptyLabel?: string;
}) {
  const max = useMemo(
    () => Math.max(...points.map((point) => point.value), 0),
    [points],
  );
  const axisMax = max > 0 ? max : 1;
  const total = useMemo(
    () => points.reduce((sum, point) => sum + point.value, 0),
    [points],
  );
  const hasSpend = max > 0;
  const labelStep = points.length > 20 ? 5 : points.length > 12 ? 2 : 1;

  if (!hasSpend) {
    return (
      <div className="flex min-h-44 flex-col items-center justify-center border border-dashed border-[var(--op-rule)] px-4 text-center">
        <p className="max-w-[32ch] text-[12px] leading-relaxed text-[var(--op-muted)]">
          {emptyLabel}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2.5">
        <div
          aria-hidden
          className="flex h-44 w-10 shrink-0 flex-col justify-between pb-0 text-right text-[10px] tabular-nums leading-none text-[var(--op-faint)]"
        >
          <span>{compactAxis(axisMax)}</span>
          <span>{compactAxis(axisMax / 2)}</span>
          <span>0</span>
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="relative h-44"
            role="img"
            aria-label={`${label}. ${formatSupplyMoney(total, currency)} in total.`}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex flex-col justify-between"
            >
              <span className="block border-t border-[var(--op-rule-soft)]" />
              <span className="block border-t border-[var(--op-rule-soft)]" />
              <span className="block border-t border-[var(--op-rule)]" />
            </div>
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {points.map((point) => {
                const height =
                  point.value > 0
                    ? Math.max((point.value / axisMax) * 100, 1.5)
                    : 0;
                return (
                  <div
                    key={point.key}
                    className="group flex h-full min-w-0 flex-1 items-end"
                    title={`${point.label}: ${formatSupplyMoney(point.value, currency)}`}
                  >
                    <div
                      className={cn(
                        "w-full transition-[height] duration-300 ease-out motion-reduce:transition-none",
                        point.future
                          ? "bg-[color-mix(in_srgb,var(--op-ink)_8%,var(--op-surface))]"
                          : point.current
                            ? "bg-[var(--op-accent)]"
                            : "bg-[color-mix(in_srgb,var(--op-accent)_32%,var(--op-surface))] group-hover:bg-[color-mix(in_srgb,var(--op-accent)_48%,var(--op-surface))]",
                      )}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-1.5 flex gap-[2px]">
            {points.map((point, index) => {
              const show =
                point.current ||
                index % labelStep === 0 ||
                index === points.length - 1;
              return (
                <span
                  key={point.key}
                  className={cn(
                    "min-w-0 flex-1 truncate text-center text-[9px] leading-none tabular-nums",
                    point.current
                      ? "font-semibold text-[var(--op-accent)]"
                      : "text-[var(--op-faint)]",
                  )}
                >
                  {show ? point.label : ""}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <ul className="sr-only">
        {points.map((point) => (
          <li key={point.key}>
            {point.label}: {formatSupplyMoney(point.value, currency)}
          </li>
        ))}
      </ul>
    </div>
  );
}
