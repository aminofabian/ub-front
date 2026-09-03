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
  CreditTicketDrawer,
  slipFromPurchase,
  type CreditSlip,
} from "@/components/credits/credit-ticket-drawer";
import {
  fetchCreditsActivitySummary,
  fetchCustomerCreditStatement,
  fetchCustomerTabPurchases,
  fetchOutstandingTabs,
  fetchPaymentLedger,
  fetchSale,
  patchCustomer,
  type CreditsActivitySummaryRecord,
  type CreditStatementLineRecord,
  type CreditStatementRecord,
  type OutstandingTabRowRecord,
  type PaymentLedgerRow,
  type SaleRecord,
  type TabPurchaseRowRecord,
} from "@/lib/api";
import type { LoyaltyCardCustomerInput } from "@/lib/loyalty-card";
import {
  formatDateRangeLabel,
  presetRange,
  type DatePreset,
} from "@/lib/analytics-date-range";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import styles from "@/components/credits/tab-book.module.css";

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

function saleToSlip(
  sale: SaleRecord,
  when: string,
  extras?: {
    customerName?: string;
    cashierName?: string;
    tabAmount?: number;
  },
): CreditSlip {
  return {
    kind: "items",
    heading: sale.receiptNo != null ? `#${sale.receiptNo}` : "Sale",
    when,
    customerName: extras?.customerName,
    cashierName: extras?.cashierName ?? sale.soldByName ?? undefined,
    lines: sale.items.map((item) => ({
      name: item.lineLabel?.trim() || "Item",
      quantity: toNum(item.quantity),
      unitPrice: toNum(item.unitPrice),
      lineTotal: toNum(item.lineTotal),
    })),
    grandTotal: toNum(sale.grandTotal),
    tabAmount: extras?.tabAmount,
  };
}

