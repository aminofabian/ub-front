"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileDown, List, RefreshCw } from "lucide-react";

import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { AdjustSalePaymentDialog } from "@/components/sales/adjust-sale-payment-dialog";
import { VoidSaleDialog } from "@/components/sales/void-sale-dialog";
import {
  type SalesDatePreset,
  type StatusFilter,
} from "@/components/sales/sales-feed-filters";
import { Button } from "@/components/ui/button";
import {
  DASHBOARD_MAX_WIDE,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import { cn } from "@/lib/utils";
import { textMatchesQuery } from "@/lib/text-search";
import { formatDateRangeLabel, presetRange } from "@/lib/analytics-date-range";
import {
  fetchBranches,
  type BranchRecord,
  type RecentSaleRow,
} from "@/lib/api";
import { fetchMergedSalesActivity } from "@/lib/sales-activity";
import {
  matchesChannelFilter,
  matchesStatusWithChannel,
  type ChannelFilter,
} from "@/lib/sale-channel-filter";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  matchesPaymentFilter,
  type PaymentFilter,
} from "@/lib/sale-payment-filter";
import {
  groupLinesIntoTransactions,
  txDisplayNo,
  type SaleTransaction,
} from "@/lib/sale-transactions";
import {
  buildSalesActivityPdf,
  downloadBlob,
  salesActivityPdfFilename,
} from "@/lib/sales-activity-pdf";

import { TransactionsTheatre } from "@/app/(dashboard)/sales/transactions/_components/transactions-theatre";

export type { SaleTransaction };

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function isRefunded(status: string | undefined): boolean {
  return (status?.toLowerCase() ?? "").includes("refund");
}

const MUTED = "text-muted-foreground";

