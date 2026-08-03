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
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Gauge,
  PackageSearch,
  RefreshCw,
  Search,
  ShoppingCart,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  useSessionItemType,
  useSyncBranchFilter,
} from "@/hooks/use-session-scope";
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
  fetchItemActivity,
  fetchItemVelocity,
  fetchRecentSales,
  postStockTakeStart,
  type BranchRecord,
  type ItemActivityResponse,
  type ItemVelocityRow,
  type RecentSaleRow,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  ActivityVelocityBoard,
  type VelocitySortKey,
} from "@/components/analytics/activity-velocity-board";
import { ActivityItemStory } from "@/components/analytics/activity-item-story";

type ActivityView = "velocity" | "story" | "lines";

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
      <div className="flex flex-col gap-2 border-b border-border/30 bg-muted/10 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/90">
          <Icon className="size-3.5 text-muted-foreground/60" aria-hidden />
          <span className="truncate">{title}</span>
        </div>
        {action ? <div className="w-full sm:w-auto">{action}</div> : null}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

const VIEW_TABS: {
  id: ActivityView;
  label: string;
  short: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { id: "velocity", label: "Sold by period", short: "Sold", icon: Gauge },
  { id: "story", label: "Item story", short: "Story", icon: PackageSearch },
  { id: "lines", label: "Sale lines", short: "Lines", icon: ShoppingCart },
];

