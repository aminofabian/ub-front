"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  BarChart3,
  ClipboardList,
  Package,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Warehouse,
  X,
  Boxes,
  Table,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_FILTER_WELL,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardFilterFieldLabelClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchBatchDashboard,
  fetchBatchTable,
  fetchBranches,
  fetchSupplyBatches,
  patchSupplyBatch,
  recalculateSupplyBatch,
  clearSupplyBatch,
  type BatchDashboardResponse,
  type BatchTableResponse,
  type BranchRecord,
  type SupplyBatchSummaryRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { BatchSummaryCards } from "./batch-summary-cards";
import { BatchAlerts } from "./batch-alerts";
import { BatchCharts } from "./batch-charts";
import { BatchTable } from "./batch-table";
import { SupplyBatchTable } from "./supply-batch-table";
import { cn } from "@/lib/utils";

function getPresetDates(preset: string): { from: string; to: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  switch (preset) {
    case "today":
      return { from: fmt(today), to: fmt(today) };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: fmt(y), to: fmt(y) };
    }
    case "week": {
      const w = new Date(today);
      w.setDate(w.getDate() - 6);
      return { from: fmt(w), to: fmt(today) };
    }
    case "month": {
      const m = new Date(today);
      m.setDate(1);
      return { from: fmt(m), to: fmt(today) };
    }
    default:
      return { from: "", to: "" };
  }
}

const WASTAGE_REASONS = [
  { value: "EXPIRED", label: "Expired" },
  { value: "SPOILAGE", label: "Spoilage" },
  { value: "BREAKAGE", label: "Breakage" },
  { value: "THEFT", label: "Theft" },
  { value: "SAMPLE", label: "Sample" },
  { value: "PERSONAL_USE", label: "Personal use" },
  { value: "COUNTING_ERROR", label: "Counting error" },
  { value: "OTHER", label: "Other" },
];

