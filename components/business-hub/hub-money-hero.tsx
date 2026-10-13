"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import type { HubKpi, HubKpiAction } from "@/components/business-hub/hub-kpi";
import { RevenueBarChart } from "@/components/business-hub/revenue-bar-chart";
import { HUB_BTN, HUB_SURFACE } from "@/lib/business-hub/constants";
import type { DailyRevenuePoint } from "@/lib/business-hub/build-daily-revenue-series";
import { cn } from "@/lib/utils";

const DIVIDE = "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]";
const RULE = "border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]";

const DOTS: Record<HubKpi["tint"] & string, string> = {
  teal: "bg-[#0f766e]",
  emerald: "bg-[#047857]",
  violet: "bg-[#5B4DBE]",
  amber: "bg-[#B45309]",
};

const TENDERS = [
  { id: "cash", label: "Cash", bar: "bg-[#0f766e]" },
  { id: "mpesa", label: "M-Pesa", bar: "bg-[#34A853]" },
  { id: "credit", label: "Credit", bar: "bg-[#D9A441]" },
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
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            DOTS[item.tint ?? "teal"] ?? DOTS.teal,
          )}
          aria-hidden
        />
        <span className="truncate text-[11px] font-medium text-[#6F6F6F]">
          {item.label}
        </span>
      </span>
      <span className="mt-1 flex items-baseline gap-1">
        <span
          className="truncate text-[15px] font-semibold leading-none tracking-[-0.02em] text-[#141414] tabular-nums"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {item.value}
        </span>
        {direction ? (
          <span
            className={cn(
              "shrink-0 text-[10px] font-semibold tabular-nums",
              direction === "down" ? "text-[#B4342F]" : "text-[#047857]",
            )}
          >
            {item.trend}
          </span>
        ) : null}
      </span>
      {item.hint ? (
        <span className="mt-1 block truncate text-[10px] text-[#8A8A8A]">
          {item.hint}
        </span>
      ) : null}
    </>
  );

  const cell = cn(
    "flex min-h-14 min-w-0 flex-col justify-center bg-white px-2.5 py-2",
    HUB_BTN,
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={cn(
          cell,
          "transition-colors hover:bg-[color-mix(in_srgb,#0f766e_3%,white)] active:bg-[color-mix(in_srgb,#0f766e_6%,white)]",
        )}
      >
        {body}
      </Link>
    );
  }

  return <div className={cell}>{body}</div>;
}

/**
 * The shop's money at a glance, as one layered surface: the headline revenue
 * (with its trend and shape), where that money arrived from, then the three
 * supporting numbers underneath — divided by hairlines instead of floating as
 * separate cards. Replaces the old KPI grid + standalone revenue block.
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

  const tenderValues = tender
    ? { cash: tender.cash, mpesa: tender.mpesa, credit: tender.credit }
    : null;
  const tenderTotal = tenderValues
    ? tenderValues.cash + tenderValues.mpesa + tenderValues.credit
    : 0;

  const head = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0f766e]">
          <span className="size-1.5 shrink-0 bg-[#0f766e]" aria-hidden />
          <span className="truncate">
            {hero.label}
            <span className="text-[#9AA5A2]"> · {periodLabel}</span>
          </span>
        </p>
        {direction ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
              direction === "down"
                ? "bg-[#FDECEC] text-[#B4342F]"
                : "bg-[#E6F4EC] text-[#047857]",
            )}
          >
            <TrendIcon className="size-3" aria-hidden />
            {hero.trend}
          </span>
        ) : null}
      </div>
      <p
        className="mt-1.5 truncate text-[30px] font-semibold leading-none tracking-[-0.035em] text-[#141414] tabular-nums"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {hero.value}
      </p>
      {hero.hint ? (
        <p className="mt-1 text-[11px] text-[#8A8A8A]">{hero.hint}</p>
      ) : null}
    </>
  );

  return (
    <section className={cn(HUB_SURFACE, "flex flex-col")}>
      {hero.href ? (
        <Link
          href={hero.href}
          className={cn(
            "block px-3 pb-2 pt-3 transition-colors",
            "hover:bg-[color-mix(in_srgb,#0f766e_3%,white)]",
            HUB_BTN,
          )}
        >
          {head}
        </Link>
      ) : (
        <div className="px-3 pb-2 pt-3">{head}</div>
      )}

      <div className="px-1.5 pb-2.5">
        <RevenueBarChart
          dense
          bare
          points={chartPoints}
          ariaLabel={chartAriaLabel}
        />
      </div>

      {tender && tenderValues ? (
        <div className={cn("border-t px-3 py-2.5", RULE)}>
          <div className="flex h-1.5 w-full gap-px overflow-hidden bg-[#F1F3F2]">
            {tenderTotal > 0
              ? TENDERS.map((lane) => {
                  const share = (tenderValues[lane.id] / tenderTotal) * 100;
                  if (share <= 0) return null;
                  return (
                    <span
                      key={lane.id}
                      className={cn("h-full", lane.bar)}
                      style={{ width: `${share}%` }}
                      aria-hidden
                    />
                  );
                })
              : null}
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[#6F6F6F]">
            <span className="font-medium text-[#8A8A8A]">How you got paid</span>
            {TENDERS.map((lane) => (
              <span
                key={lane.id}
                className="inline-flex items-center gap-1 tabular-nums"
              >
                <span className={cn("size-1.5", lane.bar)} aria-hidden />
                {lane.label}
                <span className="font-semibold text-[#141414]">
                  {tender.format(tenderValues[lane.id])}
                </span>
              </span>
            ))}
          </p>
        </div>
      ) : null}

      {supporting.length > 0 ? (
        <div className={cn("grid grid-cols-3 gap-px border-t", RULE, DIVIDE)}>
          {supporting.map((item) => (
            <HeroStat key={item.id} item={item} />
          ))}
        </div>
      ) : null}

      {actions.length > 0 ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-end gap-1.5 border-t px-3 py-2",
            RULE,
          )}
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={cn(
                HUB_BTN,
                "inline-flex min-h-8 items-center px-2.5 text-[11px] font-semibold transition-colors",
                action.emphasize
                  ? "bg-[#FDECEC] text-[#B4342F] hover:bg-[#FBDDDD]"
                  : "bg-[#F1F3F2] text-[#4A4A4A] hover:bg-[#E6EAE9]",
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
