"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  DashboardPageHero,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { MarkPaidDialog } from "@/components/credits/mark-paid-dialog";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSessionBranch } from "@/hooks/use-session-scope";
import {
  fetchOutstandingTabs,
  fetchPaymentLedger,
  type OutstandingTabRowRecord,
  type PaymentLedgerRow,
} from "@/lib/api";
import {
  formatDateRangeLabel,
  presetRange,
  type DatePreset,
} from "@/lib/analytics-date-range";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

type CreditPeriod = Extract<
  DatePreset,
  "today" | "yesterday" | "last3" | "last7" | "last30" | "thisMonth"
>;

const PERIOD_OPTIONS: { id: CreditPeriod; label: string; hint: string }[] = [
  { id: "today", label: "Today", hint: "Live" },
  { id: "yesterday", label: "Yesterday", hint: "Full day" },
  { id: "last3", label: "3 days", hint: "Incl. today" },
  { id: "last7", label: "1 week", hint: "7 days" },
  { id: "last30", label: "30 days", hint: "Month-ish" },
  { id: "thisMonth", label: "Month", hint: "Calendar" },
];

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

function fmtKes(n: number): string {
  return n.toLocaleString("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-KE", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDayTime(iso: string, singleDay: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  if (singleDay) return fmtTime(iso);
  return d.toLocaleString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isCreditMethod(method: string): boolean {
  return method.trim().toLowerCase() === "customer_credit";
}

type CustomerRank = {
  name: string;
  total: number;
  tabs: number;
  lastAt: string;
};

function rankCustomers(rows: PaymentLedgerRow[]): CustomerRank[] {
  const map = new Map<string, CustomerRank>();
  for (const row of rows) {
    const name = row.customerName?.trim() || "Walk-in / unnamed";
    const key = name.toLowerCase();
    const amount = toNum(row.amount);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        name,
        total: amount,
        tabs: 1,
        lastAt: row.soldAt,
      });
      continue;
    }
    existing.total += amount;
    existing.tabs += 1;
    if (new Date(row.soldAt).getTime() > new Date(existing.lastAt).getTime()) {
      existing.lastAt = row.soldAt;
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** 24 hour buckets of credit totals for a sparkline feel. */
function hourBuckets(rows: PaymentLedgerRow[]): number[] {
  const buckets = Array.from({ length: 24 }, () => 0);
  for (const row of rows) {
    const d = new Date(row.soldAt);
    if (Number.isNaN(d.getTime())) continue;
    buckets[d.getHours()] += toNum(row.amount);
  }
  return buckets;
}

export function CreditActivityPage() {
  const {
    loading: sessionLoading,
    canViewSalesIntelligence,
    canViewCustomers,
    canReviewPaymentClaims,
  } = useDashboard();
  const { branchId } = useSessionBranch();
  const [period, setPeriod] = useState<CreditPeriod>("today");
  const [rows, setRows] = useState<PaymentLedgerRow[]>([]);
  const [openTabs, setOpenTabs] = useState<OutstandingTabRowRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [tabsLoading, setTabsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [payTarget, setPayTarget] = useState<OutstandingTabRowRecord | null>(
    null,
  );

  const dateRange = useMemo(() => presetRange(period)!, [period]);
  const singleDay = dateRange.from === dateRange.to;
  const periodLabel = useMemo(
    () => formatDateRangeLabel(dateRange.from, dateRange.to),
    [dateRange],
  );

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!canViewSalesIntelligence) return;
      const silent = opts?.silent ?? false;
      if (!silent) setListLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const ledger = await fetchPaymentLedger(
          dateRange.from,
          dateRange.to,
          branchId.trim() || undefined,
        );
        setRows(
          (Array.isArray(ledger) ? ledger : []).filter((r) =>
            isCreditMethod(r.method),
          ),
        );
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to load credit sales.",
        );
        if (!silent) setRows([]);
      } finally {
        setListLoading(false);
        setRefreshing(false);
      }
    },
    [branchId, canViewSalesIntelligence, dateRange.from, dateRange.to],
  );

  const loadOpenTabs = useCallback(async () => {
    if (!canViewCustomers) {
      setOpenTabs([]);
      return;
    }
    setTabsLoading(true);
    try {
      setOpenTabs(await fetchOutstandingTabs());
    } catch {
      setOpenTabs([]);
    } finally {
      setTabsLoading(false);
    }
  }, [canViewCustomers]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadOpenTabs();
  }, [loadOpenTabs]);

  const refreshAll = useCallback(async () => {
    await Promise.all([load({ silent: true }), loadOpenTabs()]);
  }, [load, loadOpenTabs]);

  const openTabsTotal = useMemo(
    () => openTabs.reduce((sum, row) => sum + toNum(row.balanceOwed), 0),
    [openTabs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = (r.customerName ?? "").toLowerCase();
      const cashier = (r.cashierName ?? "").toLowerCase();
      const receipt = r.receiptNo != null ? String(r.receiptNo) : "";
      return name.includes(q) || cashier.includes(q) || receipt.includes(q);
    });
  }, [rows, search]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime(),
      ),
    [filtered],
  );

  const totalCredit = useMemo(
    () => filtered.reduce((sum, r) => sum + toNum(r.amount), 0),
    [filtered],
  );
  const tabCount = filtered.length;
  const ranked = useMemo(() => rankCustomers(filtered), [filtered]);
  const peopleCount = ranked.length;
  const avgTab = tabCount > 0 ? totalCredit / tabCount : 0;
  const hours = useMemo(() => hourBuckets(filtered), [filtered]);
  const maxHour = useMemo(() => Math.max(1, ...hours), [hours]);
  const peakHour = useMemo(() => {
    let best = 0;
    for (let i = 1; i < hours.length; i++) {
      if (hours[i]! > hours[best]!) best = i;
    }
    if (hours[best]! <= 0) return null;
    const label = new Date(2000, 0, 1, best).toLocaleTimeString("en-KE", {
      hour: "numeric",
    });
    return { hour: best, label, amount: hours[best]! };
  }, [hours]);

  if (sessionLoading) {
    return <DashboardLoading label="Loading session…" />;
  }

  if (!canViewSalesIntelligence) {
    return (
      <DashboardAccessDenied
        title="On tab"
        description="Credit sales need sales intelligence access. Ask an admin if you should see this board."
        backHref={
          canViewCustomers ? APP_ROUTES.customers : APP_ROUTES.overview
        }
        backLabel={canViewCustomers ? "Credit customers" : "Overview"}
      />
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "space-y-5 pb-16")}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <DashboardPageHero
          compact
          icon={CreditCard}
          eyebrow="Credit & tabs"
          title="On tab"
          description="Credit sales for the period — and clear open tabs."
        />
        <div className="flex flex-wrap items-center gap-2">
          {canViewCustomers ? (
            <Button asChild size="sm" variant="outline">
              <Link href={APP_ROUTES.customers}>
                <Users className="size-3.5" aria-hidden />
                Directory
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={listLoading || refreshing || tabsLoading}
            onClick={() => void refreshAll()}
          >
            {refreshing || tabsLoading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-3.5" aria-hidden />
            )}
            Refresh
          </Button>
        </div>
      </header>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {feedback ? (
        <DashboardFeedback kind="success" text={feedback} />
      ) : null}

      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Credit period"
      >
        {PERIOD_OPTIONS.map(({ id, label, hint }) => {
          const active = period === id;
          return (
            <button
              key={id}
              type="button"
              title={hint}
              onClick={() => setPeriod(id)}
              className={cn(
                "inline-flex flex-col items-start rounded-lg px-3 py-1.5 text-left transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="text-xs font-semibold leading-none">{label}</span>
              <span
                className={cn(
                  "mt-0.5 text-[10px] leading-none",
                  active ? "text-background/70" : "text-muted-foreground/80",
                )}
              >
                {hint}
              </span>
            </button>
          );
        })}
        <span className="ml-1 text-[11px] text-muted-foreground sm:ml-2">
          {periodLabel}
        </span>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#1c1917] px-5 py-6 text-[#fafaf9] shadow-sm sm:px-7 sm:py-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #fbbf24 0%, transparent 45%), radial-gradient(circle at 80% 0%, #34d399 0%, transparent 40%)",
          }}
          aria-hidden
        />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
            Put on tab
          </p>
          <p className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">
            {listLoading ? "…" : fmtKes(totalCredit)}
          </p>
          <p className="mt-2 max-w-xl text-sm text-stone-300">
            {listLoading
              ? "Loading credit tenders…"
              : tabCount === 0
                ? "Nothing put on credit in this period."
                : `${tabCount} tab${tabCount === 1 ? "" : "s"} · ${peopleCount} ${peopleCount === 1 ? "person" : "people"} · avg ${fmtKes(avgTab)}`}
          </p>

          {singleDay && tabCount > 0 ? (
            <div className="mt-5">
              <div
                className="flex h-10 items-end gap-0.5"
                role="img"
                aria-label="Credit by hour of day"
              >
                {hours.map((value, hour) => (
                  <div
                    key={hour}
                    className="flex-1 rounded-sm bg-amber-400/80 transition-[height]"
                    style={{
                      height: `${Math.max(8, (value / maxHour) * 100)}%`,
                      opacity: value > 0 ? 0.35 + (value / maxHour) * 0.65 : 0.12,
                    }}
                    title={`${hour}:00 — ${fmtKes(value)}`}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-stone-500">
                <span>12a</span>
                <span>6a</span>
                <span>12p</span>
                <span>6p</span>
                <span>11p</span>
              </div>
              {peakHour ? (
                <p className="mt-2 text-xs text-amber-200/90">
                  Peak around {peakHour.label} · {fmtKes(peakHour.amount)}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {canViewCustomers ? (
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 bg-muted/25 px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Open tabs
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {tabsLoading
                  ? "Loading balances…"
                  : openTabs.length === 0
                    ? "No outstanding balances"
                    : `${openTabs.length} open · ${fmtKes(openTabsTotal)} owed`}
              </p>
            </div>
            {!canReviewPaymentClaims ? (
              <p className="text-[11px] text-muted-foreground">
                Need claims review permission to mark paid.
              </p>
            ) : null}
          </div>
          {tabsLoading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading open tabs…
            </div>
          ) : openTabs.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Everyone is settled — no open tab balances.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {openTabs.map((tab) => {
                const owed = toNum(tab.balanceOwed);
                return (
                  <li
                    key={tab.customerId}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`${APP_ROUTES.customers}/${encodeURIComponent(tab.customerId)}`}
                        className="truncate text-sm font-medium text-primary hover:underline"
                      >
                        {tab.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {tab.primaryPhone?.trim() || "No phone"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                      {fmtKes(owed)}
                    </p>
                    {canReviewPaymentClaims ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => {
                          setFeedback(null);
                          setPayTarget(tab);
                        }}
                      >
                        Mark paid
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/25 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                className={cn(dashboardInputClass(), "pl-9")}
                placeholder="Find name, till, or receipt…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search credit sales"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {listLoading ? "Loading…" : `${sorted.length} sale${sorted.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {listLoading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading credit sales…
            </div>
          ) : sorted.length === 0 ? (
            <p className="px-5 py-14 text-center text-sm text-muted-foreground">
              {search.trim()
                ? "No credit sales match that search."
                : `No credit sales for ${periodLabel.toLowerCase()}.`}
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {sorted.map((row) => {
                const amount = toNum(row.amount);
                const name = row.customerName?.trim() || "Walk-in / unnamed";
                return (
                  <li
                    key={row.paymentId || `${row.saleId}-${row.sortOrder}`}
                    className="flex items-start gap-3 px-4 py-3 sm:px-5"
                  >
                    <div className="w-16 shrink-0 pt-0.5 text-right sm:w-24">
                      <p className="text-xs font-medium tabular-nums text-foreground">
                        {fmtDayTime(row.soldAt, singleDay)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {row.cashierName?.trim() || "Till"}
                        {row.receiptNo != null
                          ? ` · #${row.receiptNo}`
                          : null}
                        {toNum(row.saleGrandTotal) > amount
                          ? ` · sale ${fmtKes(toNum(row.saleGrandTotal))}`
                          : null}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                      {fmtKes(amount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="border-b border-border/60 bg-muted/25 px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-foreground">
                Who charged
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Ranked by credit in this period
              </p>
            </div>
            {listLoading ? (
              <p className="px-4 py-10 text-center text-xs text-muted-foreground">
                …
              </p>
            ) : ranked.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-muted-foreground">
                No names yet.
              </p>
            ) : (
              <ol className="divide-y divide-border/50">
                {ranked.slice(0, 12).map((person, index) => (
                  <li
                    key={person.name}
                    className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
                  >
                    <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {person.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {person.tabs} tab{person.tabs === 1 ? "" : "s"}
                        {singleDay
                          ? ` · last ${fmtTime(person.lastAt)}`
                          : null}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {fmtKes(person.total)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-4 sm:px-5">
            <p className="text-sm font-medium text-foreground">
              Clearing debt
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Use <span className="font-medium text-foreground">Mark paid</span>{" "}
              on an open tab above for cash or M-Pesa — full or partial. Till
              proposals still land under Payment claims.
            </p>
            {canReviewPaymentClaims ? (
              <Link
                href={APP_ROUTES.creditsPaymentClaims}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Review pending claims
                <ArrowRight className="size-3" aria-hidden />
              </Link>
            ) : null}
            <Link
              href={APP_ROUTES.paymentsDayLedger}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              Full day payment ledger
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </section>
        </aside>
      </div>

      <MarkPaidDialog
        open={payTarget != null}
        onOpenChange={(open) => {
          if (!open) setPayTarget(null);
        }}
        customer={payTarget}
        onPaid={(customerId, balanceOwed) => {
          setOpenTabs((prev) => {
            if (balanceOwed <= 0.001) {
              return prev.filter((row) => row.customerId !== customerId);
            }
            return prev.map((row) =>
              row.customerId === customerId
                ? { ...row, balanceOwed }
                : row,
            );
          });
          setFeedback(
            balanceOwed <= 0.001
              ? "Tab cleared — marked as paid in full."
              : `Partial payment recorded. ${fmtKes(balanceOwed)} still owed.`,
          );
        }}
      />
    </div>
  );
}
