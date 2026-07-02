"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  RefreshCw,
  Search,
  ShoppingCart,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import {
  DashboardLoading,
  DashboardFeedback,
  DASHBOARD_MAX_WIDE,
} from "@/components/dashboard-page-ui";
import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { cn } from "@/lib/utils";
import {
  ANALYTICS_PRESET_LABELS,
  type DatePreset,
  formatDateRangeLabel,
  presetRange,
} from "@/lib/analytics-date-range";
import {
  fetchBranches,
  fetchRecentSales,
  postStockTakeStart,
  type BranchRecord,
  type RecentSaleRow,
} from "@/lib/api";
import { Button } from "@/components/ui/button";

function formatMoney(
  n: number | string | null | undefined,
  currency = "",
): string {
  const val = n == null ? 0 : typeof n === "number" ? n : Number(n);
  const num = val.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${num}` : num;
}

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
  action,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/30 bg-muted/10 px-4 py-2.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/90">
          <Icon className="size-3.5 text-muted-foreground/60" aria-hidden />
          {title}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function AnalyticsActivityPage() {
  const { setBranchId: setHeaderBranchId } = useDashboard();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<DatePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<BranchRecord[]>([]);
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
  const [refreshing, setRefreshing] = useState(false);
  const [recentSales, setRecentSales] = useState<RecentSaleRow[]>([]);
  const [saleSearch, setSaleSearch] = useState("");

  // ── Stock-take from sales
  const router = useRouter();
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [showStockTakeDialog, setShowStockTakeDialog] = useState(false);
  const [stockTakeBranchId, setStockTakeBranchId] = useState("");
  const [stockTakeNotes, setStockTakeNotes] = useState("");
  const [stockTakeLoading, setStockTakeLoading] = useState(false);
  const [stockTakeMessage, setStockTakeMessage] = useState("");

  const dateRange = useMemo(() => {
    if (preset === "custom") {
      if (!customFrom || !customTo) return null;
      return { from: customFrom, to: customTo };
    }
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  const activeRangeSummary = useMemo(() => {
    if (!dateRange) {
      return preset === "custom"
        ? "Choose a start and end date, then data will load."
        : "";
    }
    return formatDateRangeLabel(dateRange.from, dateRange.to);
  }, [dateRange, preset]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [branchList] = await Promise.all([fetchBranches()]);
      setBranches(branchList);

      if (dateRange) {
        const branchFilter = branchId || undefined;
        const salesRes = await fetchRecentSales(
          dateRange.from,
          dateRange.to,
          branchFilter,
        ).catch(() => []);
        setRecentSales(Array.isArray(salesRes) ? salesRes : []);
      } else {
        setRecentSales([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load sale lines.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredSales = useMemo(() => {
    const q = saleSearch.trim().toLowerCase();
    if (!q) return recentSales;
    return recentSales.filter(
      (s) =>
        s.itemName.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q) ||
        s.paymentMethod.toLowerCase().includes(q) ||
        s.saleId.toLowerCase().includes(q),
    );
  }, [recentSales, saleSearch]);

  // Deduplicate sales by item ID for stock-take selection (keep the first name)
  const uniqueSaleItems = useMemo(() => {
    const seen = new Map<string, { itemId: string; itemName: string }>();
    for (const s of recentSales) {
      if (!seen.has(s.itemId)) {
        seen.set(s.itemId, { itemId: s.itemId, itemName: s.itemName });
      }
    }
    return [...seen.values()];
  }, [recentSales]);

  const toggleSelectItem = useCallback((itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedItemIds(new Set(uniqueSaleItems.map((s) => s.itemId)));
  }, [uniqueSaleItems]);

  const clearSelection = useCallback(() => {
    setSelectedItemIds(new Set());
  }, []);

  const onStartStockTake = useCallback(async () => {
    if (selectedItemIds.size === 0 || !stockTakeBranchId) return;
    setStockTakeLoading(true);
    setStockTakeMessage("");
    try {
      const today = new Date().toISOString().split("T")[0];
      const session = await postStockTakeStart({
        branchId: stockTakeBranchId,
        sessionType: "morning",
        sessionDate: today,
        notes:
          stockTakeNotes.trim() ||
          `Stock take from ${selectedItemIds.size} sale items`,
        itemIds: [...selectedItemIds],
      });
      router.push(`/inventory/stock-take/review/${session.id}`);
    } catch (e) {
      setStockTakeMessage(
        e instanceof Error ? e.message : "Failed to start session.",
      );
    } finally {
      setStockTakeLoading(false);
    }
  }, [selectedItemIds, stockTakeBranchId, stockTakeNotes, router]);

  if (loading && !refreshing) {
    return (
      <div className="h-full overflow-y-auto overscroll-contain">
        <div className={DASHBOARD_MAX_WIDE}>
          <DashboardLoading label="Loading sale lines…" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate h-full scroll-smooth overflow-y-auto overscroll-contain">
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-24 -top-28 h-80 w-80 bg-primary/[0.05] blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-72 w-80 bg-chart-2/[0.06] blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-56 w-[min(100%,32rem)] -translate-x-1/2 bg-accent/[0.06] blur-3xl" />
      </div>
      <div
        className={cn(DASHBOARD_MAX_WIDE, "!space-y-3 !pb-12 sm:!space-y-4")}
      >
        {/* ── Unified header bar ── */}
        <div className="sticky top-0 z-30 overflow-hidden border border-border/40 bg-linear-to-b from-card/95 via-card/90 to-card/85 shadow-lg shadow-foreground/[0.02] backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
            {/* Back link + icon + label + date */}
            <div className="flex min-w-0 items-center gap-2.5">
              <Link
                href="/analytics"
                className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-muted/30 text-muted-foreground/70 transition-colors hover:border-border/60 hover:bg-muted/50 hover:text-foreground"
                aria-label="Back to analytics"
              >
                <ArrowLeft className="size-[15px]" />
              </Link>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
                  <span className="text-[13px] font-bold leading-none tracking-tight text-foreground">
                    Activity
                  </span>
                  {activeRangeSummary ? (
                    <span className="truncate text-[11px] leading-none text-muted-foreground/70">
                      {activeRangeSummary}
                    </span>
                  ) : null}
                </div>
                <ActiveScopeSubtitle className="text-[10px]" />
              </div>
            </div>

            {/* Divider */}
            <span
              className="hidden h-5 w-px bg-border/60 sm:block"
              aria-hidden
            />

            {/* Time presets */}
            <div className="flex flex-wrap items-center gap-1">
              {ANALYTICS_PRESET_LABELS.map(({ key, label, hint }) => (
                <button
                  key={key}
                  type="button"
                  title={hint}
                  onClick={() => setPreset(key)}
                  className={cn(
                    "h-6.5 rounded-lg border px-2.5 text-[10.5px] font-semibold tracking-tight transition-all duration-200",
                    "hover:-translate-y-px",
                    preset === key
                      ? "border-primary/20 bg-linear-to-b from-primary to-primary/90 text-primary-foreground shadow-sm shadow-primary/20"
                      : "border-transparent bg-muted/50 text-muted-foreground hover:border-border/60 hover:bg-muted/80 hover:text-foreground hover:shadow-sm",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Branch + Refresh */}
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <select
                  value={branchId}
                  onChange={(e) => onChangeBranch(e.target.value)}
                  disabled={branchLocked}
                  className="h-7.5 appearance-none rounded-lg border border-border/50 bg-muted/40 py-0 pl-2.5 pr-7 text-[11px] font-medium text-foreground/90 outline-none transition-colors hover:border-border/80 hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">All branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
              <button
                type="button"
                className="group flex size-7.5 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted/30 text-muted-foreground/80 transition-all duration-200 hover:border-border/70 hover:bg-muted/50 hover:text-foreground hover:shadow-sm active:scale-95 disabled:opacity-40"
                onClick={() => {
                  setRefreshing(true);
                  load();
                }}
                disabled={refreshing}
                aria-label="Refresh"
              >
                <RefreshCw
                  className={cn(
                    "size-3.5 transition-transform duration-500",
                    refreshing && "animate-spin",
                  )}
                  aria-hidden
                />
              </button>
            </div>
          </div>

          {/* Custom date row */}
          {preset === "custom" ? (
            <div className="flex items-center gap-2 border-t border-border/30 bg-muted/[0.15] px-4 pb-2.5 pt-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                From
              </span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-7 rounded-lg border border-border/50 bg-muted/30 px-2.5 text-[11px] font-medium text-foreground outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
              />
              <span className="text-[11px] text-muted-foreground/60">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-7 rounded-lg border border-border/50 bg-muted/30 px-2.5 text-[11px] font-medium text-foreground outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
              />
            </div>
          ) : null}
        </div>

        {error ? <DashboardFeedback kind="error" text={error} /> : null}

        <SectionCard
          title={`Sale lines (${filteredSales.length})`}
          icon={ShoppingCart}
          action={
            <div className="flex items-center gap-2">
              {selectedItemIds.size > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    // Default to the filtered branch or first branch
                    setStockTakeBranchId(branchId || (branches[0]?.id ?? ""));
                    setShowStockTakeDialog(true);
                  }}
                  className="flex items-center gap-1.5 h-7 rounded-lg border border-primary/30 bg-primary/10 px-2.5 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  <ClipboardList className="size-3" />
                  Stock Take ({selectedItemIds.size})
                </button>
              ) : null}
              <div className="relative">
                <Search
                  className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  placeholder="Search…"
                  value={saleSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSaleSearch(e.target.value)
                  }
                  className="h-7 rounded-lg border border-border/50 bg-muted/30 pl-7 pr-2.5 text-[11px] outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30 placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          }
        >
          {filteredSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-border/50 text-left">
                    <th className="sticky top-0 z-10 bg-muted/20 pb-2.5 pt-1 w-8 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 backdrop-blur-sm">
                      <input
                        type="checkbox"
                        checked={
                          uniqueSaleItems.length > 0 &&
                          selectedItemIds.size === uniqueSaleItems.length
                        }
                        onChange={() => {
                          if (selectedItemIds.size === uniqueSaleItems.length)
                            clearSelection();
                          else selectAll();
                        }}
                        className="size-3.5 accent-primary"
                      />
                    </th>
                    <th className="sticky top-0 z-10 bg-muted/20 pb-2.5 pt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 backdrop-blur-sm">
                      <span className="inline-flex items-center gap-1">
                        Date
                        <svg
                          className="size-2.5 text-muted-foreground/40"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </span>
                    </th>
                    <th className="sticky top-0 z-10 bg-muted/20 pb-2.5 pt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 backdrop-blur-sm">
                      Product
                    </th>
                    <th className="sticky top-0 z-10 bg-muted/20 pb-2.5 pt-1 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 backdrop-blur-sm">
                      Qty
                    </th>
                    <th className="sticky top-0 z-10 bg-muted/20 pb-2.5 pt-1 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 backdrop-blur-sm">
                      Price
                    </th>
                    <th className="sticky top-0 z-10 bg-muted/20 pb-2.5 pt-1 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 backdrop-blur-sm">
                      Total
                    </th>
                    <th className="sticky top-0 z-10 bg-muted/20 pb-2.5 pt-1 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 backdrop-blur-sm">
                      Profit
                    </th>
                    <th className="sticky top-0 z-10 bg-muted/20 pb-2.5 pt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 backdrop-blur-sm">
                      Cashier
                    </th>
                    <th className="sticky top-0 z-10 bg-muted/20 pb-2.5 pt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 backdrop-blur-sm">
                      Payment
                    </th>
                    <th className="sticky top-0 z-10 bg-muted/20 pb-2.5 pt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 backdrop-blur-sm">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.slice(0, 100).map((s, idx) => {
                    const isEven = idx % 2 === 0;
                    const profitVal = toNum(s.profit);
                    const profitPct =
                      toNum(s.lineTotal) > 0
                        ? (profitVal / toNum(s.lineTotal)) * 100
                        : 0;
                    const date = new Date(s.soldAt);
                    const timeStr = date.toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr
                        key={`${s.saleId}-${s.itemId}-${idx}`}
                        className={cn(
                          "group relative border-l-2 border-transparent transition-all duration-150",
                          "hover:border-l-primary/30 hover:bg-primary/[0.03] hover:shadow-sm",
                          isEven ? "bg-transparent" : "bg-muted/[0.15]",
                        )}
                      >
                        <td className="py-2.5 pl-2.5 w-8 text-center">
                          <input
                            type="checkbox"
                            checked={selectedItemIds.has(s.itemId)}
                            onChange={() => toggleSelectItem(s.itemId)}
                            className="size-3.5 accent-primary"
                          />
                        </td>
                        <td className="py-2.5 pl-2.5 text-xs whitespace-nowrap">
                          <span className="block text-[11px] font-medium text-foreground/90 leading-tight">
                            {date.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="block text-[10px] text-muted-foreground/60 font-mono leading-tight">
                            {timeStr}
                          </span>
                        </td>

                        <td className="py-2.5 pl-3">
                          <p className="max-w-[180px] truncate text-[11px] font-medium text-foreground/85">
                            {s.itemName}
                          </p>
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono text-[11px] tabular-nums text-foreground/80">
                          {Number(s.quantity).toFixed(2)}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono text-[11px] tabular-nums text-foreground/70">
                          {formatMoney(s.unitPrice)}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono text-[11px] font-semibold tabular-nums text-foreground">
                          {formatMoney(s.lineTotal)}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span
                              className={cn(
                                "size-1.5 shrink-0 rounded-full",
                                profitVal >= 0
                                  ? "bg-emerald-500"
                                  : "bg-destructive",
                              )}
                              aria-hidden
                            />
                            <span
                              className={cn(
                                "font-mono text-[11px] tabular-nums font-medium",
                                profitVal >= 0
                                  ? "text-emerald-600"
                                  : "text-destructive",
                              )}
                            >
                              {formatMoney(s.profit)}
                            </span>
                            <span className="w-9 text-right font-mono text-[10px] tabular-nums text-muted-foreground/50">
                              {profitPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="text-[11px] text-foreground/70 font-medium">
                            {s.cashierName}
                          </span>
                        </td>

                        <td className="py-2.5 px-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              s.paymentMethod.toLowerCase() === "cash"
                                ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-600"
                                : s.paymentMethod.toLowerCase() === "mpesa"
                                  ? "border-sky-500/20 bg-sky-500/[0.06] text-sky-600"
                                  : "border-border/50 bg-muted/30 text-muted-foreground",
                            )}
                          >
                            {s.paymentMethod}
                          </span>
                        </td>

                        <td className="py-2.5 pr-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                              s.status === "completed"
                                ? "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-600"
                                : "border-border/40 bg-muted/30 text-muted-foreground/70",
                            )}
                          >
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                s.status === "completed"
                                  ? "bg-emerald-500"
                                  : "bg-muted-foreground/50",
                              )}
                              aria-hidden
                            />
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredSales.length > 100 && (
                <div className="mt-3 border-t border-border/30 pt-2 text-center text-[11px] font-medium text-muted-foreground">
                  Showing 100 of {filteredSales.length.toLocaleString()}{" "}
                  transactions
                </div>
              )}
            </div>
          ) : (
            <div className="py-5 text-center text-xs text-muted-foreground">
              {saleSearch
                ? "No lines match your search."
                : "No sale lines for this period."}
            </div>
          )}
        </SectionCard>

        {/* Stock Take Dialog */}
        {showStockTakeDialog ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-background shadow-2xl">
              <div className="flex items-start justify-between border-b px-5 py-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold">
                    Start Stock Take
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedItemIds.size} item
                    {selectedItemIds.size > 1 ? "s" : ""} from sales
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowStockTakeDialog(false);
                    setStockTakeMessage("");
                  }}
                  className="ml-4 shrink-0 rounded-md p-1 hover:bg-muted"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4 px-5 py-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Branch *</span>
                  <select
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    value={stockTakeBranchId}
                    onChange={(e) => setStockTakeBranchId(e.target.value)}
                  >
                    <option value="">Select branch…</option>
                    {branches
                      .filter((b) => b.active)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Notes</span>
                  <input
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder={`Stock take from ${selectedItemIds.size} sale items`}
                    value={stockTakeNotes}
                    onChange={(e) => setStockTakeNotes(e.target.value)}
                  />
                </label>
                {stockTakeMessage ? (
                  <p className="text-sm text-destructive">{stockTakeMessage}</p>
                ) : null}
              </div>
              <div className="border-t px-5 py-4">
                <Button
                  className="w-full"
                  disabled={stockTakeLoading || !stockTakeBranchId}
                  onClick={onStartStockTake}
                >
                  {stockTakeLoading ? "Creating…" : "Start Stock Take"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
