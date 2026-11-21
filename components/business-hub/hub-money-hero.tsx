"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import type { HubKpi, HubKpiAction } from "@/components/business-hub/hub-kpi";
import { RevenueBarChart } from "@/components/business-hub/revenue-bar-chart";
import { HUB_BTN } from "@/lib/business-hub/constants";
import { chartWindowStats } from "@/lib/business-hub/pulse-insights";
import type { DailyRevenuePoint } from "@/lib/business-hub/build-daily-revenue-series";
import { useFormatMoney } from "@/hooks/use-format-money";
import { cn } from "@/lib/utils";

const TENDERS = [
  { id: "mpesa", label: "M-Pesa", bar: "bg-[#5FD6A0]" },
  { id: "cash", label: "Cash", bar: "bg-[#D9E4DF]" },
  { id: "credit", label: "Credit", bar: "bg-[#F0B45B]" },
] as const;

type TenderTotal = { amount: number; count: number };

export type HeroTender = {
  cash: TenderTotal;
  mpesa: TenderTotal;
  credit: TenderTotal;
  format: (value: number) => string;
};

function trendDirection(trend?: string | null): "up" | "down" | null {
  if (!trend) return null;
  return trend.startsWith("-") || trend.startsWith("<-") ? "down" : "up";
}

function HeroStat({ item, divided }: { item: HubKpi; divided?: boolean }) {
  const direction = trendDirection(item.trend);
  return (
    <div
      className={cn(
        "flex min-w-0 items-baseline justify-between gap-3 px-3 py-2",
        "sm:flex-col sm:items-stretch sm:justify-center sm:gap-0.5 sm:px-3.5 sm:py-2.5",
        divided &&
          "border-t border-[var(--hub-rule,#E7E3D8)] sm:border-t-0 sm:border-l",
      )}
    >
      <div className="flex min-w-0 flex-col sm:contents">
        <p className="truncate text-[12px] text-[var(--hub-muted,#5E6B65)] sm:order-1">
          {item.label}
        </p>
        {item.hint || direction ? (
          <p className="hidden truncate text-[12px] text-[var(--hub-muted,#5E6B65)] sm:order-3 sm:block">
            {direction ? (
              <span
                className={cn(
                  "font-semibold",
                  direction === "down" ? "text-[#B3261E]" : "text-[#0B6B43]",
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
      <p
        className="shrink-0 text-right text-[15px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[var(--hub-ink,#14211C)] [overflow-wrap:anywhere] sm:order-2 sm:text-left sm:text-[20px]"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {item.value}
      </p>
    </div>
  );
}

/**
 * The shop's money, top of the board. The headline and payment mix share one
 * forest panel. The supporting numbers sit in a single hairline strip, with
 * the profit actions in the last cell from `lg`.
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

  // The formatter joins currency and amount with a non-breaking space, so split
  // on any whitespace — a plain " " split left the prefix holding the whole
  // value and printed "Ksh 715" twice.
  const [currencyPrefix, ...amountParts] = hero.value.split(/\s+/);
  const amount = amountParts.join(" ") || currencyPrefix;

  const tenderValues = tender
    ? { cash: tender.cash, mpesa: tender.mpesa, credit: tender.credit }
    : null;
  const tenderTotal = tenderValues
    ? tenderValues.cash.amount +
      tenderValues.mpesa.amount +
      tenderValues.credit.amount
    : 0;

  const windowStats = [
    { label: "Window", value: formatMoneyCompact(stats.total) },
    { label: "Daily avg", value: formatMoneyCompact(stats.average) },
    { label: "Best day", value: stats.best?.label ?? "—" },
    { label: "Active days", value: String(stats.activeDays) },
  ];

  const paymentBlock =
    tender && tenderValues ? (
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-x-4 lg:gap-y-1.5">
          <h3 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.07em] text-[rgba(244,242,236,0.72)]">
            How you got paid
          </h3>
          <dl className="m-0 flex flex-col gap-1.5 text-[12px] tabular-nums lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4 lg:gap-y-1">
            {TENDERS.map((lane) => {
              const { amount, count } = tenderValues[lane.id];
              const share =
                tenderTotal > 0 ? Math.round((amount / tenderTotal) * 100) : 0;
              return (
                <div
                  key={lane.id}
                  className="flex items-center justify-between gap-2 lg:justify-start"
                >
                  <dt className="flex min-w-0 items-center gap-1.5 text-[#F4F2EC]">
                    <span
                      className={cn("size-2 shrink-0 rounded-[2px]", lane.bar)}
                      aria-hidden
                    />
                    <span className="truncate">{lane.label}</span>
                  </dt>
                  <dd className="flex shrink-0 items-baseline gap-1.5">
                    <b className="font-semibold text-[#F4F2EC]">
                      {tender.format(amount)}
                    </b>
                    <span className="text-[rgba(244,242,236,0.6)]">
                      {count} · {share}%
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
        <div
          className="flex h-2.5 w-full gap-[3px]"
          role="img"
          aria-label="Payment mix"
        >
          {tenderTotal > 0
            ? TENDERS.map((lane, index) => {
                const { amount } = tenderValues[lane.id];
                if (amount <= 0) return null;
                const isFirst = index === 0;
                const isLast = index === TENDERS.length - 1;
                return (
                  <span
                    key={lane.id}
                    className={cn(
                      "h-full min-w-0",
                      lane.bar,
                      isFirst
                        ? "rounded-l-[7px] rounded-r-[3px]"
                        : isLast
                          ? "rounded-l-[3px] rounded-r-[7px]"
                          : "rounded-[3px]",
                    )}
                    style={{ flex: `${amount} 1 0` }}
                    aria-hidden
                  />
                );
              })
            : null}
        </div>
      </div>
    ) : null;

  return (
    <>
      <section className="flex flex-col gap-2.5 rounded-[2px] bg-[var(--hub-accent-deep,#0D3B2E)] px-4 py-3 text-[#F4F2EC]">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[rgba(244,242,236,0.72)]">
                {hero.label} · {periodLabel}
              </p>
              {direction ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-[#FFD3A3]">
                  <TrendIcon className="size-3" aria-hidden />
                  {hero.trend}
                </span>
              ) : null}
            </div>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0 tabular-nums">
              <span className="text-[13px] font-medium uppercase tracking-[0.02em] text-[rgba(244,242,236,0.6)]">
                {currencyPrefix}
              </span>
              <span
                className="break-words text-[32px] font-semibold leading-none tracking-[-0.03em] text-[#F4F2EC] sm:text-[40px]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {amount}
              </span>
            </p>
          </div>
          {chartPoints.length > 0 ? (
            <dl className="m-0 flex flex-wrap gap-x-5 gap-y-1.5">
              {windowStats.map((stat) => (
                <div key={stat.label} className="min-w-0">
                  <dt className="text-[11px] text-[rgba(244,242,236,0.72)]">
                    {stat.label}
                  </dt>
                  <dd className="text-[14px] font-semibold tabular-nums text-[#F4F2EC]">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        <RevenueBarChart points={chartPoints} ariaLabel={chartAriaLabel} />

        {paymentBlock ? (
          <div className="border-t border-white/[0.14] pt-2.5">{paymentBlock}</div>
        ) : null}
      </section>

      {supporting.length > 0 ? (
        <div className="overflow-hidden rounded-[2px] border border-[var(--hub-rule,#E7E3D8)] bg-[var(--hub-paper,#FFFFFF)] sm:grid sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_11rem]">
          {supporting.map((item, index) => (
            <HeroStat key={item.id} item={item} divided={index > 0} />
          ))}
          {actions.length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5 border-t border-[var(--hub-rule,#E7E3D8)] p-2 sm:col-span-3 lg:col-span-1 lg:grid-cols-1 lg:border-l lg:border-t-0">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={cn(
                    HUB_BTN,
                    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[2px] px-3 text-[12.5px] font-semibold transition-colors",
                    action.emphasize
                      ? "bg-[var(--hub-accent,#0F4A38)] text-white hover:bg-[var(--hub-accent-deep,#0D3B2E)]"
                      : "bg-[#E3EEE8] text-[var(--hub-accent,#0F4A38)] hover:bg-[#D7E7DF]",
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
