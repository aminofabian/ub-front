"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

import { formatSupplyMoney } from "../../_components/supplies-shared";
import type { SpendDelta } from "../_lib/spend-periods";

export type SpendPeriodCardData = {
  id: "today" | "week" | "month" | "year";
  label: string;
  rangeLabel: string;
  total: number;
  count: number;
  open: number;
  delta: SpendDelta;
  comparison: string;
};

function DeltaMark({ delta }: { delta: SpendDelta }) {
  if (delta.direction === "up") {
    return <ArrowUpRight className="size-3" aria-hidden />;
  }
  if (delta.direction === "down") {
    return <ArrowDownRight className="size-3" aria-hidden />;
  }
  return <Minus className="size-3" aria-hidden />;
}

function deltaText(delta: SpendDelta): string {
  if (delta.percent == null) {
    return delta.isNew ? "First spend" : "No spend";
  }
  const abs = Math.abs(delta.percent);
  return `${abs >= 999 ? "999+" : abs.toFixed(1)}%`;
}

export function SpendPeriodStrip({
  cards,
  active,
  onSelect,
  currency,
}: {
  cards: SpendPeriodCardData[];
  active: SpendPeriodCardData["id"];
  onSelect: (id: SpendPeriodCardData["id"]) => void;
  currency: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-px bg-[var(--op-rule)] ring-1 ring-[var(--op-rule)] lg:grid-cols-4">
      {cards.map((card) => {
        const selected = card.id === active;
        return (
          <button
            key={card.id}
            type="button"
            aria-pressed={selected}
            aria-label={`${card.label}, ${formatSupplyMoney(card.total, currency)}, ${card.count} ${
              card.count === 1 ? "bill" : "bills"
            }`}
            onClick={() => onSelect(card.id)}
            className={cn(
              "relative flex min-h-[8.25rem] flex-col justify-between px-3.5 py-3 text-left transition-colors duration-150",
              "focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--op-accent)]",
              selected
                ? "bg-[color-mix(in_srgb,var(--op-accent)_6%,var(--op-surface))]"
                : "bg-[var(--op-surface)] hover:bg-[color-mix(in_srgb,var(--op-accent)_3%,var(--op-surface))]",
            )}
          >
            <div>
              <p className="text-[11px] font-semibold tracking-[-0.01em] text-[var(--op-ink)]">
                {card.label}
              </p>
              <p className="mt-0.5 text-[10px] tabular-nums text-[var(--op-faint)]">
                {card.rangeLabel}
              </p>
            </div>

            <p
              className="mt-2 truncate text-[1.3rem] font-semibold tabular-nums leading-none tracking-[-0.03em] text-[var(--op-ink)] sm:text-[1.45rem]"
              title={formatSupplyMoney(card.total, currency)}
            >
              {formatSupplyMoney(card.total, currency)}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[10.5px] text-[var(--op-muted)]">
              <span className="inline-flex items-center gap-0.5 tabular-nums">
                <DeltaMark delta={card.delta} />
                {deltaText(card.delta)}
              </span>
              <span className="text-[var(--op-faint)]">
                vs {card.comparison}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10.5px] text-[var(--op-muted)]">
              <span>
                {card.count} {card.count === 1 ? "bill" : "bills"}
              </span>
              {card.open > 0.009 ? (
                <>
                  <span aria-hidden className="text-[var(--op-faint)]">
                    ·
                  </span>
                  <span className="tabular-nums text-[var(--op-highlight)]">
                    {formatSupplyMoney(card.open, currency)} open
                  </span>
                </>
              ) : card.count > 0 ? (
                <>
                  <span aria-hidden className="text-[var(--op-faint)]">
                    ·
                  </span>
                  <span>all paid</span>
                </>
              ) : null}
            </div>

            <span
              aria-hidden
              className={cn(
                "absolute inset-x-0 bottom-0 h-[2px]",
                selected ? "bg-[var(--op-accent)]" : "bg-transparent",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
