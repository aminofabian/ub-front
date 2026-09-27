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
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { cn } from "@/lib/utils";
import {
  DATE_FILTER_OPTIONS,
  type SalesDatePreset,
} from "@/components/sales/sales-feed-filters";
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

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

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

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-1.5")}>
      <DashboardPageHero
        icon={Clock}
        title="By the hour"
        description={periodLabel || "How many sales landed in each hour."}
        showActiveScope
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-none shadow-none"
          asChild
        >
          <Link href={APP_ROUTES.sales}>Sales</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-none shadow-none"
          onClick={() => void load({ silent: true })}
          disabled={loading}
        >
          <RefreshCw
            className={cn("size-3.5", refreshing && "animate-spin")}
            aria-hidden
          />
          Refresh
        </Button>
      </DashboardPageHero>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <div className={cn("border bg-white px-2.5 py-1.5", HAIRLINE)}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="shrink-0 text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground/80">
            When
          </span>
          <div
            role="group"
            aria-label="Period"
            className="inline-flex flex-wrap items-center gap-0.5 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-0.5"
          >
            {DATE_FILTER_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setDatePreset(id)}
                className={cn(
                  "rounded-none px-2 py-1 text-[11px] font-semibold",
                  datePreset === id
                    ? "bg-[var(--pos-primary,#0f766e)] text-white"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {datePreset === "custom" ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className={cn(dashboardInputClass(), "h-8 py-1 text-sm")}
                aria-label="From"
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className={cn(dashboardInputClass(), "h-8 py-1 text-sm")}
                aria-label="To"
              />
            </div>
          ) : null}
        </div>
      </div>

      <section className={cn("border bg-white", HAIRLINE)}>
        <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-3.5 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Completed sales
            </p>
            <p
              className="mt-1 text-[1.65rem] font-semibold leading-none tabular-nums tracking-[-0.04em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {loading && !data ? "—" : (data?.saleCount ?? 0).toLocaleString("en-KE")}
            </p>
          </div>
          <p className="text-right">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Taken
            </span>
            <span className="mt-1 block text-[15px] font-semibold tabular-nums">
              {loading && !data ? "—" : fmtKes(data?.revenue)}
            </span>
          </p>
        </header>

        {loading && !data ? (
          <p className={cn(dashboardHintClass(), "px-3.5 py-8")}>Loading the day…</p>
        ) : !data || data.hours.length === 0 ? (
          <p className={cn(dashboardHintClass(), "px-3.5 py-8")}>
            No completed sales in this period.
          </p>
        ) : (
          <ol>
            {data.hours.map((row) => {
              const open = openHour === row.hour;
              const width = Math.max(row.saleCount > 0 ? 4 : 0, (row.saleCount / maxCount) * 100);
              return (
                <li
                  key={row.hour}
                  className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] last:border-b-0"
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenHour(open ? null : row.hour)}
                    className="grid w-full grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 text-left hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]"
                  >
                    <span className="font-mono text-[12px] font-medium tabular-nums text-[#141414]">
                      {hourLabel(row.hour)}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2 bg-[var(--pos-primary,#0f766e)]"
                        style={{ width: `${width}%`, opacity: row.saleCount > 0 ? 1 : 0.15 }}
                        aria-hidden
                      />
                    </span>
                    <span className="text-right">
                      <span className="block font-mono text-[12px] font-medium tabular-nums text-[#141414]">
                        {row.saleCount.toLocaleString("en-KE")}
                        <span className="ml-1 text-[10px] font-normal text-[#8A8A8A]">
                          {row.saleCount === 1 ? "sale" : "sales"}
                        </span>
                      </span>
                      <span className="block font-mono text-[11px] tabular-nums text-[#3A3A3A]">
                        {fmtKes(row.revenue)}
                      </span>
                    </span>
                  </button>
                  {open ? (
                    <ul className="border-t border-dashed border-[color-mix(in_srgb,#141414_8%,transparent)] bg-[#FBFCFB] px-3.5 py-2">
                      {row.sales.length === 0 ? (
                        <li className="py-2 text-[12px] text-[#8A8A8A]">
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
                              className="font-mono text-[12px] tabular-nums text-[#141414]"
                            >
                              {formatStamp(sale.soldAt, timeZone, spansDays)}
                            </time>
                            <span className="min-w-0 truncate text-[12px] text-[#3A3A3A]">
                              <span className="font-medium text-[#141414]">
                                {sale.receiptNo != null ? `#${sale.receiptNo}` : "Receipt"}
                              </span>
                              {sale.cashierName?.trim() ? (
                                <span className="text-[#8A8A8A]">
                                  {" "}
                                  · {sale.cashierName.trim()}
                                </span>
                              ) : null}
                              <span className="text-[#8A8A8A]">
                                {" "}
                                · {formatSalePaymentDisplay(sale.paymentMethod)}
                              </span>
                            </span>
                            <span className="font-mono text-[12px] font-medium tabular-nums text-[#141414]">
                              {fmtKes(sale.total)}
                            </span>
                          </li>
                        ))
                      )}
                      {row.omitted > 0 ? (
                        <li className="py-1.5 text-[11px] text-[#8A8A8A]">
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
      </section>
    </div>
  );
}
