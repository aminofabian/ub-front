"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  Download,
  FileDown,
  List,
  Pencil,
  RefreshCw,
  Search,
  Ban,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { AdjustSalePaymentDialog } from "@/components/sales/adjust-sale-payment-dialog";
import { VoidSaleDialog } from "@/components/sales/void-sale-dialog";
import {
  SalesFeedFilters,
  type SalesDatePreset,
  type StatusFilter,
} from "@/components/sales/sales-feed-filters";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import { cn } from "@/lib/utils";
import { textMatchesQuery } from "@/lib/text-search";
import { formatDateRangeLabel, presetRange } from "@/lib/analytics-date-range";
import {
  fetchBranches,
  fetchSaleReceiptPdf,
  type BranchRecord,
  type RecentSaleRow,
} from "@/lib/api";
import { fetchMergedSalesActivity } from "@/lib/sales-activity";
import {
  formatChannelLabel,
  matchesChannelFilter,
  matchesStatusWithChannel,
  type ChannelFilter,
} from "@/lib/sale-channel-filter";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  formatSalePaymentDisplay,
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
import { ColumnResizeHandle } from "@/lib/column-resize-handle";
import sheetStyles from "./transactions-table-columns.module.css";
import {
  TX_COL_WIDTHS_RESTORE_SCRIPT,
  TX_COLUMN_LABELS,
  type TxResizableCol,
} from "./transactions-column-widths";
import { useTxColumnWidths } from "./use-tx-column-widths";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PAPER =
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]";
const ROSTER =
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]";
const SURFACE = cn("overflow-hidden rounded-none border bg-white", HAIRLINE);
const MUTED = "text-muted-foreground";
const RUST = "text-[#9a2e16]";

/** Drag handle on the right edge of a transactions header cell. */
const txColResizeHandleClass = cn(
  "absolute inset-y-0 -right-1.5 z-20 w-3 cursor-col-resize touch-none",
  "opacity-0 transition-opacity duration-75",
  "hover:opacity-100 group-hover/tx-col:opacity-100",
  "before:absolute before:inset-y-0 before:left-1/2 before:w-0.5 before:-translate-x-1/2",
  "before:bg-transparent hover:before:bg-[var(--pos-primary,#0f766e)]",
  "group-hover/tx-col:before:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_22%,transparent)]",
  "active:before:bg-[var(--pos-primary,#0f766e)]",
  "focus-visible:opacity-100 focus-visible:outline-none",
  "focus-visible:before:bg-[var(--pos-primary,#0f766e)]",
);