export function TransactionsPage() {
  const { me, business, setBranchId: setHeaderBranchId } = useDashboard();
  const allowed = hasPermission(
    me?.permissions,
    Permission.SalesIntelligenceRead,
  );
  const canViewWebOrders = hasPermission(
    me?.permissions,
    Permission.StorefrontOrdersRead,
  );
  const canAdjustPayment = hasPermission(
    me?.permissions,
    Permission.SalesPaymentAdjust,
  );
  const canVoid =
    hasPermission(me?.permissions, Permission.SalesVoidAny) ||
    hasPermission(me?.permissions, Permission.SalesVoidOwn);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchId, setBranchId] = useState("");
  const [adjustSaleId, setAdjustSaleId] = useState<string | null>(null);
  const [adjustReceiptLabel, setAdjustReceiptLabel] = useState<
    string | undefined
  >();
  const [voidSaleId, setVoidSaleId] = useState<string | null>(null);
  const [voidReceiptLabel, setVoidReceiptLabel] = useState<
    string | undefined
  >();
  const [pdfLoading, setPdfLoading] = useState(false);
  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked } = useSyncBranchFilter({
    value: branchId,
    setValue: setBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
    allowAll: true,
  });
  const onChangeBranch = useCallback(
    (id: string) => {
      setBranchId(id);
      setHeaderBranchId(id.trim());
    },
    [setHeaderBranchId],
  );
  const [datePreset, setDatePreset] = useState<SalesDatePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<RecentSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const dateRange = useMemo(() => {
    if (datePreset === "custom") {
      if (!customFrom || !customTo) return null;
      return { from: customFrom, to: customTo };
    }
    return presetRange(datePreset);
  }, [datePreset, customFrom, customTo]);

  const isToday = datePreset === "today" && dateRange != null;

  const periodLabel = useMemo(() => {
    if (!dateRange) {
      return datePreset === "custom" ? "Choose a start and end date." : "";
    }
    return formatDateRangeLabel(dateRange.from, dateRange.to);
  }, [dateRange, datePreset]);

  useEffect(() => {
    void fetchBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!allowed) return;
      const silent = opts?.silent ?? false;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      if (!dateRange) {
        setLines([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const data = await fetchMergedSalesActivity(
          dateRange.from,
          dateRange.to,
          branchId.trim() || undefined,
          { includeOnlineStore: canViewWebOrders },
        );
        setLines(data);
        setLastUpdated(new Date());
        setSelectedId(null);
        setMobileShowDetail(false);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to load transactions.",
        );
        if (!silent) setLines([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [allowed, branchId, canViewWebOrders, dateRange],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const transactions = useMemo(
    () => groupLinesIntoTransactions(lines),
    [lines],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (!matchesChannelFilter(channelFilter, tx.channel)) return false;
      if (!matchesStatusWithChannel(statusFilter, tx.status, tx.channel)) {
        return false;
      }
      if (
        !matchesPaymentFilter(
          paymentFilter,
          tx.paymentMethod,
          tx.paymentMethods,
        )
      ) {
        return false;
      }
      if (!q) return true;
      return textMatchesQuery(
        q,
        tx.receiptNo,
        tx.saleId,
        tx.cashierName,
        tx.customerName,
        tx.paymentMethod,
        tx.paymentMethods,
        ...tx.lines.flatMap((l) => [l.itemName, l.itemSku, l.itemBarcode]),
      );
    });
  }, [transactions, search, statusFilter, paymentFilter, channelFilter]);

  const selectedTx = useMemo(
    () => filtered.find((tx) => tx.saleId === selectedId) ?? null,
    [filtered, selectedId],
  );

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setMobileShowDetail(false);
  }, []);

  const selectTx = useCallback(
    (tx: SaleTransaction) => {
      if (selectedId === tx.saleId) {
        clearSelection();
        return;
      }
      setSelectedId(tx.saleId);
      setMobileShowDetail(true);
    },
    [selectedId, clearSelection],
  );

  const summary = useMemo(() => {
    let revenue = 0;
    let refundTotal = 0;
    let refundCount = 0;
    let units = 0;

    for (const tx of transactions) {
      if (isRefunded(tx.status)) {
        refundTotal += Math.abs(tx.total);
        refundCount += 1;
      } else {
        revenue += tx.total;
      }
      for (const line of tx.lines) {
        if (!isRefunded(line.status)) units += toNum(line.quantity);
      }
    }

    const completed = transactions.length - refundCount;
    return {
      revenue,
      count: transactions.length,
      completed,
      units,
      refundCount,
      refundTotal,
      avgTicket: completed > 0 ? revenue / completed : 0,
    };
  }, [transactions]);

  const filteredSummary = useMemo(() => {
    let revenue = 0;
    let units = 0;
    for (const tx of filtered) {
      if (!isRefunded(tx.status)) revenue += tx.total;
      for (const line of tx.lines) {
        if (!isRefunded(line.status)) units += toNum(line.quantity);
      }
    }
    return { revenue, units, count: filtered.length };
  }, [filtered]);

  const downloadPdf = useCallback(() => {
    if (!dateRange || pdfLoading) return;
    setPdfLoading(true);
    try {
      const branchLabel = branchId.trim()
        ? (branches.find((b) => b.id === branchId)?.name ?? "Branch")
        : "All branches";
      const blob = buildSalesActivityPdf({
        title: "Sales transactions",
        businessLabel: business?.name ?? null,
        branchLabel,
        periodLabel: periodLabel || "Selected period",
        revenue: filteredSummary.revenue,
        transactionCount: filteredSummary.count,
        unitsSold: filteredSummary.units,
        transactions: filtered,
      });
      downloadBlob(
        blob,
        salesActivityPdfFilename({
          title: "sales-transactions",
          from: dateRange.from,
          to: dateRange.to,
        }),
      );
    } finally {
      setPdfLoading(false);
    }
  }, [
    dateRange,
    pdfLoading,
    branchId,
    branches,
    business?.name,
    periodLabel,
    filteredSummary,
    filtered,
  ]);

  const feedFiltered =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    paymentFilter !== "all" ||
    channelFilter !== "all";

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-lg font-semibold text-foreground">Transactions</h1>
        <p className={cn("mt-2 text-sm", MUTED)}>
          You do not have permission to view transactions.
        </p>
        <Link
          href={APP_ROUTES.business}
          className="mt-6 inline-block text-sm font-medium text-[#0f766e] hover:underline"
        >
          Back to business
        </Link>
      </div>
    );
  }

  const statusLine = [
    periodLabel || (datePreset === "custom" ? "Choose dates below" : null),
    lastUpdated
      ? `Updated ${lastUpdated.toLocaleTimeString("en-KE", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-1.5")}>
      <DashboardPageHero
        icon={List}
        eyebrow="Sales"
        title="Transactions"
        description={
          <>
            {statusLine || "Receipts for the selected period."}{" "}
            <ActiveScopeSubtitle className="inline text-[11px] text-muted-foreground" />
          </>
        }
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-none px-2.5 text-[12px] shadow-none"
          asChild
        >
          <Link href={APP_ROUTES.sales}>Activity</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-none px-2.5 text-[12px] shadow-none"
          onClick={() => void load({ silent: true })}
          disabled={loading}
        >
          <RefreshCw
            className={cn("size-3.5", refreshing && "animate-spin")}
            aria-hidden
          />
          Refresh
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-none px-2.5 text-[12px] shadow-none"
          onClick={downloadPdf}
          disabled={loading || !dateRange || pdfLoading}
        >
          <FileDown className="size-3.5" aria-hidden />
          {pdfLoading ? "PDF…" : "PDF"}
        </Button>
      </DashboardPageHero>

      <TransactionsTheatre
        periodLabel={periodLabel}
        lastUpdated={lastUpdated}
        dateRange={dateRange}
        summary={summary}
        filteredCount={filtered.length}
        totalCount={transactions.length}
        feedFiltered={feedFiltered}
        loading={loading}
        error={error}
        search={search}
        onSearchChange={setSearch}
        branchId={branchId}
        onBranchChange={onChangeBranch}
        branchLocked={branchLocked}
        branches={branches}
        meBranchId={me?.branchId}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        paymentFilter={paymentFilter}
        onPaymentFilterChange={setPaymentFilter}
        channelFilter={channelFilter}
        onChannelFilterChange={setChannelFilter}
        showChannelFilter={canViewWebOrders}
        filtered={filtered}
        nowMs={nowMs}
        showRelativeTime={isToday}
        selectedId={selectedId}
        selectedTx={selectedTx}
        onSelect={selectTx}
        onClearSelection={clearSelection}
        mobileShowDetail={mobileShowDetail}
        canAdjustPayment={canAdjustPayment}
        canVoid={canVoid}
        onAdjustPayment={(tx) => {
          setAdjustSaleId(tx.saleId);
          setAdjustReceiptLabel(txDisplayNo(tx));
        }}
        onVoid={(tx) => {
          setVoidSaleId(tx.saleId);
          setVoidReceiptLabel(txDisplayNo(tx));
        }}
        pdfLoading={pdfLoading}
        onDownloadPdf={downloadPdf}
      />

      <AdjustSalePaymentDialog
        open={adjustSaleId != null}
        saleId={adjustSaleId}
        receiptLabel={adjustReceiptLabel}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustSaleId(null);
            setAdjustReceiptLabel(undefined);
          }
        }}
        onAdjusted={() => void load({ silent: true })}
      />

      <VoidSaleDialog
        open={voidSaleId != null}
        saleId={voidSaleId}
        receiptLabel={voidReceiptLabel}
        onOpenChange={(open) => {
          if (!open) {
            setVoidSaleId(null);
            setVoidReceiptLabel(undefined);
          }
        }}
        onVoided={() => void load({ silent: true })}
      />
    </div>
  );
}
