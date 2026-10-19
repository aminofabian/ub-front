"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { formatSupplyMoney } from "../../_components/supplies-shared";
import type { SpendRankItem } from "../_lib/spend-periods";

export function RankedSpendList({
  items,
  total,
  currency,
  empty,
  countLabel,
  shareOf,
  limit = 8,
  showOpen = false,
}: {
  items: SpendRankItem[];
  total: number;
  currency: string;
  empty: ReactNode;
  countLabel: string;
  shareOf: string;
  limit?: number;
  showOpen?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="flex min-h-36 items-center justify-center border border-dashed border-[var(--op-rule)] px-4 text-center text-[12px] leading-relaxed text-[var(--op-muted)]">
        {empty}
      </p>
    );
  }

  const visible = items.slice(0, limit);
  const max = Math.max(...visible.map((item) => item.value), 1);

  return (
    <ol className="space-y-3">
      {visible.map((item, index) => {
        const share = total > 0 ? (item.value / total) * 100 : 0;
        const width = Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0);
        return (
          <li key={item.id} className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-[12px] font-medium tracking-[-0.01em] text-[var(--op-ink)]">
                <span className="mr-1.5 tabular-nums text-[var(--op-faint)]">
                  {index + 1}.
                </span>
                {item.label}
              </span>
              <span className="shrink-0 text-[12px] font-semibold tabular-nums tracking-[-0.01em] text-[var(--op-ink)]">
                {formatSupplyMoney(item.value, currency)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden bg-[var(--op-rule-soft)]">
              <div
                className={cn(
                  "h-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
                  index === 0
                    ? "bg-[var(--op-accent)]"
                    : "bg-[color-mix(in_srgb,var(--op-accent)_32%,var(--op-surface))]",
                )}
                style={{ width: `${width}%` }}
              />
            </div>
            <p className="mt-1 text-[10.5px] leading-tight text-[var(--op-muted)]">
              {item.count.toLocaleString("en-KE")}{" "}
              {item.count === 1 ? countLabel.replace(/s$/, "") : countLabel}
              {total > 0 ? ` · ${share.toFixed(1)}% of ${shareOf}` : ""}
              {showOpen && item.open > 0.009 ? (
                <span className="text-[var(--op-highlight)]">
                  {" "}
                  · {formatSupplyMoney(item.open, currency)} open
                </span>
              ) : null}
            </p>
          </li>
        );
      })}
      {items.length > limit ? (
        <li className="border-t border-[var(--op-rule-soft)] pt-2 text-[10.5px] text-[var(--op-faint)]">
          + {items.length - limit} more · {formatSupplyMoney(
            items.slice(limit).reduce((sum, item) => sum + item.value, 0),
            currency,
          )}
        </li>
      ) : null}
    </ol>
  );
}