export type { SaleTransaction };

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function fmtKes(n: number | string | null | undefined): string {
  const v = toNum(n);
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function formatQty(q: number | string): string {
  const n = toNum(q);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function isRefunded(status: string | undefined): boolean {
  return (status?.toLowerCase() ?? "").includes("refund");
}

function isVoided(status: string | undefined): boolean {
  const s = status?.toLowerCase() ?? "";
  return s === "voided" || s.includes("void");
}

function formatSoldTime(
  iso: string,
  nowMs: number,
  options: { relative?: boolean },
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  if (options.relative) {
    const diffSec = Math.floor((nowMs - d.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return d.toLocaleTimeString("en-KE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function itemPreview(tx: SaleTransaction): string {
  const first = tx.lines[0]?.itemName ?? "Sale";
  if (tx.lineCount <= 1) return first;
  return `${first} + ${tx.lineCount - 1} more`;
}

function saleMetaParts(tx: SaleTransaction): string[] {
  const isOnline = tx.channel === "online_store";
  const parts: string[] = [];
  const pay = formatSalePaymentDisplay(tx.paymentMethod, tx.paymentMethods);
  const payKey = pay.toLowerCase();
  if (
    !isOnline &&
    payKey &&
    payKey !== "online" &&
    payKey !== "online checkout"
  ) {
    parts.push(pay);
  }
  const customer = tx.customerName?.trim() ?? "";
  const cashier = tx.cashierName?.trim() ?? "";
  if (isOnline) {
    if (customer) parts.push(customer);
  } else {
    if (customer) parts.push(customer);
    if (cashier && cashier.toLowerCase() !== customer.toLowerCase()) {
      parts.push(cashier);
    }
  }
  if (tx.customerNo != null) parts.push(`C-${tx.customerNo}`);
  if (tx.customerMaskedHint) parts.push(tx.customerMaskedHint);
  return parts;
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ink" | "owed";
}) {
  return (
    <div className="min-w-0 px-3 py-1.5">
      <p className="text-[9px] font-semibold tracking-[-0.02em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "truncate text-sm font-semibold tabular-nums tracking-[-0.03em]",
          tone === "owed" ? RUST : "text-foreground",
        )}
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </p>
      {hint ? (
        <p className="truncate text-[10px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function TransactionRow({
  tx,
  expanded,
  onToggle,
  nowMs,
  showRelativeTime,
  canAdjustPayment,
  onAdjustPayment,
  canVoid,
  onVoid,
}: {
  tx: SaleTransaction;
  expanded: boolean;
  onToggle: () => void;
  nowMs: number;
  showRelativeTime: boolean;
  canAdjustPayment: boolean;
  onAdjustPayment: () => void;
  canVoid: boolean;
  onVoid: () => void;
}) {
  const refunded = isRefunded(tx.status);
  const voided = isVoided(tx.status);
  const isOnline = tx.channel === "online_store";
  const [receiptLoading, setReceiptLoading] = useState(false);
  const showAdjust = canAdjustPayment && !isOnline && !refunded && !voided;
  const showVoid = canVoid && !isOnline && !refunded && !voided;
  const meta = saleMetaParts(tx);
  const payment = formatSalePaymentDisplay(tx.paymentMethod, tx.paymentMethods);
  const person =
    (isOnline
      ? tx.customerName
      : tx.customerName?.trim() || tx.cashierName || tx.customerName
    )?.trim() || "—";
  const statusLabel = isOnline
    ? formatChannelLabel(tx.channel)
    : voided
      ? "Voided"
      : refunded
        ? "Refunded"
        : "Completed";
  const statusClass = isOnline
    ? "rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-[var(--order-ink,#15231f)]"
    : voided
      ? "rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-muted-foreground"
      : refunded
        ? "rounded-none border border-[#9a2e16]/35 bg-transparent text-[#9a2e16]"
        : "rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-transparent text-[var(--pos-primary,#0f766e)]";

  const onDownloadReceipt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setReceiptLoading(true);
    try {
      const blob = await fetchSaleReceiptPdf(tx.saleId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${txDisplayNo(tx)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent — user can retry
    } finally {
      setReceiptLoading(false);
    }
  };

  return (
    <article
      className={cn(
        "border-b last:border-0 transition-colors",
        HAIRLINE,
        refunded && "bg-[color-mix(in_srgb,#9a2e16_4%,white)]",
        expanded && "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_4%,white)]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)] md:hidden"
        aria-expanded={expanded}
      >
        <span className="mt-0.5 text-muted-foreground">
          {expanded ? (
            <ChevronDown className="size-3.5" aria-hidden />
          ) : (
            <ChevronRight className="size-3.5" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] font-semibold tracking-wide text-foreground/70">
              #{txDisplayNo(tx)}
            </span>
            <span
              className={cn(
                "px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
                statusClass,
              )}
            >
              {statusLabel}
            </span>
            {tx.mpesaVerified && !refunded ? (
              <span
                className="inline-flex items-center gap-0.5 rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)]"
                title="M-Pesa confirmed by KopoKopo webhook"
              >
                <BadgeCheck className="size-3" aria-hidden />
                Verified
              </span>
            ) : null}
            {tx.customerId &&
            !tx.customerPhoneVerified &&
            tx.customerMaskedHint ? (
              <span
                className="inline-flex items-center rounded-none border border-[#9a2e16]/35 px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-[#9a2e16]"
                title="M-Pesa number is still masked until the customer fills the missing digits"
              >
                Unverified number
              </span>
            ) : null}
            <span className="text-[11px] text-muted-foreground">
              {formatSoldTime(tx.soldAt, nowMs, { relative: showRelativeTime })}
            </span>
          </div>
          <p className="truncate text-sm font-medium text-foreground/90">
            {itemPreview(tx)}
          </p>
          {meta.length > 0 ? (
            <p className="truncate text-xs text-muted-foreground">
              {meta.join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p
            className={cn(
              "text-base font-semibold tabular-nums tracking-[-0.03em]",
              refunded ? RUST : "text-foreground",
            )}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {refunded && tx.total > 0 ? "−" : ""}
            {fmtKes(Math.abs(tx.total))}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {tx.lineCount} item{tx.lineCount === 1 ? "" : "s"}
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={onToggle}
        className={cn(
          sheetStyles.row,
          "hidden w-full items-center text-left text-xs transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)] md:grid",
        )}
        aria-expanded={expanded}
      >
        <span className="flex h-10 items-center justify-center text-muted-foreground">
          {expanded ? (
            <ChevronDown className="size-3.5" aria-hidden />
          ) : (
            <ChevronRight className="size-3.5" aria-hidden />
          )}
        </span>
        <span className="truncate pr-3 font-mono text-[11px] font-semibold tracking-wide text-foreground/75">
          #{txDisplayNo(tx)}
        </span>
        <span className="truncate pr-3 tabular-nums text-muted-foreground">
          {formatSoldTime(tx.soldAt, nowMs, { relative: showRelativeTime })}
        </span>
        <span className="min-w-0 truncate pr-4 font-medium text-foreground/90">
          {itemPreview(tx)}
          <span className="ml-1.5 font-normal text-muted-foreground">
            · {tx.lineCount}
          </span>
        </span>
        <span className="truncate pr-3 text-muted-foreground" title={person}>
          {tx.customerId ? (
            <Link
              href={APP_ROUTES.customer(tx.customerId)}
              onClick={(e) => e.stopPropagation()}
              className="text-[var(--pos-primary,#0f766e)] hover:underline"
            >
              {person}
            </Link>
          ) : (
            person
          )}
        </span>
        <span className="truncate pr-3 text-muted-foreground" title={payment}>
          {payment}
        </span>
        <span>
          <span
            className={cn(
              "inline-flex max-w-full items-center gap-1 truncate px-1.5 py-0.5 text-[9px] font-semibold tracking-[-0.02em]",
              statusClass,
            )}
          >
            {tx.mpesaVerified && !refunded ? (
              <BadgeCheck className="size-3 shrink-0" aria-hidden />
            ) : null}
            {statusLabel}
          </span>
        </span>
        <span
          className={cn(
            "pr-4 text-right text-[13px] font-semibold tabular-nums tracking-[-0.03em]",
            refunded ? RUST : "text-foreground",
          )}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {refunded && tx.total > 0 ? "−" : ""}
          {fmtKes(Math.abs(tx.total))}
        </span>
      </button>

      {expanded ? (
        <div className={cn("border-t px-4 py-2 md:pl-11 md:pr-4", HAIRLINE, ROSTER)}>
          <ul className="space-y-0.5">
            {tx.lines.map((line, i) => {
              const lineRefunded = isRefunded(line.status);
              return (
                <li
                  key={`${line.itemId}-${i}`}
                  className="flex items-baseline justify-between gap-3 text-[11px] leading-snug text-muted-foreground sm:text-xs"
                >
                  <span className="min-w-0 truncate">
                    <span className="tabular-nums opacity-70">
                      {formatQty(line.quantity)} × {fmtKes(line.unitPrice)}
                    </span>
                    <span className="mx-1 opacity-40">·</span>
                    <span
                      className={lineRefunded ? "line-through opacity-70" : ""}
                    >
                      {line.itemName}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums opacity-80">
                    {fmtKes(line.lineTotal)}
                  </span>
                </li>
              );
            })}
          </ul>
          {!isOnline ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 rounded-none px-2 text-[11px] text-muted-foreground hover:text-foreground"
                disabled={receiptLoading}
                onClick={onDownloadReceipt}
              >
                <Download className="size-3" aria-hidden />
                {receiptLoading ? "…" : "Receipt"}
              </Button>
              {showAdjust ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 rounded-none px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdjustPayment();
                  }}
                >
                  <Pencil className="size-3" aria-hidden />
                  Adjust payment
                </Button>
              ) : null}
              {showVoid ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 rounded-none px-2 text-[11px] text-[#9a2e16] hover:bg-[color-mix(in_srgb,#9a2e16_6%,white)] hover:text-[#7a2412]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVoid();
                  }}
                >
                  <Ban className="size-3" aria-hidden />
                  Void
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Online order — manage in{" "}
              <Link
                href={APP_ROUTES.storefrontWebOrders}
                className="font-medium text-[var(--pos-primary,#0f766e)] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Web orders
              </Link>
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function ListSkeleton() {
  return (
    <div className={cn(SURFACE, PAPER)}>
      <div className={cn("border-b bg-white px-4 py-2.5", HAIRLINE)}>
        <div className="h-3.5 w-28 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "space-y-2 border-b bg-white px-4 py-3 last:border-0 sm:px-5",
            HAIRLINE,
          )}
        >
          <div className="h-3.5 w-36 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]" />
          <div className="h-3 w-52 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)]" />
        </div>
      ))}
    </div>
  );
}

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

  const shellRef = useRef<HTMLDivElement | null>(null);
  const { guideRef, beginResize, resetColumn } = useTxColumnWidths(shellRef);
  const renderColHandle = (edge: TxResizableCol) => (
    <ColumnResizeHandle
      edge={edge}
      label={TX_COLUMN_LABELS[edge]}
      onResizeStart={beginResize}
      onReset={() => resetColumn(edge)}
      className={txColResizeHandleClass}
    />
  );

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        setExpandedId(null);
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
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col gap-1.5 bg-transparent px-3 pt-1 sm:px-5 sm:pt-1.5">
      <header
        className={cn(
          "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
          HAIRLINE,
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex size-7 shrink-0 items-center justify-center border bg-[var(--pos-primary,#0f766e)] text-white">
              <List className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1
                className="truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Transactions
              </h1>
              <p className="hidden truncate text-[10px] text-muted-foreground sm:block">
                {statusLine || "Receipts for the selected period."}
              </p>
            </div>
          </div>
          <span
            aria-hidden
            className="hidden h-3.5 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
          />
          <ActiveScopeSubtitle className="text-[11px] text-muted-foreground" />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-none px-2.5 text-[12px] shadow-none"
            asChild
          >
            <Link href={APP_ROUTES.sales}>
              Activity
            </Link>
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
        </div>
      </header>

      {dateRange && !error && !loading ? (
        <section
          aria-label="Period summary"
          className={cn(
            "grid divide-y overflow-hidden border bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4",
            HAIRLINE,
            "divide-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]",
          )}
        >
          <Metric label="Revenue" value={fmtKes(summary.revenue)} />
          <Metric
            label="Transactions"
            value={summary.count.toLocaleString("en-KE")}
            hint={
              summary.completed > 0
                ? `${fmtKes(summary.avgTicket)} average`
                : undefined
            }
          />
          <Metric
            label="Units sold"
            value={summary.units.toLocaleString("en-KE", {
              maximumFractionDigits: 1,
            })}
          />
          <Metric
            label={summary.refundCount > 0 ? "Refunds" : "Period"}
            value={
              summary.refundCount > 0
                ? fmtKes(summary.refundTotal)
                : periodLabel.split("–")[0]?.trim() || "—"
            }
            hint={
              summary.refundCount > 0
                ? `${summary.refundCount} refunded`
                : undefined
            }
            tone={summary.refundCount > 0 ? "owed" : undefined}
          />
        </section>
      ) : null}

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden border",
          HAIRLINE,
          PAPER,
          "lg:h-[min(80dvh,52rem)]",
        )}
      >
      <section
        className={cn("shrink-0 space-y-2 border-b bg-white px-2.5 py-2 sm:px-3", HAIRLINE)}
        aria-label="Filters"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Receipt, product, SKU, barcode…"
              className={cn(
                "h-8 w-full rounded-none border bg-white py-0 pl-8 pr-2.5 text-sm outline-none focus-visible:border-[var(--pos-primary,#0f766e)]",
                HAIRLINE,
              )}
              aria-label="Search transactions"
            />
          </div>
          <select
            value={branchId}
            onChange={(e) => onChangeBranch(e.target.value)}
            className={cn(
              "h-8 rounded-none border bg-white px-2.5 py-0 text-sm outline-none focus-visible:border-[var(--pos-primary,#0f766e)] sm:w-48",
              HAIRLINE,
            )}
            aria-label="Branch"
            disabled={branchLocked}
          >
            <option value="">All branches</option>
            {branches
              .filter((b) => !branchLocked || b.id === me?.branchId)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </div>

        <SalesFeedFilters
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
          compact
        />

        {feedFiltered && filtered.length !== transactions.length ? (
          <p className="text-[11px] text-muted-foreground">
            Showing {filtered.length.toLocaleString("en-KE")} of{" "}
            {transactions.length.toLocaleString("en-KE")} transactions.
          </p>
        ) : null}
      </section>

      {error ? (
        <div className="px-3 py-2">
          <DashboardFeedback kind="error" text={error} />
        </div>
      ) : null}

      <div className={cn("min-h-0 flex-1 overflow-hidden", ROSTER)}>
      {loading ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <div className="px-6 py-16 text-center text-sm text-muted-foreground">
          {!dateRange
            ? "Pick a from and to date above."
            : feedFiltered
              ? "No transactions match your filters."
              : "No transactions in this period."}
        </div>
      ) : (
        <section
          className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
          aria-label="Transactions"
        >
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 border-b bg-white px-3 py-1.5 sm:px-4",
              HAIRLINE,
            )}
          >
            <div>
              <h2
                className="text-[13px] font-semibold tracking-[-0.02em] text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Receipts
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {feedFiltered
                  ? `Showing ${filtered.length.toLocaleString("en-KE")} of ${transactions.length.toLocaleString("en-KE")}`
                  : `${filtered.length.toLocaleString("en-KE")} transaction${filtered.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 rounded-none px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={downloadPdf}
              disabled={pdfLoading}
            >
              <FileDown className="size-3.5" aria-hidden />
              {pdfLoading ? "Preparing…" : "Download PDF"}
            </Button>
          </div>
          <div ref={shellRef} className={cn(sheetStyles.shell, "min-h-0 flex-1")}>
            {/* Restores persisted widths before the sheet's first paint. */}
            <script
              dangerouslySetInnerHTML={{
                __html: TX_COL_WIDTHS_RESTORE_SCRIPT,
              }}
            />
            <div
              ref={guideRef}
              className={sheetStyles.guide}
              hidden
              aria-hidden
            />
            <div className={sheetStyles.sheetScroll}>
              <div className={sheetStyles.sheetInner}>
                <div
                  className={cn(
                    sheetStyles.row,
                    "hidden items-center border-b bg-transparent text-[9px] font-semibold tracking-[-0.02em] text-muted-foreground md:grid",
                    HAIRLINE,
                  )}
                >
                  <span className="group/tx-col relative">
                    {renderColHandle("chevron")}
                  </span>
                  <span className="group/tx-col relative py-1.5 pr-3">
                    Receipt
                    {renderColHandle("receipt")}
                  </span>
                  <span className="group/tx-col relative py-1.5 pr-3">
                    Time
                    {renderColHandle("time")}
                  </span>
                  <span className="group/tx-col relative py-1.5 pr-4">
                    Items
                    {renderColHandle("items")}
                  </span>
                  <span className="group/tx-col relative py-1.5 pr-3">
                    Customer / staff
                    {renderColHandle("person")}
                  </span>
                  <span className="group/tx-col relative py-1.5 pr-3">
                    Payment
                    {renderColHandle("payment")}
                  </span>
                  <span className="group/tx-col relative py-1.5">
                    Status
                    {renderColHandle("status")}
                  </span>
                  <span className="group/tx-col relative py-1.5 pr-4 text-right">
                    Total
                    {renderColHandle("total")}
                  </span>
                </div>
                {filtered.map((tx) => (
                  <TransactionRow
                    key={tx.saleId}
                    tx={tx}
                    expanded={expandedId === tx.saleId}
                    onToggle={() =>
                      setExpandedId((id) => (id === tx.saleId ? null : tx.saleId))
                    }
                    nowMs={nowMs}
                    showRelativeTime={isToday}
                    canAdjustPayment={canAdjustPayment}
                    onAdjustPayment={() => {
                      setAdjustSaleId(tx.saleId);
                      setAdjustReceiptLabel(txDisplayNo(tx));
                    }}
                    canVoid={canVoid}
                    onVoid={() => {
                      setVoidSaleId(tx.saleId);
                      setVoidReceiptLabel(txDisplayNo(tx));
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
      </div>
      </div>

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
