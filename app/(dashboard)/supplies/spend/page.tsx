"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  ChartNoAxesColumn,
  Download,
  LayoutGrid,
  Package,
  Receipt,
  RefreshCw,
  Truck,
} from "lucide-react";

import {
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSessionBranch } from "@/hooks/use-session-scope";
import {
  fetchPathBSupplies,
  fetchPurchasingIntelligenceDashboard,
  type PathBSupplyListRowRecord,
  type PurchasingIntelligenceDashboardResponse,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { SupEmptyState } from "../../suppliers/_components/supplier-layout-primitives";
import { formatSupplyMoney, supplyN } from "../_components/supplies-shared";
import { SuppliesPageLayout } from "../_components/supplies-page-layout";
import { RankedSpendList } from "./_components/ranked-spend-list";
import { SpendBars } from "./_components/spend-bars";
import { SpendBillsTable } from "./_components/spend-bills-table";
import { SpendPanel } from "./_components/spend-panel";
import { SpendPeriodStrip } from "./_components/spend-period-strip";
import { SpendSummaryPanel } from "./_components/spend-summary-panel";
import {
  SPEND_PERIODS,
  addDays,
  billsInWindow,
  buildSpendTrend,
  comparisonLabel,
  downloadSpendCsv,
  formatWindowRange,
  isoDate,
  periodWindow,
  previousWindow,
  rankSources,
  rankSuppliers,
  spendDelta,
  statusMix,
  summarizeSpend,
  type SpendPeriodId,
  type SpendRankItem,
} from "./_lib/spend-periods";

function parsePeriod(value: string | null): SpendPeriodId | null {
  if (
    value === "today" ||
    value === "week" ||
    value === "month" ||
    value === "year"
  ) {
    return value;
  }
  return null;
}

function PanelLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-7 items-center gap-1 border border-[var(--op-rule)] bg-[var(--op-surface)] px-2 text-[10.5px] font-semibold text-[var(--op-muted)] transition-colors hover:text-[var(--op-ink)]"
    >
      {children}
      <ArrowUpRight className="size-3" aria-hidden />
    </Link>
  );
}

function HeaderActionLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      asChild
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "h-7 gap-1 rounded-none border-[var(--op-rule)] bg-[var(--op-surface)] px-2 text-[11px] font-medium text-[var(--op-muted)] shadow-none hover:text-[var(--op-ink)]",
        className,
      )}
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}

function SpendSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" aria-busy="true">
      <div className="grid grid-cols-2 gap-px bg-[var(--op-rule)] ring-1 ring-[var(--op-rule)] lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="min-h-[8.25rem] animate-pulse bg-[var(--op-surface)]"
          />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(19rem,1fr)]">
        <div className="h-72 animate-pulse bg-[var(--op-surface)] ring-1 ring-[var(--op-rule)]" />
        <div className="h-72 animate-pulse bg-[var(--op-surface)] ring-1 ring-[var(--op-rule)]" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-64 animate-pulse bg-[var(--op-surface)] ring-1 ring-[var(--op-rule)]" />
        <div className="h-64 animate-pulse bg-[var(--op-surface)] ring-1 ring-[var(--op-rule)]" />
      </div>
    </div>
  );
}

