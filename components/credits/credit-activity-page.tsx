"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Ban,
  CreditCard,
  IdCard,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { CustomerPhoneFlag } from "@/components/credits/customer-phone-flag";
import { MarkPaidDialog } from "@/components/credits/mark-paid-dialog";
import { RemindPaymentButtons } from "@/components/credits/remind-payment-buttons";
import { LoyaltyCardPreview } from "@/components/credits/loyalty-card-preview";
import { isUsableStoredCustomerPhone } from "@/lib/customer-phone";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useSessionBranch } from "@/hooks/use-session-scope";
import {
  fetchCreditsActivitySummary,
  fetchCustomerCreditStatement,
  fetchOutstandingTabs,
  fetchPaymentLedger,
  patchCustomer,
  type CreditsActivitySummaryRecord,
  type CreditStatementLineRecord,
  type CreditStatementRecord,
  type OutstandingTabRowRecord,
  type PaymentLedgerRow,
} from "@/lib/api";
import type { LoyaltyCardCustomerInput } from "@/lib/loyalty-card";
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
  { id: "last3", label: "3 days", hint: "Including today" },
  { id: "last7", label: "1 week", hint: "7 days" },
  { id: "last30", label: "30 days", hint: "Rolling month" },
  { id: "thisMonth", label: "Month", hint: "Calendar month" },
];

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-KE", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDayTime(iso: string, singleDay: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
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