export function BatchDashboardPage() {
  const { me, setBranchId: setHeaderBranchId } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.InventoryRead);
  const canWrite = hasPermission(me?.permissions, Permission.InventoryWrite);

  const [dashboard, setDashboard] = useState<BatchDashboardResponse | null>(
    null,
  );
  const [tableData, setTableData] = useState<BatchTableResponse | null>(null);
  const [supplyBatches, setSupplyBatches] = useState<
    SupplyBatchSummaryRecord[]
  >([]);
  const [supplyBatchTotal, setSupplyBatchTotal] = useState(0);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [loadingSupplyBatches, setLoadingSupplyBatches] = useState(false);
  const [message, setMessage] = useState("");

  // Active tab: "inventory" | "supply"
  const [activeTab, setActiveTab] = useState<"inventory" | "supply">("supply");

  // Filters
  const [branchFilter, setBranchFilter] = useState("");
  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked } = useSyncBranchFilter({
    value: branchFilter,
    setValue: setBranchFilter,
    availableIds: branches.length > 0 ? branchIds : undefined,
    allowAll: true,
  });
  const onChangeBranchFilter = useCallback(
    (id: string) => {
      setBranchFilter(id);
      if (!branchLocked && id.trim()) setHeaderBranchId(id.trim());
    },
    [branchLocked, setHeaderBranchId],
  );
  const [datePreset, setDatePreset] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [qtyMin, setQtyMin] = useState("");
  const [qtyMax, setQtyMax] = useState("");

  // Table state (inventory batches)
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [sortBy, setSortBy] = useState("receivedAt");
  const [sortDir, setSortDir] = useState("desc");

  // Table state (supply batches)
  const [sbPage, setSbPage] = useState(0);
  const [sbSize, setSbSize] = useState(25);
  const [sbSortBy, setSbSortBy] = useState("receivedAt");
  const [sbSortDir, setSbSortDir] = useState("desc");

  // Clear dialog state
  const [clearDialog, setClearDialog] = useState<{
    id: string;
    batchNumber: string;
    hasRemaining: boolean;
  } | null>(null);
  const [clearReason, setClearReason] = useState("EXPIRED");
  const [clearNotes, setClearNotes] = useState("");
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    try {
      const list = await fetchBranches();
      setBranches(list.filter((b) => b.active));
    } catch {
      // ignore
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const data = await fetchBatchDashboard({
        branchId: branchFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setDashboard(data);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to load dashboard.",
      );
    } finally {
      setLoadingDashboard(false);
    }
  }, [branchFilter, fromDate, toDate]);

  const loadTable = useCallback(async () => {
    setLoadingTable(true);
    try {
      const data = await fetchBatchTable({
        branchId: branchFilter || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        quantityMin: qtyMin || undefined,
        quantityMax: qtyMax || undefined,
        page,
        size,
        sortBy,
        sortDir,
      });
      setTableData(data);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to load table.",
      );
    } finally {
      setLoadingTable(false);
    }
  }, [
    branchFilter,
    statusFilter,
    searchQuery,
    fromDate,
    toDate,
    qtyMin,
    qtyMax,
    page,
    size,
    sortBy,
    sortDir,
  ]);

  const loadSupplyBatches = useCallback(async () => {
    setLoadingSupplyBatches(true);
    try {
      // We fetch all and paginate client-side since the existing API doesn't support server-side pagination
      const rows = await fetchSupplyBatches({
        branchId: branchFilter || undefined,
        status: statusFilter || undefined,
      });
      setSupplyBatchTotal(rows.length);

      // Client-side sort
      const sorted = [...rows].sort((a, b) => {
        const dir = sbSortDir === "asc" ? 1 : -1;
        switch (sbSortBy) {
          case "batchNumber":
            return (
              dir * (a.batchNumber || "").localeCompare(b.batchNumber || "")
            );
          case "batchName":
            return dir * (a.batchName || "").localeCompare(b.batchName || "");
          case "supplierName":
            return (
              dir * (a.supplierName || "").localeCompare(b.supplierName || "")
            );
          case "itemCount":
            return dir * (a.itemCount - b.itemCount);
          case "totalInitialQuantity":
            return (
              dir *
              (Number(a.totalInitialQuantity) - Number(b.totalInitialQuantity))
            );
          case "totalRemainingQuantity":
            return (
              dir *
              (Number(a.totalRemainingQuantity) -
                Number(b.totalRemainingQuantity))
            );
          case "totalCost":
            return dir * (Number(a.totalCost) - Number(b.totalCost));
          case "totalRevenue":
            return dir * (Number(a.totalRevenue) - Number(b.totalRevenue));
          case "totalAssociatedCosts":
            return (
              dir *
              (Number(a.totalAssociatedCosts) - Number(b.totalAssociatedCosts))
            );
          case "soldPercentage":
            return dir * (Number(a.soldPercentage) - Number(b.soldPercentage));
          case "status":
            return dir * (a.status || "").localeCompare(b.status || "");
          default:
            return (
              dir *
              (new Date(a.receivedAt).getTime() -
                new Date(b.receivedAt).getTime())
            );
        }
      });

      // Client-side pagination
      const start = sbPage * sbSize;
      const paginated = sorted.slice(start, start + sbSize);
      setSupplyBatches(paginated);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load supply batches.",
      );
    } finally {
      setLoadingSupplyBatches(false);
    }
  }, [branchFilter, statusFilter, sbPage, sbSize, sbSortBy, sbSortDir]);

  useEffect(() => {
    if (!allowed) return;
    loadBranches();
  }, [allowed, loadBranches]);

  useEffect(() => {
    if (!allowed) return;
    loadDashboard();
  }, [allowed, loadDashboard]);

  useEffect(() => {
    if (!allowed) return;
    loadTable();
  }, [allowed, loadTable]);

  useEffect(() => {
    if (!allowed) return;
    loadSupplyBatches();
  }, [allowed, loadSupplyBatches]);

  const handleSort = useCallback(
    (col: string) => {
      if (sortBy === col) {
        setSortDir(sortDir === "asc" ? "desc" : "asc");
      } else {
        setSortBy(col);
        setSortDir("desc");
      }
      setPage(0);
    },
    [sortBy, sortDir],
  );

  const handleSbSort = useCallback(
    (col: string) => {
      if (sbSortBy === col) {
        setSbSortDir(sbSortDir === "asc" ? "desc" : "asc");
      } else {
        setSbSortBy(col);
        setSbSortDir("desc");
      }
      setSbPage(0);
    },
    [sbSortBy, sbSortDir],
  );

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset) {
      const d = getPresetDates(preset);
      setFromDate(d.from);
      setToDate(d.to);
    } else {
      setFromDate("");
      setToDate("");
    }
    setPage(0);
    setSbPage(0);
  };

  const clearFilters = () => {
    setBranchFilter("");
    setDatePreset("");
    setFromDate("");
    setToDate("");
    setStatusFilter("");
    setSearchQuery("");
    setQtyMin("");
    setQtyMax("");
    setPage(0);
    setSbPage(0);
  };

  const handleRecalculate = async (id: string) => {
    try {
      await recalculateSupplyBatch(id);
      setClearResult("Batch recalculated successfully.");
      loadSupplyBatches();
      loadDashboard();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Recalculate failed.",
      );
    }
  };

  const handleRename = async (id: string, name: string) => {
    try {
      await patchSupplyBatch(id, { batchName: name || undefined });
      loadSupplyBatches();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rename failed.");
    }
  };

  const handleClear = async () => {
    if (!clearDialog) return;
    setClearing(true);
    try {
      await clearSupplyBatch(clearDialog.id, {
        reason: clearReason,
        notes: clearNotes || null,
      });
      setClearResult(`Batch ${clearDialog.batchNumber} cleared successfully.`);
      setClearDialog(null);
      loadSupplyBatches();
      loadDashboard();
      loadTable();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Clear failed.");
    } finally {
      setClearing(false);
    }
  };

  const hasFilters =
    branchFilter ||
    datePreset ||
    fromDate ||
    toDate ||
    statusFilter ||
    searchQuery ||
    qtyMin ||
    qtyMax;

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Batch Dashboard"
        description={
          <>
            You do not have permission to view batch analytics. Ask an
            administrator to grant{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              {Permission.InventoryRead}
            </code>
            .
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  const filtersBusy =
    loadingDashboard || loadingTable || loadingSupplyBatches;

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      <div className="space-y-8">
        <section className={DASHBOARD_SECTION_SURFACE}>
          <DashboardPageHero
            showActiveScope
            icon={BarChart3}
            eyebrow="Inventory"
            title="Batch Dashboard"
            description="Monitor batch activity, track production trends, and identify stock anomalies at a glance."
          />
          <div className="mt-8">
            <DashboardQuickLinks
              links={[
                {
                  href: APP_ROUTES.inventorySupplyBatches,
                  label: "Supply batches",
                  desc: "View all batches",
                  icon: Warehouse,
                },
                {
                  href: APP_ROUTES.inventoryValuation,
                  label: "Valuation",
                  desc: "Stock value",
                  icon: Package,
                },
                {
                  href: APP_ROUTES.inventoryTransfers,
                  label: "Transfers",
                  desc: "Move stock",
                  icon: ArrowRightLeft,
                },
                {
                  href: APP_ROUTES.inventoryStockTake,
                  label: "Stock take",
                  desc: "Counts",
                  icon: ClipboardList,
                },
              ]}
            />
          </div>
        </section>

        {message ? <DashboardFeedback kind="error" text={message} /> : null}
        {clearResult ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <DashboardFeedback kind="success" text={clearResult} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="shrink-0 self-end sm:self-start"
              onClick={() => setClearResult(null)}
            >
              Dismiss
            </Button>
          </div>
        ) : null}

        <section className={DASHBOARD_SECTION_SURFACE}>
          <div className="flex flex-col gap-2 border-b border-border/50 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/50 text-foreground shadow-sm">
                <SlidersHorizontal className="size-[18px]" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Filters
                </h2>
              </div>
            </div>
          </div>

          <div
            className={cn(
              DASHBOARD_FILTER_WELL,
              "sticky top-0 z-30 backdrop-blur-md supports-[backdrop-filter]:bg-muted/40",
            )}
          >
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex min-w-[12rem] flex-col gap-2">
                <span className={dashboardFilterFieldLabelClass()}>Branch</span>
                <select
                  className={dashboardSelectClass(filtersBusy)}
                  value={branchFilter}
                  disabled={branchLocked}
                  onChange={(e) => {
                    onChangeBranchFilter(e.target.value);
                    setPage(0);
                    setSbPage(0);
                  }}
                >
                  {!branchLocked ? (
                    <option value="">All branches</option>
                  ) : null}
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex min-w-[10rem] flex-col gap-2">
                <span className={dashboardFilterFieldLabelClass()}>
                  Date Range
                </span>
                <select
                  className={dashboardSelectClass(filtersBusy)}
                  value={datePreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                >
                  <option value="">All time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {datePreset === "custom" ? (
                <>
                  <div className="flex min-w-[10.5rem] flex-col gap-2">
                    <span className={dashboardFilterFieldLabelClass()}>From</span>
                    <input
                      type="date"
                      className={dashboardInputClass(filtersBusy)}
                      value={fromDate}
                      onChange={(e) => {
                        setFromDate(e.target.value);
                        setPage(0);
                        setSbPage(0);
                      }}
                    />
                  </div>
                  <div className="flex min-w-[10.5rem] flex-col gap-2">
                    <span className={dashboardFilterFieldLabelClass()}>To</span>
                    <input
                      type="date"
                      className={dashboardInputClass(filtersBusy)}
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value);
                        setPage(0);
                        setSbPage(0);
                      }}
                    />
                  </div>
                </>
              ) : null}

              <div className="flex min-w-[10rem] flex-col gap-2">
                <span className={dashboardFilterFieldLabelClass()}>Status</span>
                <select
                  className={dashboardSelectClass(filtersBusy)}
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0);
                    setSbPage(0);
                  }}
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="soldout">Sold out</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {activeTab === "inventory" ? (
                <>
                  <div className="flex min-w-[12rem] flex-col gap-2">
                    <span className={dashboardFilterFieldLabelClass()}>
                      Search
                    </span>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Batch, item, SKU…"
                        className={dashboardInputClass(filtersBusy, "pl-9")}
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setPage(0);
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className={dashboardFilterFieldLabelClass()}>
                      Qty Min
                    </span>
                    <input
                      type="number"
                      className={dashboardInputClass(filtersBusy, "w-24")}
                      value={qtyMin}
                      onChange={(e) => {
                        setQtyMin(e.target.value);
                        setPage(0);
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className={dashboardFilterFieldLabelClass()}>
                      Qty Max
                    </span>
                    <input
                      type="number"
                      className={dashboardInputClass(filtersBusy, "w-24")}
                      value={qtyMax}
                      onChange={(e) => {
                        setQtyMax(e.target.value);
                        setPage(0);
                      }}
                    />
                  </div>
                </>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 pb-0.5">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="shadow-sm"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Clear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="shadow-sm"
                  onClick={() => {
                    loadDashboard();
                    loadTable();
                    loadSupplyBatches();
                  }}
                  disabled={filtersBusy}
                >
                  <RefreshCw
                    className={cn(
                      "mr-1 h-3.5 w-3.5",
                      filtersBusy && "animate-spin",
                    )}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Alerts */}
        {dashboard && <BatchAlerts alerts={dashboard.alerts} />}

        {/* Summary Cards */}
        {dashboard && <BatchSummaryCards summary={dashboard.summary} />}

        {/* Charts */}
        {dashboard && (
          <BatchCharts
            dailyTrend={dashboard.dailyTrend}
            statusDistribution={dashboard.statusDistribution}
            topProducts={dashboard.topProducts}
            expiringBatches={dashboard.expiringBatches}
          />
        )}

        <section className={cn(DASHBOARD_SECTION_SURFACE, "space-y-4")}>
          <div className="inline-flex w-fit gap-1 rounded-xl border border-border/70 bg-muted/25 p-1 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
            <button
              type="button"
              onClick={() => setActiveTab("supply")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "supply"
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Boxes className="h-3.5 w-3.5" />
              Supply Batches
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("inventory")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "inventory"
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Table className="h-3.5 w-3.5" />
              Inventory Batches
            </button>
          </div>

          {activeTab === "supply" ? (
            <SupplyBatchTable
              batches={supplyBatches}
              total={supplyBatchTotal}
              page={sbPage}
              size={sbSize}
              sortBy={sbSortBy}
              sortDir={sbSortDir}
              onSort={handleSbSort}
              onPageChange={setSbPage}
              onSizeChange={(s) => {
                setSbSize(s);
                setSbPage(0);
              }}
              loading={loadingSupplyBatches}
              canWrite={canWrite}
              onRecalculate={handleRecalculate}
              onClear={(id, batchNumber, hasRemaining) =>
                setClearDialog({ id, batchNumber, hasRemaining })
              }
              onRename={handleRename}
            />
          ) : (
            tableData && (
              <BatchTable
                rows={tableData.rows}
                total={tableData.total}
                page={page}
                size={size}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSort}
                onPageChange={setPage}
                onSizeChange={(s) => {
                  setSize(s);
                  setPage(0);
                }}
                loading={loadingTable}
              />
            )
          )}
        </section>
      </div>

      {/* Clear batch confirmation dialog */}
      {clearDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border/70 bg-card p-6 shadow-lg ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
            <h2 className="text-lg font-semibold">
              {clearDialog.hasRemaining
                ? "Clear Supply Batch?"
                : "Close Supply Batch?"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You are about to close <strong>{clearDialog.batchNumber}</strong>.
              This action cannot be undone.
            </p>

            {clearDialog.hasRemaining ? (
              <div className="mt-4 space-y-4">
                <label className="flex flex-col gap-2 text-sm">
                  <span className={dashboardFilterFieldLabelClass()}>
                    Reason for write-off
                  </span>
                  <select
                    className={dashboardSelectClass(false)}
                    value={clearReason}
                    onChange={(e) => setClearReason(e.target.value)}
                  >
                    {WASTAGE_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className={dashboardFilterFieldLabelClass()}>Notes</span>
                  <input
                    className={dashboardInputClass(false)}
                    value={clearNotes}
                    onChange={(e) => setClearNotes(e.target.value)}
                    placeholder="Optional notes…"
                  />
                </label>
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setClearDialog(null)}
                disabled={clearing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleClear}
                disabled={clearing}
              >
                {clearing
                  ? "Processing…"
                  : clearDialog.hasRemaining
                    ? "Confirm — clear batch"
                    : "Close batch"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