export default function AnalyticsActivityPage() {
  const { setBranchId: setHeaderBranchId } = useDashboard();
  const { itemTypeId: headerItemTypeId } = useSessionItemType();
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemFromUrl = searchParams.get("item")?.trim() || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ActivityView>(
    itemFromUrl ? "story" : "velocity",
  );
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
  const [velocityRows, setVelocityRows] = useState<ItemVelocityRow[]>([]);
  const [saleSearch, setSaleSearch] = useState("");
  const [velocitySearch, setVelocitySearch] = useState("");
  const [sortKey, setSortKey] = useState<VelocitySortKey>("todayQty");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    itemFromUrl || null,
  );
  const [itemActivity, setItemActivity] = useState<ItemActivityResponse | null>(
    null,
  );
  const [itemLoading, setItemLoading] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

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

  const syncItemInUrl = useCallback(
    (itemId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (itemId) params.set("item", itemId);
      else params.delete("item");
      const qs = params.toString();
      router.replace(qs ? `/analytics/activity?${qs}` : "/analytics/activity", {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const openItemStory = useCallback(
    (itemId: string) => {
      setSelectedItemId(itemId);
      setView("story");
      syncItemInUrl(itemId);
    },
    [syncItemInUrl],
  );

  const onSort = useCallback((key: VelocitySortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(key === "itemName" ? "asc" : "desc");
      return key;
    });
  }, []);

  const patchVelocityRow = useCallback(
    (itemId: string, patch: Partial<ItemVelocityRow>) => {
      setVelocityRows((rows) =>
        rows.map((row) => (row.itemId === itemId ? { ...row, ...patch } : row)),
      );
      setItemActivity((prev) => {
        if (!prev || prev.summary.itemId !== itemId) return prev;
        return {
          ...prev,
          summary: {
            ...prev.summary,
            ...(patch.currentStock !== undefined
              ? { currentStock: patch.currentStock }
              : {}),
            ...(patch.buyingPrice !== undefined
              ? { buyingPrice: patch.buyingPrice }
              : {}),
            ...(patch.sellingPrice !== undefined
              ? { sellingPrice: patch.sellingPrice }
              : {}),
            ...(patch.imageKey !== undefined
              ? { imageKey: patch.imageKey }
              : {}),
          },
        };
      });
    },
    [],
  );

  const patchItemSummary = useCallback(
    (
      itemId: string,
      patch: Partial<ItemActivityResponse["summary"]>,
    ) => {
      setItemActivity((prev) => {
        if (!prev || prev.summary.itemId !== itemId) return prev;
        return { ...prev, summary: { ...prev.summary, ...patch } };
      });
      setVelocityRows((rows) =>
        rows.map((row) => {
          if (row.itemId !== itemId) return row;
          return {
            ...row,
            ...(patch.currentStock !== undefined
              ? { currentStock: patch.currentStock }
              : {}),
            ...(patch.buyingPrice !== undefined
              ? { buyingPrice: patch.buyingPrice }
              : {}),
            ...(patch.sellingPrice !== undefined
              ? { sellingPrice: patch.sellingPrice }
              : {}),
            ...(patch.imageKey !== undefined
              ? { imageKey: patch.imageKey }
              : {}),
          };
        }),
      );
    },
    [],
  );

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [branchList] = await Promise.all([fetchBranches()]);
      setBranches(branchList);

      const branchFilter = branchId || undefined;
      const typeFilter = headerItemTypeId?.trim() || undefined;

      const velocityPromise = fetchItemVelocity(
        branchFilter,
        typeFilter,
        200,
      ).catch(() => [] as ItemVelocityRow[]);

      const salesPromise =
        dateRange != null
          ? fetchRecentSales(
              dateRange.from,
              dateRange.to,
              branchFilter,
              typeFilter,
              view === "lines" && selectedItemId
                ? selectedItemId
                : undefined,
            ).catch(() => [] as RecentSaleRow[])
          : Promise.resolve([] as RecentSaleRow[]);

      const [velocityRes, salesRes] = await Promise.all([
        velocityPromise,
        salesPromise,
      ]);
      setVelocityRows(Array.isArray(velocityRes) ? velocityRes : []);
      setRecentSales(Array.isArray(salesRes) ? salesRes : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load activity data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, branchId, headerItemTypeId, view, selectedItemId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedItemId) {
      setItemActivity(null);
      setItemError(null);
      return;
    }
    let cancelled = false;
    setItemLoading(true);
    setItemError(null);
    const branchFilter = branchId || undefined;
    fetchItemActivity(selectedItemId, { branchId: branchFilter })
      .then((res) => {
        if (!cancelled) setItemActivity(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setItemActivity(null);
          setItemError(
            err instanceof Error ? err.message : "Failed to load item activity.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setItemLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedItemId, branchId]);

  useEffect(() => {
    if (itemFromUrl && itemFromUrl !== selectedItemId) {
      setSelectedItemId(itemFromUrl);
      setView("story");
    }
  }, [itemFromUrl, selectedItemId]);

  const filteredSales = useMemo(() => {
    let rows = recentSales;
    if (view === "lines" && selectedItemId) {
      rows = rows.filter((s) => s.itemId === selectedItemId);
    }
    const q = saleSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (s) =>
        s.itemName.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q) ||
        s.paymentMethod.toLowerCase().includes(q) ||
        s.saleId.toLowerCase().includes(q),
    );
  }, [recentSales, saleSearch, view, selectedItemId]);

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

  const showDatePresets = view === "lines" || view === "story";

  if (loading && !refreshing) {
    return (
      <div className="h-full overflow-y-auto overscroll-contain">
        <div className={DASHBOARD_MAX_WIDE}>
          <DashboardLoading label="Loading activity…" />
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
        className={cn(
          DASHBOARD_MAX_WIDE,
          "!space-y-3 !pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:!space-y-4 md:!pb-12",
        )}
      >
        <div className="sticky top-0 z-30 overflow-hidden rounded-2xl border border-border/40 bg-linear-to-b from-card/97 via-card/92 to-card/88 shadow-lg shadow-foreground/[0.02] backdrop-blur-xl">
          <div className="flex items-center gap-2.5 px-3 py-2.5 sm:gap-4 sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <Link
                href="/analytics"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-muted/30 text-muted-foreground/70 transition-colors hover:border-border/60 hover:bg-muted/50 hover:text-foreground active:scale-95 sm:size-8"
                aria-label="Back to analytics"
              >
                <ArrowLeft className="size-[15px]" />
              </Link>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
                  <span className="text-[15px] font-bold leading-none tracking-tight text-foreground sm:text-[13px]">
                    Activity
                  </span>
                  {showDatePresets && activeRangeSummary ? (
                    <span className="truncate text-[11px] leading-none text-muted-foreground/70">
                      {activeRangeSummary}
                    </span>
                  ) : (
                    <span className="hidden truncate text-[11px] leading-none text-muted-foreground/70 sm:inline">
                      Today · Yesterday · 3–30 days
                    </span>
                  )}
                </div>
                <ActiveScopeSubtitle className="text-[10px]" />
              </div>
            </div>

            {/* Desktop view tabs */}
            <div className="hidden flex-wrap items-center gap-1 md:flex">
              {VIEW_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setView(tab.id)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10.5px] font-semibold tracking-tight transition-all duration-200",
                      view === tab.id
                        ? "border-primary/20 bg-linear-to-b from-primary to-primary/90 text-primary-foreground shadow-sm shadow-primary/20"
                        : "border-transparent bg-muted/50 text-muted-foreground hover:border-border/60 hover:bg-muted/80 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3" aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <div className="relative">
                <select
                  value={branchId}
                  onChange={(e) => onChangeBranch(e.target.value)}
                  disabled={branchLocked}
                  aria-label="Branch"
                  className="h-10 max-w-[7.5rem] appearance-none rounded-xl border border-border/50 bg-muted/40 py-0 pl-2.5 pr-7 text-[12px] font-medium text-foreground/90 outline-none transition-colors hover:border-border/80 hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 sm:h-8 sm:max-w-none sm:rounded-lg sm:text-[11px]"
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
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-muted/30 text-muted-foreground/80 transition-all duration-200 hover:border-border/70 hover:bg-muted/50 hover:text-foreground active:scale-95 disabled:opacity-40 sm:size-8 sm:rounded-lg"
                onClick={() => {
                  setRefreshing(true);
                  load();
                  if (selectedItemId) {
                    setItemLoading(true);
                    fetchItemActivity(selectedItemId, {
                      branchId: branchId || undefined,
                    })
                      .then(setItemActivity)
                      .catch(() => null)
                      .finally(() => setItemLoading(false));
                  }
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

          {showDatePresets ? (
            <div className="-mx-px flex gap-1.5 overflow-x-auto border-t border-border/30 px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:px-4">
              {ANALYTICS_PRESET_LABELS.map(({ key, label, hint }) => (
                <button
                  key={key}
                  type="button"
                  title={hint}
                  onClick={() => setPreset(key)}
                  className={cn(
                    "h-8 shrink-0 rounded-full border px-3 text-[11px] font-semibold tracking-tight transition-all duration-200 sm:h-7 sm:rounded-lg sm:px-2.5 sm:text-[10.5px]",
                    preset === key
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-transparent bg-muted/40 text-muted-foreground hover:border-border/60 hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          {showDatePresets && preset === "custom" ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-border/30 bg-muted/[0.15] px-3 pb-2.5 pt-2 sm:px-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                From
              </span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-xl border border-border/50 bg-muted/30 px-2.5 text-[14px] font-medium text-foreground outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30 sm:h-7 sm:flex-none sm:rounded-lg sm:text-[11px]"
              />
              <span className="text-[11px] text-muted-foreground/60">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-xl border border-border/50 bg-muted/30 px-2.5 text-[14px] font-medium text-foreground outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30 sm:h-7 sm:flex-none sm:rounded-lg sm:text-[11px]"
              />
            </div>
          ) : null}
        </div>

        {error ? <DashboardFeedback kind="error" text={error} /> : null}

        {view === "velocity" ? (
          <SectionCard
            title={`Sold by period (${velocityRows.length})`}
            icon={Gauge}
            action={
              <div className="relative w-full sm:w-auto">
                <Search
                  className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  placeholder="Filter products…"
                  value={velocitySearch}
                  onChange={(e) => setVelocitySearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border/50 bg-muted/30 pl-8 pr-3 text-[14px] outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30 placeholder:text-muted-foreground/50 sm:h-7 sm:w-auto sm:rounded-lg sm:text-[11px]"
                />
              </div>
            }
          >
            <ActivityVelocityBoard
              rows={velocityRows}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              onSelectItem={openItemStory}
              search={velocitySearch}
              branchId={branchId}
              onRowPatched={patchVelocityRow}
            />
          </SectionCard>
        ) : null}

        {view === "story" ? (
          <SectionCard title="Item story" icon={PackageSearch}>
            <ActivityItemStory
              itemId={selectedItemId}
              activity={itemActivity}
              loading={itemLoading}
              error={itemError}
              itemTypeId={headerItemTypeId || undefined}
              branchId={branchId || undefined}
              onPickItem={openItemStory}
              onSummaryPatched={patchItemSummary}
            />
          </SectionCard>
        ) : null}

        {view === "lines" ? (
          <SectionCard
            title={`Sale lines (${filteredSales.length})`}
            icon={ShoppingCart}
            action={
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                {selectedItemId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItemId(null);
                      syncItemInUrl(null);
                    }}
                    className="h-9 rounded-xl border border-border/50 bg-muted/30 px-2.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted/50 sm:h-7 sm:rounded-lg sm:px-2 sm:text-[10px]"
                  >
                    Clear item filter
                  </button>
                ) : null}
                {selectedItemIds.size > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStockTakeBranchId(branchId || (branches[0]?.id ?? ""));
                      setShowStockTakeDialog(true);
                    }}
                    className="flex h-9 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-2.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/20 sm:h-7 sm:rounded-lg sm:text-[11px]"
                  >
                    <ClipboardList className="size-3.5" />
                    Stock Take ({selectedItemIds.size})
                  </button>
                ) : null}
                <div className="relative min-w-0 flex-1 sm:flex-none">
                  <Search
                    className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    placeholder="Search…"
                    value={saleSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSaleSearch(e.target.value)
                    }
                    className="h-10 w-full rounded-xl border border-border/50 bg-muted/30 pl-8 pr-3 text-[14px] outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30 placeholder:text-muted-foreground/50 sm:h-7 sm:w-auto sm:rounded-lg sm:text-[11px]"
                  />
                </div>
              </div>
            }
          >
            {filteredSales.length > 0 ? (
              <>
                {/* Mobile sale tickets */}
                <ul className="space-y-2 md:hidden">
                  {filteredSales.slice(0, 100).map((s, idx) => {
                    const profitVal = toNum(s.profit);
                    const date = new Date(s.soldAt);
                    return (
                      <li
                        key={`${s.saleId}-${s.itemId}-${idx}`}
                        className="rounded-2xl border border-border/50 bg-muted/[0.12] p-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <label className="flex size-10 shrink-0 items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedItemIds.has(s.itemId)}
                              onChange={() => toggleSelectItem(s.itemId)}
                              className="size-4 accent-primary"
                              aria-label={`Select ${s.itemName}`}
                            />
                          </label>
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              className="block w-full truncate text-left text-[14px] font-semibold text-foreground active:opacity-70"
                              onClick={() => openItemStory(s.itemId)}
                            >
                              {s.itemName}
                            </button>
                            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                              {date.toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                              {" · "}
                              {date.toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {" · "}
                              {s.cashierName}
                            </p>
                            <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                              <div className="flex items-baseline gap-2 font-mono tabular-nums">
                                <span className="text-[12px] text-muted-foreground">
                                  ×{Number(s.quantity).toFixed(
                                    Number.isInteger(Number(s.quantity))
                                      ? 0
                                      : 2,
                                  )}
                                </span>
                                <span className="text-[16px] font-bold text-foreground">
                                  {formatMoney(s.lineTotal)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                                    s.paymentMethod.toLowerCase() === "cash"
                                      ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-600"
                                      : s.paymentMethod.toLowerCase() ===
                                          "mpesa"
                                        ? "border-sky-500/20 bg-sky-500/[0.06] text-sky-600"
                                        : "border-border/50 bg-muted/30 text-muted-foreground",
                                  )}
                                >
                                  {s.paymentMethod}
                                </span>
                                <span
                                  className={cn(
                                    "font-mono text-[11px] font-medium tabular-nums",
                                    profitVal >= 0
                                      ? "text-emerald-600"
                                      : "text-destructive",
                                  )}
                                >
                                  {profitVal >= 0 ? "+" : ""}
                                  {formatMoney(s.profit)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b-2 border-border/50 text-left">
                        <th className="sticky top-0 z-10 w-8 bg-muted/20 pb-2.5 pt-1 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 backdrop-blur-sm">
                          <input
                            type="checkbox"
                            checked={
                              uniqueSaleItems.length > 0 &&
                              selectedItemIds.size === uniqueSaleItems.length
                            }
                            onChange={() => {
                              if (
                                selectedItemIds.size === uniqueSaleItems.length
                              )
                                clearSelection();
                              else selectAll();
                            }}
                            className="size-3.5 accent-primary"
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-muted/20 pb-2.5 pt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 backdrop-blur-sm">
                          Date
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
                              "group relative transition-all duration-150",
                              "hover:bg-primary/[0.03] hover:shadow-sm",
                              isEven ? "bg-transparent" : "bg-muted/[0.15]",
                            )}
                          >
                            <td className="w-8 py-2.5 pl-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={selectedItemIds.has(s.itemId)}
                                onChange={() => toggleSelectItem(s.itemId)}
                                className="size-3.5 accent-primary"
                              />
                            </td>
                            <td className="whitespace-nowrap py-2.5 pl-2.5 text-xs">
                              <span className="block text-[11px] font-medium leading-tight text-foreground/90">
                                {date.toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              <span className="block font-mono text-[10px] leading-tight text-muted-foreground/60">
                                {timeStr}
                              </span>
                            </td>
                            <td className="py-2.5 pl-3">
                              <button
                                type="button"
                                className="max-w-[180px] truncate text-left text-[11px] font-medium text-foreground/85 hover:text-primary hover:underline"
                                onClick={() => openItemStory(s.itemId)}
                              >
                                {s.itemName}
                              </button>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-[11px] tabular-nums text-foreground/80">
                              {Number(s.quantity).toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-[11px] tabular-nums text-foreground/70">
                              {formatMoney(s.unitPrice)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-[11px] font-semibold tabular-nums text-foreground">
                              {formatMoney(s.lineTotal)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
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
                                    "font-mono text-[11px] font-medium tabular-nums",
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
                            <td className="px-3 py-2.5">
                              <span className="text-[11px] font-medium text-foreground/70">
                                {s.cashierName}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
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
                </div>
                {filteredSales.length > 100 && (
                  <div className="mt-3 border-t border-border/30 pt-2 text-center text-[11px] font-medium text-muted-foreground">
                    Showing 100 of {filteredSales.length.toLocaleString()}{" "}
                    transactions
                  </div>
                )}
              </>
            ) : (
              <div className="py-5 text-center text-sm text-muted-foreground">
                {saleSearch
                  ? "No lines match your search."
                  : "No sale lines for this period."}
              </div>
            )}
          </SectionCard>
        ) : null}

        {showStockTakeDialog ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
            <div className="w-full max-w-sm rounded-t-2xl bg-background shadow-2xl sm:rounded-xl">
              <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
                <span className="h-1 w-10 rounded-full bg-muted-foreground/25" />
              </div>
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
                  className="ml-4 flex size-10 shrink-0 items-center justify-center rounded-xl hover:bg-muted sm:size-8"
                  aria-label="Close"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="space-y-4 px-5 py-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Branch *</span>
                  <select
                    className="h-12 rounded-xl border bg-background px-3 text-[16px] sm:h-10 sm:text-sm"
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
                    className="h-12 rounded-xl border bg-background px-3 text-[16px] sm:h-10 sm:text-sm"
                    placeholder={`Stock take from ${selectedItemIds.size} sale items`}
                    value={stockTakeNotes}
                    onChange={(e) => setStockTakeNotes(e.target.value)}
                  />
                </label>
                {stockTakeMessage ? (
                  <p className="text-sm text-destructive">{stockTakeMessage}</p>
                ) : null}
              </div>
              <div className="border-t px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Button
                  className="h-12 w-full rounded-xl text-[15px] sm:h-10 sm:text-sm"
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

      {/* Thumb-zone view dock — phone only */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-card/95 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.12)] backdrop-blur-xl md:hidden"
        aria-label="Activity views"
      >
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-1">
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 transition-colors active:scale-[0.97]",
                  active
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                {active ? (
                  <span
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary"
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl transition-colors",
                    active ? "bg-primary/12" : "bg-transparent",
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span className="text-[10px] font-semibold tracking-tight">
                  {tab.short}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