function nameKey(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase() || "walk-in / unnamed";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
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
    const key = nameKey(name);
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

function hourBuckets(rows: PaymentLedgerRow[]): number[] {
  const buckets = Array.from({ length: 24 }, () => 0);
  for (const row of rows) {
    const d = new Date(row.soldAt);
    if (Number.isNaN(d.getTime())) continue;
    buckets[d.getHours()] += toNum(row.amount);
  }
  return buckets;
}

function LedgerSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border/40" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="size-8 shrink-0 animate-pulse rounded-md bg-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div
              className="h-3 max-w-[11rem] animate-pulse rounded-sm bg-muted"
              style={{ width: `${56 + (i % 4) * 10}%` }}
            />
            <div className="h-2.5 w-24 animate-pulse rounded-sm bg-muted/70" />
          </div>
          <div className="h-3 w-14 shrink-0 animate-pulse rounded-sm bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function CreditActivityPage() {
  const {
    loading: sessionLoading,
    canViewSalesIntelligence,
    canViewCustomers,
    canManageCustomers,
    canReviewPaymentClaims,
    canManageCreditSettings,
  } = useDashboard();
  const { formatMoneyCompact: fmtKes } = useFormatMoney();
  const { branchId } = useSessionBranch();
  const [period, setPeriod] = useState<CreditPeriod>("today");
  const [rows, setRows] = useState<PaymentLedgerRow[]>([]);
  const [openTabs, setOpenTabs] = useState<OutstandingTabRowRecord[]>([]);
  const [summary, setSummary] = useState<CreditsActivitySummaryRecord | null>(
    null,
  );
  const [listLoading, setListLoading] = useState(false);
  const [tabsLoading, setTabsLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    text: string;
    kind: "success" | "error";
  } | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<OutstandingTabRowRecord | null>(
    null,
  );
  const [cardCustomer, setCardCustomer] =
    useState<LoyaltyCardCustomerInput | null>(null);

  const canRemind = canManageCreditSettings || canReviewPaymentClaims;
  const busy = listLoading || refreshing || tabsLoading || summaryLoading;

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

  const loadSummary = useCallback(async () => {
    if (!canViewSalesIntelligence && !canViewCustomers) {
      setSummary(null);
      return;
    }
    setSummaryLoading(true);
    try {
      setSummary(
        await fetchCreditsActivitySummary(dateRange.from, dateRange.to),
      );
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [
    canViewCustomers,
    canViewSalesIntelligence,
    dateRange.from,
    dateRange.to,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadOpenTabs();
  }, [loadOpenTabs]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      load({ silent: true }),
      loadOpenTabs(),
      loadSummary(),
    ]);
  }, [load, loadOpenTabs, loadSummary]);

  const totalPaid = toNum(summary?.totalPaid);
  const paymentCount = summary?.paymentCount ?? 0;
  const totalOwed = useMemo(() => {
    if (summary != null) return toNum(summary.totalOwed);
    return openTabs.reduce((sum, row) => sum + toNum(row.balanceOwed), 0);
  }, [summary, openTabs]);
  const openTabCount = summary?.openTabCount ?? openTabs.length;

  const query = search.trim().toLowerCase();

  const filteredCharges = useMemo(() => {
    if (!query) return rows;
    return rows.filter((r) => {
      const name = (r.customerName ?? "").toLowerCase();
      const cashier = (r.cashierName ?? "").toLowerCase();
      const receipt = r.receiptNo != null ? String(r.receiptNo) : "";
      return name.includes(query) || cashier.includes(query) || receipt.includes(query);
    });
  }, [rows, query]);

  const sortedCharges = useMemo(
    () =>
      [...filteredCharges].sort(
        (a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime(),
      ),
    [filteredCharges],
  );

  const sortedTabs = useMemo(
    () =>
      [...openTabs].sort(
        (a, b) => toNum(b.balanceOwed) - toNum(a.balanceOwed),
      ),
    [openTabs],
  );

  const filteredTabs = useMemo(() => {
    if (!query) return sortedTabs;
    return sortedTabs.filter((tab) => {
      const name = tab.name.toLowerCase();
      const phone = (tab.primaryPhone ?? "").toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
  }, [sortedTabs, query]);

  useEffect(() => {
    if (!canViewCustomers) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev && openTabs.some((tab) => tab.customerId === prev)) return prev;
      return openTabs[0]?.customerId ?? null;
    });
  }, [openTabs, canViewCustomers]);

  const selectedTab = useMemo(
    () => openTabs.find((tab) => tab.customerId === selectedId) ?? null,
    [openTabs, selectedId],
  );

  const totalCredit = useMemo(
    () => filteredCharges.reduce((sum, r) => sum + toNum(r.amount), 0),
    [filteredCharges],
  );
  const tabCount = filteredCharges.length;
  const ranked = useMemo(() => rankCustomers(filteredCharges), [filteredCharges]);
  const peopleCount = ranked.length;
  const avgTab = tabCount > 0 ? totalCredit / tabCount : 0;
  const hours = useMemo(() => hourBuckets(filteredCharges), [filteredCharges]);
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

  const phoneIssues = useMemo(
    () =>
      openTabs.filter(
        (tab) => !isUsableStoredCustomerPhone(tab.primaryPhone),
      ).length,
    [openTabs],
  );

  const selectedCharges = useMemo(() => {
    if (!selectedTab) return [];
    const key = nameKey(selectedTab.name);
    return sortedCharges.filter((row) => nameKey(row.customerName) === key);
  }, [selectedTab, sortedCharges]);

  const selectTabByName = useCallback(
    (name: string) => {
      const key = nameKey(name);
      const match = openTabs.find((tab) => nameKey(tab.name) === key);
      if (match) setSelectedId(match.customerId);
    },
    [openTabs],
  );

  if (sessionLoading) {
    return (
      <div className={cn(DASHBOARD_MAX_WIDE, "space-y-6 pb-16")}>
        <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted/60" />
        <div className="h-80 animate-pulse rounded-2xl bg-muted/40" />
      </div>
    );
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
    <div className={cn(DASHBOARD_MAX_WIDE, "space-y-6 pb-16")}>
      {/*
        THESIS: a working tab book, not a three-metric poster. Outstanding is the job; collect and remind live beside the name you pick.
        OWN-WORLD: Palmart paper (cream masthead, rounded-2xl boards) with terracotta for what is still out and green only on collect.
        STORY: scan who owes, pick a person, remind or mark paid, then audit what was charged this period.
        FIRST VIEWPORT: title + period chips, owed masthead, open-tab list with a workspace.
        FORM: operate / tab-book board inside the existing dashboard world.
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
      */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <DashboardPageHero
          compact
          icon={CreditCard}
          title="On tab"
          description="Who still owes, what was charged, and what you collected."
        />
        <div className="flex flex-wrap items-center gap-2">
          {canReviewPaymentClaims ? (
            <Button asChild size="sm" variant="outline">
              <Link href={APP_ROUTES.creditsPaymentClaims}>
                They say they paid
              </Link>
            </Button>
          ) : null}
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
            disabled={busy}
            onClick={() => void refreshAll()}
          >
            <RefreshCw
              className={cn("size-3.5", refreshing && "animate-spin")}
              aria-hidden
            />
            Refresh
          </Button>
        </div>
      </header>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {feedback ? (
        <DashboardFeedback kind={feedback.kind} text={feedback.text} />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex max-w-full flex-wrap rounded-lg border border-border/70 bg-muted/40 p-0.5"
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
                  "rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                  active
                    ? "bg-[#F9F6F0] text-[#8B6F3A] shadow-sm dark:bg-muted dark:text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">{periodLabel}</p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#E6E1D8]/90 bg-[#F9F6F0] shadow-sm dark:border-border dark:bg-card">
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#6B5344] dark:text-muted-foreground">
                Still owed
              </p>
              <p className="mt-1 font-serif text-[2.35rem] leading-[1.1] tracking-tight text-[#2C1810] tabular-nums dark:text-foreground sm:text-5xl">
                {summaryLoading && summary == null && tabsLoading
                  ? " "
                  : fmtKes(totalOwed)}
              </p>
              <p className="mt-2 text-sm text-[#7A6A5C] dark:text-muted-foreground">
                {summaryLoading && summary == null && tabsLoading
                  ? "Loading balances"
                  : openTabCount === 0
                    ? "All tabs settled"
                    : `${openTabCount} open tab${openTabCount === 1 ? "" : "s"}${
                        phoneIssues > 0
                          ? ` · ${phoneIssues} need a usable phone`
                          : ""
                      }`}
              </p>
            </div>
            <dl className="grid min-w-[12rem] flex-1 grid-cols-2 gap-x-8 gap-y-3 sm:max-w-md">
              <div>
                <dt className="text-xs text-[#7A6A5C] dark:text-muted-foreground">
                  Charged
                </dt>
                <dd className="mt-0.5 font-serif text-2xl tabular-nums tracking-tight text-[#2C1810] dark:text-foreground">
                  {listLoading ? " " : fmtKes(totalCredit)}
                </dd>
                <p className="mt-0.5 text-[11px] text-[#8A7A6C] dark:text-muted-foreground">
                  {listLoading
                    ? "Loading"
                    : tabCount === 0
                      ? "Nothing this period"
                      : `${tabCount} sale${tabCount === 1 ? "" : "s"} · ${peopleCount} ${peopleCount === 1 ? "person" : "people"}`}
                </p>
              </div>
              <div>
                <dt className="text-xs text-[#7A6A5C] dark:text-muted-foreground">
                  Collected
                </dt>
                <dd className="mt-0.5 font-serif text-2xl tabular-nums tracking-tight text-[#1F6B3A] dark:text-emerald-300">
                  {summaryLoading && summary == null ? " " : fmtKes(totalPaid)}
                </dd>
                <p className="mt-0.5 text-[11px] text-[#8A7A6C] dark:text-muted-foreground">
                  {summaryLoading && summary == null
                    ? "Loading"
                    : paymentCount === 0
                      ? "No collections this period"
                      : `${paymentCount} payment${paymentCount === 1 ? "" : "s"}`}
                </p>
              </div>
            </dl>
          </div>

          {listLoading || tabCount === 0 ? null : (
            <p className="text-xs text-[#7A6A5C] dark:text-muted-foreground">
              Average tab {fmtKes(avgTab)}
              {peakHour && singleDay ? ` · peak around ${peakHour.label}` : null}
            </p>
          )}

          {singleDay && tabCount > 0 ? (
            <div>
              <div
                className="flex h-9 items-end gap-px"
                role="img"
                aria-label="Credit charged by hour of day"
              >
                {hours.map((value, hour) => (
                  <div
                    key={hour}
                    className="min-w-0 flex-1 rounded-sm bg-[#C47A5A] transition-[height,opacity] duration-200"
                    style={{
                      height: `${Math.max(10, (value / maxHour) * 100)}%`,
                      opacity: value > 0 ? 0.28 + (value / maxHour) * 0.72 : 0.1,
                    }}
                    title={`${hour}:00  ${fmtKes(value)}`}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-[#A09080] dark:text-muted-foreground">
                <span>12a</span>
                <span>6a</span>
                <span>12p</span>
                <span>6p</span>
                <span>11p</span>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {canViewCustomers ? (
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">
                Open tabs
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {tabsLoading
                  ? "Loading balances"
                  : filteredTabs.length === 0
                    ? query
                      ? "No open tabs match that search"
                      : "No outstanding balances"
                    : `Biggest balances first · ${fmtKes(totalOwed)}`}
              </p>
            </div>
            <div className="relative min-w-0 w-full sm:w-64">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                className={cn(dashboardInputClass(), "h-9 pl-9")}
                placeholder="Find name, phone, till, or receipt"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search open tabs and credit sales"
              />
            </div>
          </div>

          {tabsLoading ? (
            <LedgerSkeleton rows={5} />
          ) : openTabs.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-sm font-medium text-foreground">
                Everyone is settled
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                No open tab balances right now.
              </p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]">
              <ul
                className="max-h-[22rem] overflow-y-auto border-b border-border/60 lg:max-h-[min(34rem,calc(100dvh-18rem))] lg:border-r lg:border-b-0"
                aria-label="Open tabs"
              >
                {filteredTabs.length === 0 ? (
                  <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No names match that search.
                  </li>
                ) : (
                  filteredTabs.map((tab) => {
                    const owed = toNum(tab.balanceOwed);
                    const active = tab.customerId === selectedId;
                    const phoneOk = isUsableStoredCustomerPhone(tab.primaryPhone);
                    const suspended = Boolean(tab.creditSuspended);
                    return (
                      <li key={tab.customerId}>
                        <button
                          type="button"
                          aria-current={active ? "true" : undefined}
                          onClick={() => setSelectedId(tab.customerId)}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset",
                            active
                              ? "bg-[#F9F6F0] dark:bg-muted/50"
                              : "hover:bg-muted/40",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tracking-wide",
                              active
                                ? "bg-[#C47A5A] text-white"
                                : "bg-muted text-muted-foreground",
                            )}
                            aria-hidden
                          >
                            {initials(tab.name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {tab.name}
                              </span>
                              {suspended ? (
                                <span className="shrink-0 rounded-sm bg-[#2C1810]/8 px-1 py-px text-[10px] font-medium text-[#6B5344] dark:bg-muted dark:text-muted-foreground">
                                  Suspended
                                </span>
                              ) : null}
                            </span>
                            <span
                              className={cn(
                                "block truncate text-[11px]",
                                phoneOk
                                  ? "text-muted-foreground"
                                  : "font-medium text-destructive",
                              )}
                            >
                              {tab.primaryPhone?.trim() || "No phone"}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-[#9A5A40] dark:text-[#E8B89A]">
                            {fmtKes(owed)}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>

              <div className="flex min-h-[16rem] flex-col px-5 py-5 sm:px-6">
                {selectedTab ? (
                  <SelectedTabWorkspace
                    tab={selectedTab}
                    fmtKes={fmtKes}
                    canRemind={canRemind}
                    canManageCustomers={canManageCustomers}
                    canReviewPaymentClaims={canReviewPaymentClaims}
                    selectedCharges={selectedCharges}
                    onRemindResult={({ ok, text }) =>
                      setFeedback({ kind: ok ? "success" : "error", text })
                    }
                    onMarkPaid={() => {
                      setFeedback(null);
                      setPayTarget(selectedTab);
                    }}
                    onPrintCard={() =>
                      setCardCustomer({
                        id: selectedTab.customerId,
                        name: selectedTab.name,
                        phone: selectedTab.primaryPhone,
                      })
                    }
                    onCreditSuspended={(customerId, creditSuspended) => {
                      setOpenTabs((prev) =>
                        prev.map((row) =>
                          row.customerId === customerId
                            ? { ...row, creditSuspended }
                            : row,
                        ),
                      );
                      setFeedback({
                        kind: "success",
                        text: creditSuspended
                          ? "Tab suspended. They cannot take more credit."
                          : "Tab restored. They can take credit again.",
                      });
                    }}
                    onSuspendError={(text) =>
                      setFeedback({ kind: "error", text })
                    }
                  />
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                    <p className="text-sm font-medium text-foreground">
                      Pick a tab
                    </p>
                    <p className="mt-1 max-w-[28ch] text-sm text-muted-foreground">
                      Remind, mark paid, or print a card from here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(16rem,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Charged this period
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {listLoading
                  ? "Loading sales"
                  : `${sortedCharges.length} sale${sortedCharges.length === 1 ? "" : "s"}`}
              </p>
            </div>
            {canViewCustomers ? null : (
              <div className="relative min-w-0 w-full sm:w-56">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  className={cn(dashboardInputClass(), "h-9 pl-9")}
                  placeholder="Find name, till, or receipt"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search credit sales"
                />
              </div>
            )}
          </div>

          {listLoading ? (
            <LedgerSkeleton rows={7} />
          ) : sortedCharges.length === 0 ? (
            <p className="px-5 py-14 text-center text-sm text-muted-foreground">
              {query
                ? "No credit sales match that search."
                : `No credit sales for ${periodLabel.toLowerCase()}.`}
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {sortedCharges.map((row) => {
                const amount = toNum(row.amount);
                const name = row.customerName?.trim() || "Walk-in / unnamed";
                const linked = Boolean(
                  selectedTab && nameKey(name) === nameKey(selectedTab.name),
                );
                return (
                  <li key={row.paymentId || `${row.saleId}-${row.sortOrder}`}>
                    <button
                      type="button"
                      onClick={() => selectTabByName(name)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left sm:px-5",
                        linked
                          ? "bg-[#F9F6F0]/80 dark:bg-muted/40"
                          : "hover:bg-muted/30",
                      )}
                    >
                      <p className="w-16 shrink-0 pt-0.5 text-right text-xs font-medium tabular-nums text-muted-foreground sm:w-24">
                        {fmtDayTime(row.soldAt, singleDay)}
                      </p>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[
                            row.cashierName?.trim() || "Till",
                            row.receiptNo != null ? `#${row.receiptNo}` : null,
                            toNum(row.saleGrandTotal) > amount
                              ? `sale ${fmtKes(toNum(row.saleGrandTotal))}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-[#9A5A40] dark:text-[#E8B89A]">
                        {fmtKes(amount)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="border-b border-border/60 px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-foreground">
                Who charged
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Ranked by credit this period
              </p>
            </div>
            {listLoading ? (
              <LedgerSkeleton rows={4} />
            ) : ranked.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-muted-foreground">
                No names yet.
              </p>
            ) : (
              <ol>
                {ranked.slice(0, 10).map((person, index) => {
                  const linked = Boolean(
                    selectedTab &&
                      nameKey(person.name) === nameKey(selectedTab.name),
                  );
                  return (
                    <li key={person.name}>
                      <button
                        type="button"
                        onClick={() => selectTabByName(person.name)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2.5 text-left sm:px-5",
                          linked
                            ? "bg-[#F9F6F0] dark:bg-muted/40"
                            : "hover:bg-muted/30",
                        )}
                      >
                        <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {person.name}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {person.tabs} tab{person.tabs === 1 ? "" : "s"}
                            {singleDay && fmtTime(person.lastAt)
                              ? `, last ${fmtTime(person.lastAt)}`
                              : null}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {fmtKes(person.total)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            Remind sends WhatsApp or SMS with a pay link. Mark paid when cash or
            M-Pesa lands.
            {canReviewPaymentClaims ? (
              <>
                {" "}
                <Link
                  href={APP_ROUTES.creditsPaymentClaims}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  Review pending claims
                </Link>
                .
              </>
            ) : null}{" "}
            <Link
              href={APP_ROUTES.paymentsDayLedger}
              className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
            >
              Day ledger
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </p>
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
          void loadSummary();
          setFeedback({
            kind: "success",
            text:
              balanceOwed <= 0.001
                ? "Tab cleared. Marked as paid in full."
                : `Partial payment recorded. ${fmtKes(balanceOwed)} still owed.`,
          });
        }}
      />

      <LoyaltyCardPreview
        customer={cardCustomer}
        open={cardCustomer != null}
        onOpenChange={(next) => {
          if (!next) setCardCustomer(null);
        }}
      />
    </div>
  );
}

function isTabCreditKind(kind: string): boolean {
  return kind.startsWith("credit_");
}

function creditLineLabel(kind: string, memo: string): string {
  switch (kind) {
    case "credit_debt":
      return "Charged";
    case "credit_payment":
      return "Paid";
    case "credit_payment_reversal":
      return "Payment reversed";
    case "credit_adjustment":
      return "Adjusted";
    default:
      return memo.trim() || kind.replaceAll("_", " ");
  }
}

function isPaymentLine(kind: string): boolean {
  return kind === "credit_payment";
}

function SelectedTabWorkspace({
  tab,
  fmtKes,
  canRemind,
  canManageCustomers,
  canReviewPaymentClaims,
  selectedCharges,
  onRemindResult,
  onMarkPaid,
  onPrintCard,
  onCreditSuspended,
  onSuspendError,
}: {
  tab: OutstandingTabRowRecord;
  fmtKes: (n: number) => string;
  canRemind: boolean;
  canManageCustomers: boolean;
  canReviewPaymentClaims: boolean;
  selectedCharges: PaymentLedgerRow[];
  onRemindResult: (result: { ok: boolean; text: string }) => void;
  onMarkPaid: () => void;
  onPrintCard: () => void;
  onCreditSuspended: (customerId: string, creditSuspended: boolean) => void;
  onSuspendError: (text: string) => void;
}) {
  const owed = toNum(tab.balanceOwed);
  const phoneOk = isUsableStoredCustomerPhone(tab.primaryPhone);
  const chargeTotal = selectedCharges.reduce(
    (sum, row) => sum + toNum(row.amount),
    0,
  );
  const [statement, setStatement] = useState<CreditStatementRecord | null>(
    null,
  );
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [suspendBusy, setSuspendBusy] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    setStatement(null);
    setConfirmSuspend(false);
    void fetchCustomerCreditStatement(tab.customerId)
      .then((next) => {
        if (!cancelled) setStatement(next);
      })
      .catch((e) => {
        if (!cancelled) {
          setHistoryError(
            e instanceof Error ? e.message : "Could not load credit history.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab.customerId]);

  const suspended = Boolean(
    statement?.creditSuspended ?? tab.creditSuspended,
  );
  const tabLines = useMemo(() => {
    const lines = (statement?.lines ?? []).filter((line) =>
      isTabCreditKind(line.kind),
    );
    return [...lines].reverse();
  }, [statement]);
  const totalCharged = toNum(statement?.totalCharged);
  const totalPaid = toNum(statement?.totalPaid);

  const toggleSuspend = async (next: boolean) => {
    setSuspendBusy(true);
    try {
      const updated = await patchCustomer(tab.customerId, {
        creditSuspended: next,
      });
      setStatement((prev) =>
        prev
          ? { ...prev, creditSuspended: Boolean(updated.credit.creditSuspended) }
          : prev,
      );
      onCreditSuspended(
        tab.customerId,
        Boolean(updated.credit.creditSuspended),
      );
      setConfirmSuspend(false);
    } catch (e) {
      onSuspendError(
        e instanceof Error ? e.message : "Could not update this tab.",
      );
    } finally {
      setSuspendBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`${APP_ROUTES.customers}/${encodeURIComponent(tab.customerId)}`}
            className="font-serif text-2xl leading-[1.15] tracking-tight text-foreground hover:underline"
          >
            {tab.name}
          </Link>
          <p
            className={cn(
              "mt-1 text-sm",
              phoneOk ? "text-muted-foreground" : "font-medium text-destructive",
            )}
          >
            {tab.primaryPhone?.trim() || "No phone on file"}
          </p>
          <CustomerPhoneFlag phone={tab.primaryPhone} />
          {suspended ? (
            <p className="mt-2 text-sm text-[#6B5344] dark:text-muted-foreground">
              Tab suspended — they cannot take more credit.
            </p>
          ) : null}
        </div>
        <p className="font-serif text-3xl tabular-nums tracking-tight text-[#9A5A40] dark:text-[#E8B89A]">
          {fmtKes(owed)}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        <div>
          <dt className="text-[11px] text-muted-foreground">Charged</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
            {historyLoading ? " " : fmtKes(totalCharged)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Paid</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[#1F6B3A] dark:text-emerald-300">
            {historyLoading ? " " : fmtKes(totalPaid)}
          </dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-[11px] text-muted-foreground">Still owed</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[#9A5A40] dark:text-[#E8B89A]">
            {fmtKes(owed)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        {canReviewPaymentClaims ? (
          <Button type="button" size="sm" onClick={onMarkPaid}>
            Mark paid
          </Button>
        ) : null}
        {canRemind ? (
          <RemindPaymentButtons
            customerId={tab.customerId}
            disabled={!phoneOk}
            onResult={onRemindResult}
          />
        ) : null}
        <Button type="button" size="sm" variant="ghost" onClick={onPrintCard}>
          <IdCard className="size-3.5" aria-hidden />
          Print card
        </Button>
        {canManageCustomers ? (
          suspended ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={suspendBusy}
              onClick={() => void toggleSuspend(false)}
            >
              Restore credit
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={suspendBusy}
              onClick={() => setConfirmSuspend(true)}
            >
              <Ban className="size-3.5" aria-hidden />
              Suspend credit
            </Button>
          )
        ) : null}
        {!canReviewPaymentClaims && !canRemind && !canManageCustomers ? (
          <p className="text-xs text-muted-foreground">
            Need claims review or messaging permission to clear or remind.
          </p>
        ) : null}
      </div>

      {confirmSuspend ? (
        <div className="rounded-xl border border-border/70 bg-[#F9F6F0] px-4 py-3 dark:bg-muted/40">
          <p className="text-sm text-foreground">
            Stop {tab.name} from taking more on tab? The balance stays until they
            pay.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={suspendBusy}
              onClick={() => void toggleSuspend(true)}
            >
              Suspend tab
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={suspendBusy}
              onClick={() => setConfirmSuspend(false)}
            >
              Keep credit
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-auto border-t border-border/50 pt-4">
        <p className="text-xs text-muted-foreground">
          Credit history
          {selectedCharges.length > 0
            ? ` · this period ${selectedCharges.length} sale${
                selectedCharges.length === 1 ? "" : "s"
              }, ${fmtKes(chargeTotal)}`
            : null}
        </p>
        {historyLoading ? (
          <LedgerSkeleton rows={4} />
        ) : historyError ? (
          <p className="mt-2 text-sm text-destructive">{historyError}</p>
        ) : tabLines.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No charges or payments on file yet.
          </p>
        ) : (
          <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
            {tabLines.map((line, index) => (
              <CreditHistoryRow
                key={`${line.at}-${line.kind}-${index}`}
                line={line}
                fmtKes={fmtKes}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CreditHistoryRow({
  line,
  fmtKes,
}: {
  line: CreditStatementLineRecord;
  fmtKes: (n: number) => string;
}) {
  const debit = toNum(line.debit);
  const credit = toNum(line.credit);
  const paid = isPaymentLine(line.kind);
  const amount = paid || credit > 0 ? credit : debit;
  return (
    <li className="flex items-baseline justify-between gap-3 text-sm">
      <span className="min-w-0 truncate text-muted-foreground">
        {fmtDayTime(line.at, false)} · {creditLineLabel(line.kind, line.memo)}
      </span>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          paid
            ? "text-[#1F6B3A] dark:text-emerald-300"
            : "text-foreground",
        )}
      >
        {paid ? "−" : "+"}
        {fmtKes(amount)}
      </span>
    </li>
  );
}
