"use client";

import { ChartColumn } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  DASHBOARD_MAX,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_SURFACE,
  DashboardAccessDenied,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  fetchKitchenTimesReport,
  fetchMenuSalesReport,
  type KitchenTimesReport,
  type MenuSalesReport,
} from "@/lib/restaurant-api";
import { cn } from "@/lib/utils";

const kes = (n: number) => formatMoney(n, "KES");
const HEAD =
  "border-b text-[11px] font-semibold text-[color-mix(in_srgb,var(--order-ink,#121A16)_60%,transparent)]";

/** How a dish compares with the others that have a recipe: does it sell, and does a plate earn. */
const ENGINEERING: Record<"STAR" | "PLOWHORSE" | "PUZZLE" | "DOG", string> = {
  STAR: "Sells well, earns well",
  PLOWHORSE: "Sells well, earns little",
  PUZZLE: "Earns well, sells little",
  DOG: "Sells little, earns little",
};

/** Today's date in Nairobi, as the server counts days. */
function nairobiToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
}

function minutes(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, "0")} s`;
}

const SHEET_TITLE = "font-serif text-[1.45rem] italic leading-none tracking-[-0.02em] text-[var(--op-ink,#121A16)]";
const RULE = "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]";

export default function RestaurantReportsPage() {
  const { me, branchId } = useDashboard();
  const allowed =
    hasPermission(me?.permissions, Permission.RestaurantMenuManage) ||
    hasPermission(me?.permissions, Permission.SalesIntelligenceRead);
  const [from, setFrom] = useState(nairobiToday);
  const [to, setTo] = useState(nairobiToday);
  const [sales, setSales] = useState<MenuSalesReport | null>(null);
  const [times, setTimes] = useState<KitchenTimesReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!allowed || !branchId || !from || !to) return;
    setError(null);
    setSales(null);
    try {
      const [s, t] = await Promise.all([
        fetchMenuSalesReport(branchId, from, to),
        fetchKitchenTimesReport(branchId, from, to),
      ]);
      setSales(s);
      setTimes(t);
    } catch {
      setError("Could not load the report. Check the dates (at most 92 days) and your connection.");
    }
  }, [allowed, branchId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Menu sales"
        description="You need permission to manage the menu or to read sales reports."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero icon={ChartColumn} title="Menu sales" description="What sold from the menu and how long the kitchen took." />

      <div className={`${DASHBOARD_SECTION_SURFACE} flex flex-wrap items-end gap-3`}>
        <label className="grid gap-1">
          <span className={dashboardLabelClass()}>From</span>
          <input type="date" className={dashboardInputClass(false)} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className={dashboardLabelClass()}>To</span>
          <input type="date" className={dashboardInputClass(false)} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
        <p className={dashboardHintClass()}>Days are counted in Nairobi time, midnight to midnight.</p>
      </div>

      {!branchId ? (
        <p className={`mt-2 ${DASHBOARD_SECTION_SURFACE}`}>Choose a branch at the top of the page.</p>
      ) : error ? (
        <DashboardLoadError title="Menu sales" message={error} onRetry={() => void load()} />
      ) : sales == null ? (
        <DashboardLoading label="Loading the report…" />
      ) : (
        <div className={cn(DASHBOARD_TABLE_SURFACE, "mt-2 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-12")}>
          {/* What sold: the long list gets the wide column. */}
          <section aria-label="What sold" className="min-w-0 lg:col-span-8">
            <header className="p-4 pb-3 sm:p-5 sm:pb-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className={SHEET_TITLE}>What sold</h2>
                <span className="font-mono text-[12px] tabular-nums text-[color-mix(in_srgb,var(--op-ink,#121A16)_60%,transparent)]">
                  {sales.items.length === 1 ? "1 dish" : `${sales.items.length} dishes`}
                </span>
              </div>
              <span aria-hidden className="mt-2.5 block h-px w-7 bg-[#1D4B3B]" />
            </header>
            {sales.items.length === 0 ? (
              <p className={cn("px-4 pb-5 sm:px-5", dashboardHintClass())}>No dishes were sold in this period.</p>
            ) : (
              <div className={cn("border-t", RULE)}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className={HEAD}>
                        <th className="px-3 py-2">Dish</th>
                        <th className="px-3 py-2 text-right">Sold</th>
                        <th className="px-3 py-2 text-right">Takings</th>
                        <th className="px-3 py-2 text-right">Share</th>
                        {sales.costTracked ? (
                          <>
                            <th className="px-3 py-2 text-right">Ingredients</th>
                            <th className="px-3 py-2 text-right">Left over</th>
                            <th className="px-3 py-2">How it does</th>
                          </>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {sales.items.map((row, i) => (
                        <tr key={row.menuItemId ?? `row-${i}`} className="border-b last:border-b-0">
                          <td className="px-3 py-2 font-medium">{row.name ?? "Removed dish"}</td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">{row.quantity}</td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">{kes(row.revenue)}</td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">{row.sharePercent}%</td>
                          {sales.costTracked ? (
                            <>
                              <td className="px-3 py-2 text-right font-mono tabular-nums">
                                {row.cost == null
                                  ? "No recipe"
                                  : `${kes(row.cost)}${row.costPercent != null ? ` (${row.costPercent}%)` : ""}`}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums">
                                {row.margin == null ? "—" : kes(row.margin)}
                              </td>
                              <td className="px-3 py-2">{row.engineering ? ENGINEERING[row.engineering] : "—"}</td>
                            </>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* The summary beside it: what came in, what people chose, how the kitchen kept up. */}
          <aside
            className={cn(
              "grid content-start border-t bg-[var(--kiosk-panel,#EFEBE2)] lg:col-span-4 lg:border-l lg:border-t-0",
              RULE,
            )}
          >
            <section aria-label="Takings" className="p-4 sm:p-5">
              <h2 className={SHEET_TITLE}>Takings</h2>
              <span aria-hidden className="mt-2.5 block h-px w-7 bg-[#1D4B3B]" />
              <p className="mt-3 font-mono text-[2rem] font-semibold leading-none tabular-nums">{kes(sales.totalRevenue)}</p>
              {sales.costTracked ? (
                <dl className="mt-3 grid gap-1.5 font-mono text-[13px]">
                  <div className="flex items-baseline gap-2">
                    <dt className="font-sans text-sm">Ingredients used</dt>
                    <span aria-hidden className="mb-[0.28em] min-w-3 flex-1 border-b border-dotted border-[color-mix(in_srgb,var(--op-ink,#121A16)_35%,transparent)]" />
                    <dd className="tabular-nums">{kes(sales.totalCost)}</dd>
                  </div>
                  {sales.totalRevenue > 0 ? (
                    <div className="flex items-baseline gap-2">
                      <dt className="font-sans text-sm">Of takings</dt>
                      <span aria-hidden className="mb-[0.28em] min-w-3 flex-1 border-b border-dotted border-[color-mix(in_srgb,var(--op-ink,#121A16)_35%,transparent)]" />
                      <dd className="tabular-nums">{((sales.totalCost / sales.totalRevenue) * 100).toFixed(1)}%</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
              <p className={cn("mt-3", dashboardHintClass())}>
                Voided sales are left out. Shelf products rung from the menu are in your ordinary sales reports.
                {sales.costTracked
                  ? " A dish shows a cost only if it has a recipe; one without counts as costing nothing here and in other profit reports. A recipe counts from the day it is added: plates sold before that cost nothing here, so a dish's cost looks low for any period that starts before its recipe did."
                  : " No dish has a recipe yet, so there is no cost or profit figure here — and other reports that show profit count a dish as costing nothing. Add recipes under Menu."}
              </p>
            </section>

            <section aria-label="What people chose" className={cn("border-t p-4 sm:p-5", RULE)}>
              <h2 className={SHEET_TITLE}>What people chose</h2>
              <span aria-hidden className="mt-2.5 block h-px w-7 bg-[#1D4B3B]" />
              {sales.modifiers.length === 0 ? (
                <p className={cn("mt-3", dashboardHintClass())}>No choices were picked on a dish in this period.</p>
              ) : (
                <ul className="mt-3 grid gap-2.5">
                  {sales.modifiers.map((row) => (
                    <li key={`${row.group}/${row.option}`}>
                      <div className="flex items-baseline gap-2">
                        <span className="min-w-0 text-sm font-medium">{row.option}</span>
                        <span aria-hidden className="mb-[0.28em] min-w-3 flex-1 border-b border-dotted border-[color-mix(in_srgb,var(--op-ink,#121A16)_35%,transparent)]" />
                        <span className="shrink-0 font-mono text-[13px] tabular-nums">× {row.timesChosen}</span>
                      </div>
                      <p className={dashboardHintClass()}>
                        {row.group}
                        {row.extraRevenue > 0 ? ` · ${kes(row.extraRevenue)} extra` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-label="Kitchen time" className={cn("border-t p-4 sm:p-5", RULE)}>
              <h2 className={SHEET_TITLE}>Kitchen time</h2>
              <span aria-hidden className="mt-2.5 block h-px w-7 bg-[#1D4B3B]" />
              <p className={cn("mt-2", dashboardHintClass())}>From reaching the kitchen to ready.</p>
              {times == null || times.stations.length === 0 ? (
                <p className={cn("mt-3", dashboardHintClass())}>No tickets were marked ready in this period.</p>
              ) : (
                <ul className="mt-3 grid gap-3">
                  {times.stations.map((s) => (
                    <li key={s.stationId ?? "kitchen"}>
                      <div className="flex items-baseline gap-2">
                        <span className="min-w-0 text-sm font-medium">{s.stationName}</span>
                        <span aria-hidden className="mb-[0.28em] min-w-3 flex-1 border-b border-dotted border-[color-mix(in_srgb,var(--op-ink,#121A16)_35%,transparent)]" />
                        <span className="shrink-0 font-mono text-[13px] tabular-nums">usually {minutes(s.medianSeconds)}</span>
                      </div>
                      <p className={dashboardHintClass()}>
                        {s.tickets === 1 ? "1 ticket" : `${s.tickets} tickets`} · slowest {minutes(s.slowestSeconds)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