function assignPurchasesToLines(
  lines: CreditStatementLineRecord[],
  purchases: TabPurchaseRowRecord[],
): Map<number, TabPurchaseRowRecord> {
  const used = new Set<string>();
  const map = new Map<number, TabPurchaseRowRecord>();
  lines.forEach((line, i) => {
    if (line.kind !== "credit_debt") return;
    const t = new Date(line.at).getTime();
    const amount = toNum(line.debit);
    let best: TabPurchaseRowRecord | null = null;
    let bestScore = Infinity;
    for (const p of purchases) {
      if (used.has(p.saleId)) continue;
      const dt = Math.abs(new Date(p.soldAt).getTime() - t);
      if (dt > 15 * 60 * 1000) continue;
      const dCredit = Math.abs(toNum(p.creditAmount) - amount);
      const dGrand = Math.abs(toNum(p.grandTotal) - amount);
      const dAmt = Math.min(dCredit, dGrand);
      if (dAmt > 0.05) continue;
      const score = dt + dAmt * 4000;
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
    if (best) {
      used.add(best.saleId);
      map.set(i, best);
    }
  });
  return map;
}

function nameKey(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase() || "walk-in / unnamed";
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
  const [slip, setSlip] = useState<CreditSlip | null>(null);
  const [slipLoading, setSlipLoading] = useState(false);
  const [slipError, setSlipError] = useState<string | null>(null);

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

  const closeSlip = useCallback((open: boolean) => {
    if (!open) {
      setSlip(null);
      setSlipError(null);
      setSlipLoading(false);
    }
  }, []);

  const showSlip = useCallback((next: CreditSlip) => {
    setSlipError(null);
    setSlipLoading(false);
    setSlip(next);
  }, []);

  const openSaleSlip = useCallback(
    async (
      saleId: string,
      when: string,
      extras?: {
        customerName?: string;
        cashierName?: string;
        tabAmount?: number;
      },
    ) => {
      setSlip(null);
      setSlipError(null);
      setSlipLoading(true);
      try {
        const sale = await fetchSale(saleId);
        setSlip(saleToSlip(sale, when, extras));
      } catch (e) {
        setSlipError(
          e instanceof Error ? e.message : "Could not open this till slip.",
        );
        setSlip({
          kind: "items",
          heading: "Sale",
          when,
          customerName: extras?.customerName,
          cashierName: extras?.cashierName,
          lines: [],
          grandTotal: extras?.tabAmount ?? 0,
          tabAmount: extras?.tabAmount,
        });
      } finally {
        setSlipLoading(false);
      }
    },
    [],
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
    <div className={cn(DASHBOARD_MAX_WIDE, "space-y-5 pb-16")}>
      {/*
        THESIS: one ledger on white paper — still owed, names, then history as till slips.
        OWN-WORLD: white sheet, charcoal type, rust only on outstanding.
        STORY: pick a name, collect or freeze, tap a charge to read the items.
        FIRST VIEWPORT: owed figure, names, selected account.
        FORM: operate / white ledger.
        FINISH: verify in the browser.
      */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <DashboardPageHero
          compact
          icon={CreditCard}
          title="On tab"
          description="The shop cash book. Open a name to collect, remind, or freeze credit."
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

      <section className={styles.book}>
        <div className={styles.masthead}>
          <div className={styles.mastheadTop}>
            <div className={styles.owedFigure}>
              <h2 className={styles.owedAmount}>
                {summaryLoading && summary == null && tabsLoading
                  ? " "
                  : fmtKes(totalOwed)}
              </h2>
              <p className={styles.owedMeta}>
                {summaryLoading && summary == null && tabsLoading
                  ? "Loading balances"
                  : openTabCount === 0
                    ? "All tabs settled"
                    : `Still owed · ${openTabCount} open tab${openTabCount === 1 ? "" : "s"}${
                        phoneIssues > 0
                          ? ` · ${phoneIssues} need a usable phone`
                          : ""
                      }`}
              </p>
            </div>
            <dl className={styles.sideFigures}>
              <div>
                <dt>Charged</dt>
                <dd>{listLoading ? " " : fmtKes(totalCredit)}</dd>
                <p className={styles.sideHint}>
                  {listLoading
                    ? "Loading"
                    : tabCount === 0
                      ? "Nothing this period"
                      : `${tabCount} sale${tabCount === 1 ? "" : "s"} · ${peopleCount} ${peopleCount === 1 ? "person" : "people"}`}
                </p>
              </div>
              <div>
                <dt>Collected</dt>
                <dd className={styles.collect}>
                  {summaryLoading && summary == null ? " " : fmtKes(totalPaid)}
                </dd>
                <p className={styles.sideHint}>
                  {summaryLoading && summary == null
                    ? "Loading"
                    : paymentCount === 0
                      ? "No collections this period"
                      : `${paymentCount} payment${paymentCount === 1 ? "" : "s"}`}
                </p>
              </div>
            </dl>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.stamps} role="group" aria-label="Credit period">
              {PERIOD_OPTIONS.map(({ id, label, hint }) => {
                const active = period === id;
                return (
                  <button
                    key={id}
                    type="button"
                    title={hint}
                    onClick={() => setPeriod(id)}
                    className={cn(styles.stamp, active && styles.stampActive)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className={styles.sideHint}>
              {periodLabel}
              {listLoading || tabCount === 0
                ? null
                : ` · avg ${fmtKes(avgTab)}${
                    peakHour && singleDay ? ` · peak ${peakHour.label}` : ""
                  }`}
            </p>
          </div>

          {singleDay && tabCount > 0 ? (
            <div>
              <div
                className={styles.hours}
                role="img"
                aria-label="Credit charged by hour of day"
              >
                {hours.map((value, hour) => (
                  <div
                    key={hour}
                    className={styles.hour}
                    style={{
                      height: `${Math.max(10, (value / maxHour) * 100)}%`,
                      opacity: value > 0 ? 0.28 + (value / maxHour) * 0.72 : 0.1,
                    }}
                    title={`${hour}:00  ${fmtKes(value)}`}
                  />
                ))}
              </div>
              <div className={styles.hourScale}>
                <span>12a</span>
                <span>6a</span>
                <span>12p</span>
                <span>6p</span>
                <span>11p</span>
              </div>
            </div>
          ) : null}
        </div>

        {canViewCustomers ? (
          tabsLoading ? (
            <LedgerSkeleton rows={6} />
          ) : openTabs.length === 0 ? (
            <div className={styles.empty}>
              <p>Everyone is settled</p>
              <p className={styles.muted}>No open tab balances right now.</p>
            </div>
          ) : (
            <div className={styles.spread}>
              <div className={styles.index}>
                <div className={styles.indexHead}>
                  <div>
                    <h2 className={styles.indexTitle}>Names</h2>
                    <p className={styles.indexHint}>
                      {filteredTabs.length === 0
                        ? query
                          ? "No open tabs match that search"
                          : "No outstanding balances"
                        : `Biggest first · ${fmtKes(totalOwed)}`}
                    </p>
                  </div>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-neutral-400"
                      aria-hidden
                    />
                    <input
                      className={styles.search}
                      placeholder="Find name or phone"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="Search open tabs and credit sales"
                    />
                  </div>
                </div>
                <ul aria-label="Open tabs">
                  {filteredTabs.length === 0 ? (
                    <li className={cn(styles.empty, styles.muted)}>
                      No names match that search.
                    </li>
                  ) : (
                    filteredTabs.map((tab) => {
                      const owed = toNum(tab.balanceOwed);
                      const active = tab.customerId === selectedId;
                      const phoneOk = isUsableStoredCustomerPhone(
                        tab.primaryPhone,
                      );
                      const suspended = Boolean(tab.creditSuspended);
                      return (
                        <li key={tab.customerId}>
                          <button
                            type="button"
                            aria-current={active ? "true" : undefined}
                            onClick={() => setSelectedId(tab.customerId)}
                            className={cn(
                              styles.nameRow,
                              active && styles.nameRowActive,
                            )}
                          >
                            <span className={styles.nameText}>
                              <span className={styles.nameLine}>
                                {tab.name}
                                {suspended ? (
                                  <span className={styles.badge}>Held</span>
                                ) : null}
                              </span>
                              <span
                                className={cn(
                                  styles.nameMeta,
                                  !phoneOk && styles.phoneBad,
                                )}
                              >
                                {tab.primaryPhone?.trim() || "No phone"}
                              </span>
                            </span>
                            <span className={styles.nameOwed}>{fmtKes(owed)}</span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>

              <div className={styles.page}>
                {selectedTab ? (
                  <SelectedTabWorkspace
                    key={selectedTab.customerId}
                    tab={selectedTab}
                    fmtKes={fmtKes}
                    canRemind={canRemind}
                    canManageCustomers={canManageCustomers}
                    canReviewPaymentClaims={canReviewPaymentClaims}
                    selectedCharges={selectedCharges}
                    onOpenSlip={showSlip}
                    onOpenSaleSlip={(saleId, when, extras) =>
                      void openSaleSlip(saleId, when, extras)
                    }
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
                  <div className={styles.empty}>
                    <p>Pick a name</p>
                    <p className={styles.muted}>
                      Their charges, payments, and collect actions open here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className={styles.empty}>
            <p>Open tabs need customer access</p>
            <p className={styles.muted}>Period charges are still below.</p>
          </div>
        )}

        <div className={styles.daySheet}>
          <div className={styles.dayCol}>
            <div className={styles.dayHead}>
              <h2 className={styles.dayTitle}>Charged this period</h2>
              <p className={styles.dayHint}>
                {listLoading
                  ? "Loading sales"
                  : `${sortedCharges.length} sale${sortedCharges.length === 1 ? "" : "s"}`}
              </p>
              {canViewCustomers ? null : (
                <div className="relative mt-2 max-w-xs">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-neutral-400"
                    aria-hidden
                  />
                  <input
                    className={styles.search}
                    placeholder="Find name, till, or receipt"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search credit sales"
                  />
                </div>
              )}
            </div>
            {listLoading ? (
              <LedgerSkeleton rows={6} />
            ) : sortedCharges.length === 0 ? (
              <p className={cn(styles.empty, styles.muted)}>
                {query
                  ? "No credit sales match that search."
                  : `No credit sales for ${periodLabel.toLowerCase()}.`}
              </p>
            ) : (
              <ul className={styles.dayList}>
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
                        onClick={() => {
                          selectTabByName(name);
                          void openSaleSlip(
                            row.saleId,
                            fmtDayTime(row.soldAt, false),
                            {
                              customerName: name,
                              cashierName: row.cashierName?.trim() || undefined,
                              tabAmount: amount,
                            },
                          );
                        }}
                        className={cn(
                          styles.dayRow,
                          linked && styles.dayRowLinked,
                        )}
                      >
                        <p className={styles.dayWhen}>
                          {fmtDayTime(row.soldAt, singleDay)}
                        </p>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{name}</p>
                          <p className={cn(styles.muted, "truncate text-xs")}>
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
                        <p className={styles.nameOwed}>{fmtKes(amount)}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className={styles.dayCol}>
            <div className={styles.dayHead}>
              <h2 className={styles.dayTitle}>Who charged</h2>
              <p className={styles.dayHint}>Ranked by credit this period</p>
            </div>
            {listLoading ? (
              <LedgerSkeleton rows={4} />
            ) : ranked.length === 0 ? (
              <p className={cn(styles.empty, styles.muted)}>No names yet.</p>
            ) : (
              <ol className={styles.dayList}>
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
                          styles.dayRow,
                          linked && styles.dayRowLinked,
                        )}
                      >
                        <span className={cn(styles.dayWhen, "w-6 text-left")}>
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">
                            {person.name}
                          </span>
                          <span className={cn(styles.muted, "block text-[11px]")}>
                            {person.tabs} tab{person.tabs === 1 ? "" : "s"}
                            {singleDay && fmtTime(person.lastAt)
                              ? `, last ${fmtTime(person.lastAt)}`
                              : null}
                          </span>
                        </span>
                        <span className={styles.nameOwed}>
                          {fmtKes(person.total)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
            <p className={styles.foot}>
              Remind sends WhatsApp or SMS with a pay link. Mark paid when cash
              or M-Pesa lands.
              {canReviewPaymentClaims ? (
                <>
                  {" "}
                  <Link href={APP_ROUTES.creditsPaymentClaims}>
                    Review pending claims
                  </Link>
                  .
                </>
              ) : null}{" "}
              <Link
                href={APP_ROUTES.paymentsDayLedger}
                className="inline-flex items-center gap-0.5"
              >
                Day ledger
                <ArrowRight className="size-3" aria-hidden />
              </Link>
            </p>
          </div>
        </div>
      </section>

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

      <CreditTicketDrawer
        slip={slip}
        loading={slipLoading}
        error={slipError}
        fmtKes={fmtKes}
        onOpenChange={closeSlip}
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
  onOpenSlip,
  onOpenSaleSlip,
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
  onOpenSlip: (slip: CreditSlip) => void;
  onOpenSaleSlip: (
    saleId: string,
    when: string,
    extras?: {
      customerName?: string;
      cashierName?: string;
      tabAmount?: number;
    },
  ) => void;
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
  const [purchases, setPurchases] = useState<TabPurchaseRowRecord[]>([]);
  const [suspendBusy, setSuspendBusy] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    setStatement(null);
    setPurchases([]);
    setConfirmSuspend(false);
    void Promise.all([
      fetchCustomerCreditStatement(tab.customerId),
      fetchCustomerTabPurchases(tab.customerId, { offset: 0, limit: 80 }).catch(
        () => ({ rows: [] as TabPurchaseRowRecord[] }),
      ),
    ])
      .then(([next, page]) => {
        if (cancelled) return;
        setStatement(next);
        setPurchases(page.rows);
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
  const purchaseByLine = useMemo(
    () => assignPurchasesToLines(tabLines, purchases),
    [tabLines, purchases],
  );
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
    <div className={cn("flex h-full flex-col", styles.pageTurn)}>
      <div className={styles.personHead}>
        <div className="min-w-0">
          <Link
            href={`${APP_ROUTES.customers}/${encodeURIComponent(tab.customerId)}`}
            className={styles.personName}
          >
            {tab.name}
          </Link>
          <p
            className={cn(
              "mt-1 text-sm",
              phoneOk ? styles.muted : styles.phoneBad,
            )}
          >
            {tab.primaryPhone?.trim() || "No phone on file"}
          </p>
          <CustomerPhoneFlag phone={tab.primaryPhone} />
          {suspended ? (
            <p className={styles.suspendedNote}>
              Tab held — they cannot take more credit.
            </p>
          ) : null}
        </div>
        <p className={styles.personOwed}>{fmtKes(owed)}</p>
      </div>

      <dl className={styles.tally}>
        <div>
          <dt>Charged</dt>
          <dd>{historyLoading ? " " : fmtKes(totalCharged)}</dd>
        </div>
        <div>
          <dt>Paid</dt>
          <dd className={styles.paid}>
            {historyLoading ? " " : fmtKes(totalPaid)}
          </dd>
        </div>
        <div>
          <dt>Still owed</dt>
          <dd className={styles.nameOwed}>{fmtKes(owed)}</dd>
        </div>
      </dl>

      <div className={styles.actions}>
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
          <p className={cn(styles.muted, "text-xs")}>
            Need claims review or messaging permission to clear or remind.
          </p>
        ) : null}
      </div>

      {confirmSuspend ? (
        <div className={styles.confirm}>
          <p className="text-sm">
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

      <div className={styles.ledger}>
        <div className={styles.ledgerHead}>
          <span>
            History
            {selectedCharges.length > 0
              ? ` · this period ${selectedCharges.length} sale${
                  selectedCharges.length === 1 ? "" : "s"
                }, ${fmtKes(chargeTotal)}`
              : ""}
            {" · tap a row for the slip"}
          </span>
          <span>Kind</span>
          <span>Amount</span>
        </div>
        {historyLoading ? (
          <LedgerSkeleton rows={4} />
        ) : historyError ? (
          <p className="mt-2 text-sm text-destructive">{historyError}</p>
        ) : tabLines.length === 0 ? (
          <p className={cn(styles.muted, "mt-2 text-sm")}>
            No charges or payments on file yet.
          </p>
        ) : (
          <ul className={styles.ledgerBody}>
            {tabLines.map((line, index) => (
              <CreditHistoryRow
                key={`${line.at}-${line.kind}-${index}`}
                line={line}
                purchase={purchaseByLine.get(index) ?? null}
                fmtKes={fmtKes}
                onOpen={() => {
                  const purchase = purchaseByLine.get(index);
                  if (purchase) {
                    onOpenSlip(
                      slipFromPurchase(
                        purchase,
                        (iso) => fmtDayTime(iso, false),
                        tab.name,
                      ),
                    );
                    return;
                  }
                  if (isPaymentLine(line.kind)) {
                    onOpenSlip({
                      kind: "payment",
                      heading: "Collected",
                      when: fmtDayTime(line.at, false),
                      customerName: tab.name,
                      amount: toNum(line.credit) || toNum(line.debit),
                      note: creditLineLabel(line.kind, line.memo),
                    });
                    return;
                  }
                  const match = selectedCharges.find((row) => {
                    const dt = Math.abs(
                      new Date(row.soldAt).getTime() - new Date(line.at).getTime(),
                    );
                    return (
                      dt < 15 * 60 * 1000 &&
                      Math.abs(toNum(row.amount) - toNum(line.debit)) < 0.05
                    );
                  });
                  if (match) {
                    onOpenSaleSlip(match.saleId, fmtDayTime(match.soldAt, false), {
                      customerName: tab.name,
                      cashierName: match.cashierName?.trim() || undefined,
                      tabAmount: toNum(match.amount),
                    });
                    return;
                  }
                  onOpenSlip({
                    kind: "items",
                    heading: creditLineLabel(line.kind, line.memo),
                    when: fmtDayTime(line.at, false),
                    customerName: tab.name,
                    lines: [],
                    grandTotal: toNum(line.debit) || toNum(line.credit),
                    tabAmount: toNum(line.debit) || undefined,
                  });
                }}
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
  purchase,
  fmtKes,
  onOpen,
}: {
  line: CreditStatementLineRecord;
  purchase: TabPurchaseRowRecord | null;
  fmtKes: (n: number) => string;
  onOpen: () => void;
}) {
  const debit = toNum(line.debit);
  const credit = toNum(line.credit);
  const paid = isPaymentLine(line.kind);
  const amount = paid || credit > 0 ? credit : debit;
  const itemHint =
    purchase && purchase.lines.length > 0
      ? purchase.lines
          .slice(0, 2)
          .map((l) => l.itemName)
          .join(", ") + (purchase.lines.length > 2 ? "…" : "")
      : null;
  return (
    <li>
      <button type="button" className={styles.ledgerRow} onClick={onOpen}>
        <span className={styles.ledgerWhen}>
          {fmtDayTime(line.at, false)}
          {itemHint ? (
            <span className={cn(styles.muted, "mt-0.5 block truncate text-[11px]")}>
              {itemHint}
            </span>
          ) : null}
        </span>
        <span className={styles.ledgerKind}>
          {creditLineLabel(line.kind, line.memo)}
        </span>
        <span className={cn(styles.ledgerAmt, paid && styles.paid)}>
          {paid ? "−" : "+"}
          {fmtKes(amount)}
        </span>
      </button>
    </li>
  );
}
