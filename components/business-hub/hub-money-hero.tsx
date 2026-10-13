"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import type { HubKpi, HubKpiAction } from "@/components/business-hub/hub-kpi";
import { RevenueBarChart } from "@/components/business-hub/revenue-bar-chart";
import { HUB_BTN, HUB_SURFACE } from "@/lib/business-hub/constants";
import type { DailyRevenuePoint } from "@/lib/business-hub/build-daily-revenue-series";
import { cn } from "@/lib/utils";

const TENDERS = [
  { id: "mpesa", label: "M-Pesa", bar: "bg-[#0e9f6e]" },
  { id: "cash", label: "Cash", bar: "bg-[#2a3136]" },
  { id: "credit", label: "Credit", bar: "bg-[#e0a43c]" },
] as const;

export type HeroTender = {
  cash: number;
  mpesa: number;
  credit: number;
  format: (value: number) => string;
};

function trendDirection(trend?: string | null): "up" | "down" | null {
  if (!trend) return null;
  return trend.startsWith("-") || trend.startsWith("<-") ? "down" : "up";
}

function HeroStat({ item }: { item: HubKpi }) {
  const direction = trendDirection(item.trend);
  return (
    <div className="min-w-0">
      <p className="truncate text-[12px] text-[#667085]">{item.label}</p>
      <p
        className="mt-1 truncate text-[17px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[#101828]"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {item.value}
      </p>
      {item.hint || direction ? (
        <p className="mt-1 truncate text-[11px] text-[#98a2b3]">
          {direction ? (
            <span
              className={cn(
                "font-semibold",
                direction === "down" ? "text-[#c0392b]" : "text-[#0e9f6e]",
              )}
            >
              {item.trend}
              {item.hint ? " " : ""}
            </span>
          ) : null}
          {item.hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The shop's money, top of the board: the revenue headline with its shape, how
 * that money arrived, the three supporting numbers, then the profit actions.
 * Rendered as a fragment so the page's stack gap spaces each card.
 */
export function HubMoneyHero({
  items,
  periodLabel,
  chartPoints,
  chartAriaLabel,
  tender,
}: {
  /** [0] is the headline (revenue); the rest form the supporting row. */
  items: HubKpi[];
  periodLabel: string;
  chartPoints: DailyRevenuePoint[];
  chartAriaLabel: string;
  tender?: HeroTender | null;
}) {
  const hero = items[0];
  const supporting = items.slice(1);
  const actions: HubKpiAction[] = items.flatMap((item) => item.actions ?? []);
  if (!hero) return null;

  const direction = trendDirection(hero.trend);
  const TrendIcon = direction === "down" ? ArrowDownRight : ArrowUpRight;

  const [currencyPrefix, ...amountParts] = hero.value.split(" ");
  const amount = amountParts.join(" ") || currencyPrefix;

  const tenderValues = tender
    ? { cash: tender.cash, mpesa: tender.mpesa, credit: tender.credit }
    : null;
  const tenderTotal = tenderValues
    ? tenderValues.cash + tenderValues.mpesa + tenderValues.credit
    : 0;

  return (
    <>
      <section className={cn(HUB_SURFACE, "px-4 pb-4 pt-4")}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#667085]">
            {hero.label} · {periodLabel}
          </p>
          {direction ? (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                direction === "down"
                  ? "bg-[#fdecec] text-[#b4342f]"
                  : "bg-[#e6f4ec] text-[#047857]",
              )}
            >
              <TrendIcon className="size-3" aria-hidden />
              {hero.trend}
            </span>
          ) : null}
        </div>

        <p className="mt-2 flex items-baseline gap-1.5">
          <span className="text-[15px] font-medium text-[#98a2b3]">
            {currencyPrefix}
          </span>
          <span
            className="truncate text-[32px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[#101828]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {amount}
          </span>
        </p>
        {hero.hint ? (
          <p className="mt-1 text-[12px] text-[#667085]">{hero.hint}</p>
        ) : null}

        <div className="mt-3">
          <RevenueBarChart points={chartPoints} ariaLabel={chartAriaLabel} />
        </div>
      </section>

      {tender && tenderValues ? (
        <section className={cn(HUB_SURFACE, "p-4")}>
          <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-[#101828]">
            How you got paid
          </h3>
          <div className="mt-3 flex h-2.5 w-full gap-[3px] overflow-hidden">
            {tenderTotal > 0
              ? TENDERS.map((lane) => {
                  const share = (tenderValues[lane.id] / tenderTotal) * 100;
                  if (share <= 0) return null;
                  return (
                    <span
                      key={lane.id}
                      className={cn("h-full rounded-full", lane.bar)}
                      style={{ width: `${share}%` }}
                      aria-hidden
                    />
                  );
                })
              : null}
          </div>
          <dl className="mt-3 flex flex-col gap-2.5">
            {TENDERS.map((lane) => {
              const value = tenderValues[lane.id];
              const share =
                tenderTotal > 0 ? Math.round((value / tenderTotal) * 100) : 0;
              return (
                <div
                  key={lane.id}
                  className="flex items-center justify-between gap-3"
                >
                  <dt className="flex min-w-0 items-center gap-2 text-[13px] text-[#344054]">
                    <span
                      className={cn("size-2 shrink-0 rounded-full", lane.bar)}
                      aria-hidden
                    />
                    <span className="truncate">{lane.label}</span>
                  </dt>
                  <dd className="flex shrink-0 items-baseline gap-2 text-[13px] tabular-nums">
                    <span className="font-semibold text-[#101828]">
                      {tender.format(value)}
                    </span>
                    <span className="w-8 text-right text-[12px] text-[#98a2b3]">
                      {share}%
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ) : null}

      {supporting.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 px-1 pt-1">
          {supporting.map((item) => (
            <HeroStat key={item.id} item={item} />
          ))}
        </div>
      ) : null}

      {actions.length > 0 ? (
        <div
          className={cn(
            "grid gap-2.5 pt-0.5",
            actions.length === 1 ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={cn(
                HUB_BTN,
                "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-colors",
                action.emphasize
                  ? "bg-[#0f766e] text-white hover:bg-[#0d6b63]"
                  : "bg-[#e6f4f0] text-[#0f766e] hover:bg-[#d9ede7]",
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
