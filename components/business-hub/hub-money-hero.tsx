"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import type { HubKpi, HubKpiAction } from "@/components/business-hub/hub-kpi";
import { RevenueBarChart } from "@/components/business-hub/revenue-bar-chart";
import { HUB_BTN, HUB_SURFACE } from "@/lib/business-hub/constants";
import { chartWindowStats } from "@/lib/business-hub/pulse-insights";
import type { DailyRevenuePoint } from "@/lib/business-hub/build-daily-revenue-series";
import { useFormatMoney } from "@/hooks/use-format-money";
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
    <div className="min-w-0 lg:rounded-2xl lg:bg-white lg:px-4 lg:py-3.5 lg:ring-1 lg:ring-black/[0.05]">
      <p className="truncate text-[12px] text-[#667085]">{item.label}</p>
      <p
        className="mt-1 truncate text-[17px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[#101828] lg:text-[20px]"
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
 * The shop's money, top of the board. On phones the headline, the payment mix,
 * the three supporting numbers, and the profit actions read as separate blocks;
 * from `lg` the payment mix folds into the headline card and the numbers become
 * their own cards with the actions stacked beside them.
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
  const { formatMoneyCompact } = useFormatMoney();
  const hero = items[0];
  const supporting = items.slice(1);
  const actions: HubKpiAction[] = items.flatMap((item) => item.actions ?? []);
  const stats = chartWindowStats(chartPoints);
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

  const windowStats = [
    { label: "Window", value: formatMoneyCompact(stats.total) },
    { label: "Daily avg", value: formatMoneyCompact(stats.average) },
    { label: "Best day", value: stats.best?.label ?? "—" },
    { label: "Active days", value: String(stats.activeDays) },
  ];

  const paymentBlock =
    tender && tenderValues ? (
      <div>
        <div className="lg:flex lg:items-center lg:gap-4">
          <h3 className="shrink-0 text-[14px] font-semibold tracking-[-0.01em] text-[#101828]">
            How you got paid
          </h3>
          <div className="mt-3 flex h-2.5 w-full gap-[3px] lg:mt-0 lg:min-w-0 lg:flex-1">
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
        </div>
        <dl className="mt-3 flex flex-col gap-2.5 lg:mt-2.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-7 lg:gap-y-1.5">
          {TENDERS.map((lane) => {
            const value = tenderValues[lane.id];
            const share =
              tenderTotal > 0 ? Math.round((value / tenderTotal) * 100) : 0;
            return (
              <div
                key={lane.id}
                className="flex items-center justify-between gap-3 lg:justify-start"
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
      </div>
    ) : null;

  return (
    <>
      <section className={cn(HUB_SURFACE, "px-4 pb-4 pt-4 sm:px-5 sm:pb-5")}>
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

        <div className="mt-2 lg:flex lg:items-end lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <p className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-medium text-[#98a2b3]">
                {currencyPrefix}
              </span>
              <span
                className="truncate text-[32px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[#101828] lg:text-[40px]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {amount}
              </span>
            </p>
            {hero.hint ? (
              <p className="mt-1 text-[12px] text-[#667085]">{hero.hint}</p>
            ) : null}
          </div>
          {chartPoints.length > 0 ? (
            <dl className="hidden shrink-0 gap-6 lg:flex">
              {windowStats.map((stat) => (
                <div key={stat.label} className="min-w-0">
                  <dt className="text-[11px] text-[#98a2b3]">{stat.label}</dt>
                  <dd className="mt-1 text-[13px] font-semibold tabular-nums text-[#101828]">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        <div className="mt-3">
          <RevenueBarChart points={chartPoints} ariaLabel={chartAriaLabel} />
        </div>

        {paymentBlock ? (
          <div className="mt-4 hidden border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,transparent)] pt-4 lg:block">
            {paymentBlock}
          </div>
        ) : null}
      </section>

      {paymentBlock ? (
        <section className={cn(HUB_SURFACE, "p-4 lg:hidden")}>
          {paymentBlock}
        </section>
      ) : null}

      {supporting.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_13rem] lg:items-start">
          {supporting.map((item) => (
            <HeroStat key={item.id} item={item} />
          ))}
          {actions.length > 0 ? (
            <div className="col-span-3 grid grid-cols-2 gap-3 lg:col-span-1 lg:grid-cols-1 lg:gap-2">
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
        </div>
      ) : null}
    </>
  );
}