export default function SuppliesSpendPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    me,
    business,
    loading: sessionLoading,
    canPathBRead,
    canPathBWrite,
    canViewPurchasingIntelligence,
  } = useDashboard();
  const { branchId: headerBranchId, branchName: headerBranchName } =
    useSessionBranch();
  const currency = business?.currency?.trim() || "KES";
  const branchId = headerBranchId?.trim() || undefined;

  const canListSupplies =
    canPathBRead ||
    hasPermission(me?.permissions, Permission.PurchasingPaymentRead);

  const [period, setPeriod] = useState<SpendPeriodId>(
    () => parsePeriod(searchParams.get("period")) ?? "month",
  );
  const [asOf, setAsOf] = useState(() => new Date());
  const [rows, setRows] = useState<PathBSupplyListRowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryData, setCategoryData] =
    useState<PurchasingIntelligenceDashboardResponse | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryRetry, setCategoryRetry] = useState(0);
  const categoryCache = useRef(
    new Map<string, PurchasingIntelligenceDashboardResponse>(),
  );

  useEffect(() => {
    const next = parsePeriod(searchParams.get("period"));
    setPeriod(next ?? "month");
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!canListSupplies) return;
    setLoading(true);
    setError(null);
    setAsOf(new Date());
    categoryCache.current.clear();
    setCategoryData(null);
    setCategoryError(null);
    try {
      setRows(
        await fetchPathBSupplies({
          branchId,
          toast: false,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load supply spend.",
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, canListSupplies]);

  useEffect(() => {
    void load();
  }, [load]);

  const window = useMemo(() => periodWindow(period, asOf), [asOf, period]);

  const cards = useMemo(
    () =>
      SPEND_PERIODS.map((item) => {
        const current = periodWindow(item.id, asOf);
        const prior = previousWindow(item.id, current, asOf);
        const currentSummary = summarizeSpend(rows, current);
        const priorSummary = summarizeSpend(rows, prior);
        return {
          id: item.id,
          label: item.label,
          rangeLabel: formatWindowRange(current, item.id),
          total: currentSummary.total,
          count: currentSummary.count,
          open: currentSummary.open,
          delta: spendDelta(currentSummary.total, priorSummary.total),
          comparison: comparisonLabel(item.id),
        };
      }),
    [asOf, rows],
  );

  const summary = useMemo(() => summarizeSpend(rows, window), [rows, window]);
  const mix = useMemo(() => statusMix(rows, window), [rows, window]);
  const sources = useMemo(() => rankSources(rows, window), [rows, window]);
  const suppliers = useMemo(
    () => rankSuppliers(rows, window),
    [rows, window],
  );
  const bills = useMemo(() => billsInWindow(rows, window), [rows, window]);
  const trend = useMemo(
    () => buildSpendTrend(rows, period, window, asOf),
    [asOf, period, rows, window],
  );

  const categoryKey = `${isoDate(window.start)}:${isoDate(window.endExclusive)}:${branchId ?? "all"}:${asOf.getTime()}:${categoryRetry}`;

  useEffect(() => {
    if (!canViewPurchasingIntelligence || !canListSupplies) {
      setCategoryData(null);
      setCategoryLoading(false);
      setCategoryError(null);
      return;
    }
    const key = categoryKey;
    const cached = categoryCache.current.get(key);
    if (cached) {
      setCategoryData(cached);
      setCategoryLoading(false);
      setCategoryError(null);
      return;
    }

    let cancelled = false;
    setCategoryLoading(true);
    setCategoryError(null);
    fetchPurchasingIntelligenceDashboard(
      isoDate(window.start),
      isoDate(addDays(window.endExclusive, -1)),
      branchId,
      { toast: false },
    )
      .then((data) => {
        if (cancelled) return;
        categoryCache.current.set(key, data);
        setCategoryData(data);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setCategoryError(
          cause instanceof Error
            ? cause.message
            : "Could not load the category mix.",
        );
      })
      .finally(() => {
        if (!cancelled) setCategoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    branchId,
    canListSupplies,
    canViewPurchasingIntelligence,
    categoryKey,
    window.start,
    window.endExclusive,
  ]);

  const selectPeriod = useCallback(
    (next: SpendPeriodId) => {
      setPeriod(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const exportCsv = useCallback(() => {
    downloadSpendCsv(rows, window, currency);
  }, [currency, rows, window]);

  const categoryItems: SpendRankItem[] = useMemo(() => {
    if (!categoryData) return [];
    const grouped = new Map<string, SpendRankItem>();
    for (const item of categoryData.topCategories) {
      const label = item.categoryName?.trim() || "Uncategorised";
      const key = label.toLowerCase();
      const value = Number(item.spend) || 0;
      const previous = grouped.get(key);
      if (previous) {
        previous.value += value;
        previous.count += item.lineCount;
      } else {
        grouped.set(key, {
          id: item.categoryId || key,
          label,
          value,
          count: item.lineCount,
          open: 0,
        });
      }
    }
    return [...grouped.values()].sort((a, b) => b.value - a.value);
  }, [categoryData]);

  const categoryTotal = Number(categoryData?.summary.totalSpend ?? 0);

  const largestBills: SpendRankItem[] = useMemo(
    () =>
      [...bills]
        .sort((a, b) => supplyN(b.grandTotal) - supplyN(a.grandTotal))
        .slice(0, 8)
        .map((bill) => ({
          id: bill.supplierInvoiceId,
          label: `${bill.supplierName} · ${bill.invoiceNumber}`,
          value: supplyN(bill.grandTotal),
          count: 1,
          open: supplyN(bill.balanceOpen),
        })),
    [bills],
  );

  const activeTrend = trend.filter((point) => !point.future);
  const hasTrendSpend = trend.some((point) => point.value > 0);
  const yearCard = cards.find((card) => card.id === "year");
  const emptyPeriodNote =
    yearCard && yearCard.total > 0.004 && summary.count === 0
      ? ` This year: ${formatSupplyMoney(yearCard.total, currency)} across ${yearCard.count} ${yearCard.count === 1 ? "bill" : "bills"}.`
      : "";
  const peak = activeTrend.reduce(
    (best, point) => (point.value > best.value ? point : best),
    activeTrend[0] ?? { key: "", label: "—", value: 0 },
  );
  const averageDay =
    activeTrend.length > 0
      ? activeTrend.reduce((sum, point) => sum + point.value, 0) /
        activeTrend.length
      : 0;
  const trendUnit = period === "year" ? "month" : "day";
  const chartTitle =
    period === "today"
      ? "Last 14 days"
      : period === "week"
        ? "This week"
        : period === "month"
          ? asOf.toLocaleDateString("en-KE", { month: "long" })
          : "This year";
  const chartHint =
    period === "today"
      ? "Today is the last bar"
      : `${formatWindowRange(window, period)} · ${
          period === "year" ? "monthly" : "daily"
        }`;

  const headerActions = (
    <>
      <HeaderActionLink href={APP_ROUTES.purchasingAddSupplies}>
        <Package className="size-3" aria-hidden />
        Records
      </HeaderActionLink>
      <HeaderActionLink href={APP_ROUTES.suppliers} className="hidden sm:inline-flex">
        <Truck className="size-3" aria-hidden />
        Suppliers
      </HeaderActionLink>
      {canViewPurchasingIntelligence ? (
        <HeaderActionLink
          href={APP_ROUTES.purchasingIntelligence}
          className="hidden sm:inline-flex"
        >
          <BarChart3 className="size-3" aria-hidden />
          Compare
        </HeaderActionLink>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading || bills.length === 0}
        onClick={exportCsv}
        className="h-7 gap-1 rounded-none border-[var(--op-rule)] bg-[var(--op-surface)] px-2 text-[11px] font-medium text-[var(--op-muted)] shadow-none hover:text-[var(--op-ink)]"
      >
        <Download className="size-3" aria-hidden />
        CSV
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => void load()}
        className="h-7 gap-1 rounded-none border-[var(--op-rule)] bg-[var(--op-surface)] px-2 text-[11px] font-medium text-[var(--op-muted)] shadow-none hover:text-[var(--op-ink)]"
      >
        <RefreshCw
          className={cn("size-3", loading && "animate-spin")}
          aria-hidden
        />
        Refresh
      </Button>
    </>
  );

  if (sessionLoading) {
    return <DashboardLoading label="Loading session…" />;
  }

  if (!me) {
    return (
      <DashboardAccessDenied
        title="Session required"
        description="Sign in to review supply spend."
        backHref={APP_ROUTES.staffLogin}
        backLabel="Login"
      />
    );
  }

  if (!canListSupplies) {
    return (
      <DashboardAccessDenied
        title="Supply spend"
        description={
          <>
            You need{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              {Permission.PurchasingPathBRead}
            </code>{" "}
            or{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              {Permission.PurchasingPaymentRead}
            </code>{" "}
            to review supply spend.
          </>
        }
        backHref={APP_ROUTES.purchasingAddSupplies}
        backLabel="Supply records"
      />
    );
  }

  const layout = (children: React.ReactNode) => (
    <SuppliesPageLayout
      title="Supply spend"
      subtitle="What buying costs · by period"
      icon={ChartNoAxesColumn}
      branchScope={headerBranchName || undefined}
      meta={
        <span className="hidden text-[10.5px] text-[var(--op-faint)] sm:inline">
          Invoice dates · {currency}
        </span>
      }
      headerActions={headerActions}
    >
      {children}
    </SuppliesPageLayout>
  );

  if (loading && rows.length === 0) {
    return layout(<SpendSkeleton />);
  }

  if (error && rows.length === 0) {
    return layout(
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DashboardFeedback kind="error" text={error} />
        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            className="h-8 rounded-none"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            Try again
          </Button>
        </div>
      </div>,
    );
  }

  if (rows.length === 0) {
    return layout(
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto border border-dashed border-[var(--op-rule)]">
        <SupEmptyState
          icon={ChartNoAxesColumn}
          title="No supply spend yet"
          description="Receive goods from a supplier or walk-in delivery and the bill will appear here, broken down by period, supplier, and category."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {canPathBWrite ? (
                <Button
                  asChild
                  size="sm"
                  className="h-8 rounded-none bg-[var(--op-accent)] px-3 text-[12px] font-semibold text-white hover:bg-[var(--op-accent-deep)]"
                >
                  <Link href={APP_ROUTES.orderReceive}>Receive goods</Link>
                </Button>
              ) : null}
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 rounded-none"
              >
                <Link href={APP_ROUTES.purchasingAddSupplies}>
                  Supply records
                </Link>
              </Button>
            </div>
          }
        />
      </div>,
    );
  }

  return layout(
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <div className="shrink-0">
        <SpendPeriodStrip
          cards={cards}
          active={period}
          onSelect={selectPeriod}
          currency={currency}
        />
      </div>

      <div className="grid shrink-0 gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(19rem,1fr)]">
        <SpendPanel
          title={chartTitle}
          hint={chartHint}
          icon={ChartNoAxesColumn}
        >
          <SpendBars
            points={trend}
            currency={currency}
            label={`Supply spend ${chartTitle}`}
            emptyLabel={
              period === "today"
                ? `No bills in the last fourteen days.${emptyPeriodNote}`
                : period === "week"
                  ? `No bills this week yet.${emptyPeriodNote}`
                  : period === "month"
                    ? `No bills in ${chartTitle} yet.${emptyPeriodNote}`
                    : "No bills this year yet."
            }
          />
          {hasTrendSpend ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[var(--op-rule-soft)] pt-3 sm:grid-cols-3">
            <div>
              <dt className="text-[10.5px] font-semibold text-[var(--op-faint)]">
                Peak
              </dt>
              <dd className="mt-0.5 text-[12px] font-semibold tabular-nums text-[var(--op-ink)]">
                {formatSupplyMoney(peak.value, currency)}
              </dd>
              <p className="text-[10px] text-[var(--op-muted)]">{peak.label}</p>
            </div>
            <div>
              <dt className="text-[10.5px] font-semibold text-[var(--op-faint)]">
                Average
              </dt>
              <dd className="mt-0.5 text-[12px] font-semibold tabular-nums text-[var(--op-ink)]">
                {formatSupplyMoney(averageDay, currency)}
              </dd>
              <p className="text-[10px] text-[var(--op-muted)]">
                per {trendUnit}
              </p>
            </div>
            <div>
              <dt className="text-[10.5px] font-semibold text-[var(--op-faint)]">
                Bills
              </dt>
              <dd className="mt-0.5 text-[12px] font-semibold tabular-nums text-[var(--op-ink)]">
                {summary.count}
              </dd>
              <p className="text-[10px] text-[var(--op-muted)]">
                {summary.supplierCount}{" "}
                {summary.supplierCount === 1 ? "supplier" : "suppliers"}
              </p>
            </div>
            </dl>
          ) : null}
        </SpendPanel>

        <SpendSummaryPanel
          summary={summary}
          mix={mix}
          sources={sources}
          currency={currency}
          rangeLabel={formatWindowRange(window, period)}
        />
      </div>

      <div className="grid shrink-0 gap-3 md:grid-cols-2">
        <SpendPanel
          title="Suppliers"
          hint={`${summary.supplierCount} ${
            summary.supplierCount === 1 ? "supplier" : "suppliers"
          } this period`}
          icon={Truck}
          action={
            <PanelLink href={APP_ROUTES.suppliers}>Directory</PanelLink>
          }
        >
          <RankedSpendList
            items={suppliers}
            total={summary.total}
            currency={currency}
            countLabel="bills"
            shareOf="period spend"
            showOpen
            empty="No supplier bills in this period."
          />
        </SpendPanel>

        {canViewPurchasingIntelligence ? (
          <SpendPanel
            title="Categories"
            hint="Goods lines · tax and extras excluded"
            icon={LayoutGrid}
            action={
              <PanelLink href={APP_ROUTES.purchasingIntelligence}>
                Compare
              </PanelLink>
            }
          >
            {categoryLoading || (!categoryData && !categoryError) ? (
              <div className="space-y-3" aria-busy="true">
                {[0, 1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-8 animate-pulse bg-[var(--op-rule-soft)]"
                  />
                ))}
              </div>
            ) : categoryError ? (
              <div className="flex min-h-36 flex-col items-center justify-center gap-2 border border-dashed border-[var(--op-rule)] px-4 text-center">
                <p className="text-[12px] leading-relaxed text-[var(--op-muted)]">
                  Could not load the category mix.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    categoryCache.current.clear();
                    setCategoryRetry((value) => value + 1);
                  }}
                  className="text-[11px] font-semibold text-[var(--op-accent)] underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            ) : (
              <RankedSpendList
                items={categoryItems}
                total={categoryTotal}
                currency={currency}
                countLabel="lines"
                shareOf="goods spend"
                empty="No categorised goods in this period."
              />
            )}
          </SpendPanel>
        ) : (
          <SpendPanel
            title="Largest bills"
            hint="Biggest single receipts this period"
            icon={Receipt}
          >
            <RankedSpendList
              items={largestBills}
              total={summary.total}
              currency={currency}
              countLabel="bill"
              shareOf="period spend"
              showOpen
              empty="No bills in this period."
            />
          </SpendPanel>
        )}
      </div>

      <div className="shrink-0">
        <SpendPanel
          title="Bills"
          hint={`${bills.length} ${bills.length === 1 ? "bill" : "bills"} · ${formatWindowRange(window, period)}`}
          icon={Receipt}
          action={
            <PanelLink href={`${APP_ROUTES.purchasingAddSupplies}?filter=all`}>
              Open records
            </PanelLink>
          }
        >
          <SpendBillsTable rows={bills} currency={currency} />
        </SpendPanel>
      </div>
    </div>,
  );
}
