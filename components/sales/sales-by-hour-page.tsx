"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, RefreshCw } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { cn } from "@/lib/utils";
import {
  DATE_FILTER_OPTIONS,
  type SalesDatePreset,
} from "@/components/sales/sales-feed-filters";
import {
  salesHair,
  salesInk,
  salesMute,
  salesPaper,
  salesSurface,
  SalesHeroMetric,
  SalesMetricTile,
  SalesPeriodChip,
  SalesStage,
  salesToolBtnClass,
} from "@/components/sales/sales-surface";
import { formatDateRangeLabel, presetRange } from "@/lib/analytics-date-range";
import {
  fetchSalesByHour,
  type SalesByHourResponse,
  type SalesHourRow,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { formatSalePaymentDisplay } from "@/lib/sale-payment-filter";

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function fmtKes(n: number | string | null | undefined): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(toNum(n));
}

function hourLabel(hour: number): string {
  const start = String(hour).padStart(2, "0");
  const end = String((hour + 1) % 24).padStart(2, "0");
  return `${start}:00 – ${end}:00`;
}

function formatStamp(
  iso: string,
  timeZone: string,
  withDate: boolean,
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  if (withDate) {
    return d.toLocaleString("en-KE", {
      timeZone,
      weekday: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return d.toLocaleTimeString("en-KE", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function SalesByHourPage() {
  const { me, branchId, itemTypeId, headerScopeReady } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.SalesIntelligenceRead);

  const [datePreset, setDatePreset] = useState<SalesDatePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<SalesByHourResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openHour, setOpenHour] = useState<number | null>(null);

  const dateRange = useMemo(() => {
    if (datePreset === "custom") {
      if (!customFrom || !customTo) return null;
      return { from: customFrom, to: customTo };
    }
    return presetRange(datePreset);
  }, [datePreset, customFrom, customTo]);

  const periodLabel = useMemo(() => {
    if (!dateRange) return datePreset === "custom" ? "Choose a start and end date." : "";
    return formatDateRangeLabel(dateRange.from, dateRange.to);
  }, [dateRange, datePreset]);

  const spansDays = dateRange != null && dateRange.from !== dateRange.to;

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!allowed || !headerScopeReady) return;
      const silent = opts?.silent ?? false;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);
      if (!dateRange) {
        setData(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      try {
        const next = await fetchSalesByHour(
          dateRange.from,
          dateRange.to,
          branchId.trim() || undefined,
          itemTypeId.trim() || undefined,
        );
        setData(next);
        const busiest = next.hours.reduce<SalesHourRow | null>((best, row) => {
          if (row.saleCount <= 0) return best;
          if (!best || row.saleCount > best.saleCount) return row;
          return best;
        }, null);
        setOpenHour(busiest?.hour ?? next.hours[0]?.hour ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load hourly sales.");
        if (!silent) setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [allowed, branchId, dateRange, headerScopeReady, itemTypeId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const maxCount = useMemo(
    () => Math.max(1, ...(data?.hours.map((row) => row.saleCount) ?? [1])),
    [data],
  );

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Sales by the hour"
        description="You do not have permission to view this report."
        backHref={APP_ROUTES.sales}
        backLabel="Sales"
      />
    );
  }

  const timeZone = data?.timezone || "Africa/Nairobi";
  const saleCountLabel =
    loading && !data ? "—" : (data?.saleCount ?? 0).toLocaleString("en-KE");
  const takenLabel = loading && !data ? "—" : fmtKes(data?.revenue);

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, salesPaper)}>
      <DashboardPageHero
        icon={Clock}
        title="By the hour"
        description={periodLabel || "How many sales landed in each hour."}
        showActiveScope
      >
        <Link href={APP_ROUTES.sales} className={salesToolBtnClass()}>
          Sales
        </Link>
        <button
          type="button"
          className={salesToolBtnClass()}
          onClick={() => void load({ silent: true })}
          disabled={loading}
        >
          <RefreshCw
            className={cn("size-3.5", refreshing && "animate-spin")}
            aria-hidden
          />
          Refresh
        </button>
      </DashboardPageHero>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <div className={cn(salesSurface, "px-3 py-2.5 sm:px-3.5")}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <span className={cn("shrink-0 text-[11px] font-semibold", salesMute)}>
            When
          </span>
          <div
            role="group"
            aria-label="Period"
            className="flex flex-wrap items-center gap-1.5"
          >
            {DATE_FILTER_OPTIONS.map(({ id, label }) => (
              <SalesPeriodChip
                key={id}
                active={datePreset === id}
                onClick={() => setDatePreset(id)}
              >
                {label}
              </SalesPeriodChip>
            ))}
          </div>
          {datePreset === "custom" ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className={cn(dashboardInputClass(), "h-9 py-1 text-sm")}
                aria-label="From"
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className={cn(dashboardInputClass(), "h-9 py-1 text-sm")}
                aria-label="To"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className={cn(salesSurface, "overflow-hidden")}>
        <div
          className={cn(
            "grid sm:grid-cols-[minmax(0,1fr)_auto]",
            salesHair,
            "border-b",
          )}
        >
          <SalesHeroMetric
            label="Completed sales"
            value={saleCountLabel}
            hint={periodLabel || undefined}
          />
          <SalesMetricTile
            label="Taken"
            value={takenLabel}
            className={cn(
              "border-t sm:border-l sm:border-t-0",
              salesHair,
              "sm:min-w-[11rem]",
            )}
          />
        </div>
      </div>

      <SalesStage title="Hour by hour" hint="Tap an hour to see receipts." bodyClassName="p-0">
          {loading && !data ? (
            <p className={cn(dashboardHintClass(), "px-3.5 py-8")}>
              Loading the day…
            </p>
          ) : !data || data.hours.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3.5 py-8")}>
              No completed sales in this period.
            </p>
          ) : (
            <ol>
              {data.hours.map((row) => {
                const open = openHour === row.hour;
                const width = Math.max(
                  row.saleCount > 0 ? 4 : 0,
                  (row.saleCount / maxCount) * 100,
                );
                return (
                  <li
                    key={row.hour}
                    className={cn("border-b last:border-b-0", salesHair)}
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenHour(open ? null : row.hour)}
                      className="grid w-full grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]"
                    >
                      <span
                        className={cn(
                          "font-mono text-[12px] font-medium tabular-nums",
                          salesInk,
                        )}
                      >
                        {hourLabel(row.hour)}
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2 rounded-sm bg-[var(--pos-primary,#0f766e)]"
                          style={{
                            width: `${width}%`,
                            opacity: row.saleCount > 0 ? 1 : 0.15,
                          }}
                          aria-hidden
                        />
                      </span>
                      <span className="text-right">
                        <span
                          className={cn(
                            "block font-mono text-[12px] font-medium tabular-nums",
                            salesInk,
                          )}
                        >
                          {row.saleCount.toLocaleString("en-KE")}
                          <span className={cn("ml-1 text-[10px] font-normal", salesMute)}>
                            {row.saleCount === 1 ? "sale" : "sales"}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "block font-mono text-[11px] tabular-nums",
                            salesMute,
                          )}
                        >
                          {fmtKes(row.revenue)}
                        </span>
                      </span>
                    </button>
                    {open ? (
                      <ul
                        className={cn(
                          "border-t border-dashed px-3.5 py-2",
                          salesHair,
                          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)]",
                        )}
                      >
                        {row.sales.length === 0 ? (
                          <li className={cn("py-2 text-[12px]", salesMute)}>
                            Nothing sold in this hour.
                          </li>
                        ) : (
                          row.sales.map((sale) => (
                            <li
                              key={sale.saleId}
                              className={cn(
                                "grid items-baseline gap-x-3 py-1.5",
                                spansDays
                                  ? "grid-cols-[8.75rem_minmax(0,1fr)_auto]"
                                  : "grid-cols-[3.75rem_minmax(0,1fr)_auto]",
                              )}
                            >
                              <time
                                dateTime={sale.soldAt}
                                className={cn(
                                  "font-mono text-[12px] tabular-nums",
                                  salesInk,
                                )}
                              >
                                {formatStamp(sale.soldAt, timeZone, spansDays)}
                              </time>
                              <span className={cn("min-w-0 truncate text-[12px]", salesMute)}>
                                <span className={cn("font-medium", salesInk)}>
                                  {sale.receiptNo != null ? `#${sale.receiptNo}` : "Receipt"}
                                </span>
                                {sale.cashierName?.trim() ? (
                                  <span> · {sale.cashierName.trim()}</span>
                                ) : null}
                                <span>
                                  {" "}
                                  · {formatSalePaymentDisplay(sale.paymentMethod)}
                                </span>
                              </span>
                              <span
                                className={cn(
                                  "font-mono text-[12px] font-medium tabular-nums",
                                  salesInk,
                                )}
                              >
                                {fmtKes(sale.total)}
                              </span>
                            </li>
                          ))
                        )}
                        {row.omitted > 0 ? (
                          <li className={cn("py-1.5 text-[11px]", salesMute)}>
                            {row.omitted.toLocaleString("en-KE")} more{" "}
                            {row.omitted === 1 ? "sale" : "sales"} in this hour.
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
      </SalesStage>
    </div>
  );
}
