"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  Loader2,
  Package,
  Pencil,
  RefreshCw,
  Search,
  Warehouse,
  X,
  XOctagon,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_SURFACE,
  DASHBOARD_TABLE_HEAD,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
  dashboardFilterFieldLabelClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchBranches,
  fetchSupplyBatches,
  fetchSuppliers,
  patchSupplyBatch,
  recalculateSupplyBatch,
  clearSupplyBatch,
  type BranchRecord,
  type SupplierRecord,
  type SupplyBatchSummaryRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

// ── Formatters ──────────────────────────────────────────────────────────

function formatQty(v: number | string): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatMoneyShort(v: number | string): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Status badge ────────────────────────────────────────────────────────

function statusBadge(status: string): { label: string; className: string } {
  const s = status?.toLowerCase() ?? "";
  if (s === "active") {
    return {
      label: "Active",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
    };
  }
  if (s === "soldout" || s === "sold_out" || s === "sold out") {
    return {
      label: "Sold out",
      className:
        "border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-100",
    };
  }
  if (s === "partial") {
    return {
      label: "Partial",
      className:
        "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
    };
  }
  if (s === "closed") {
    return {
      label: "Closed",
      className: "border-border bg-muted/50 text-muted-foreground",
    };
  }
  return {
    label: status,
    className: "border-border bg-muted/50 text-muted-foreground",
  };
}

// ── Sold progress bar ───────────────────────────────────────────────────

function soldBar(pct: number | string) {
  const p = typeof pct === "number" ? pct : Number(pct);
  const val = Number.isNaN(p) ? 0 : Math.min(100, Math.max(0, p));
  const barColor =
    val >= 90 ? "bg-emerald-500" : val >= 50 ? "bg-amber-500" : "bg-slate-300";
  const textColor =
    val >= 90
      ? "text-emerald-700"
      : val >= 50
        ? "text-amber-700"
        : "text-muted-foreground";
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/70">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColor,
          )}
          style={{ width: `${val}%` }}
        />
      </div>
      <span
        className={cn(
          "min-w-[2.25rem] text-right text-[11px] font-semibold tabular-nums",
          textColor,
        )}
      >
        {val.toFixed(0)}%
      </span>
    </div>
  );
}

// ── Wastage reasons ─────────────────────────────────────────────────────

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

// ── Component ───────────────────────────────────────────────────────────

const SORTABLE_COLS = [
  "batchNumber",
  "batchName",
  "supplierName",
  "itemCount",
  "soldPercentage",
  "totalCost",
  "totalRevenue",
  "totalAssociatedCosts",
  "totalRemainingQuantity",
  "status",
  "receivedAt",
] as const;

type SortCol = (typeof SORTABLE_COLS)[number];

export function SupplyBatchListPage() {
  const { me } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.InventoryRead);
  const canWrite = hasPermission(me?.permissions, Permission.InventoryWrite);

  const [batches, setBatches] = useState<SupplyBatchSummaryRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Client-side sort
  const [sortBy, setSortBy] = useState<SortCol>("receivedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Recalculate
  const [recalcId, setRecalcId] = useState<string | null>(null);

  // Clear dialog
  const [clearDialog, setClearDialog] = useState<{
    id: string;
    batchNumber: string;
    hasRemaining: boolean;
  } | null>(null);
  const [clearReason, setClearReason] = useState("EXPIRED");
  const [clearNotes, setClearNotes] = useState("");
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  // ── Data loading ────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setMessage("");
    setLoading(true);
    try {
      const rows = await fetchSupplyBatches({
        branchId: branchFilter || undefined,
        supplierId: supplierFilter || undefined,
        status: statusFilter || undefined,
      });
      setBatches(rows);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load supply batches.",
      );
    } finally {
      setLoading(false);
    }
  }, [branchFilter, supplierFilter, statusFilter]);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    Promise.all([fetchBranches(), fetchSuppliers()])
      .then(([bList, sList]) => {
        if (!cancelled) {
          setBranches(bList.filter((b) => b.active));
          setSuppliers(sList);
        }
      })
      .catch(() => {
        if (!cancelled) setMessage("Failed to load filters.");
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    load();
  }, [allowed, load]);

  // ── Client-side search / sort ───────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...batches];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.batchNumber?.toLowerCase().includes(q) ||
          b.batchName?.toLowerCase().includes(q) ||
          b.supplierName?.toLowerCase().includes(q),
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === "number" && typeof bVal === "number")
        return (aVal - bVal) * dir;
      const aStr = String(aVal ?? "");
      const bStr = String(bVal ?? "");
      return aStr.localeCompare(bStr) * dir;
    });
    return list;
  }, [batches, searchQuery, sortBy, sortDir]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleSort = (col: SortCol) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const handleSaveName = async (id: string) => {
    setSavingId(id);
    try {
      await patchSupplyBatch(id, { batchName: editDraft.trim() });
      setBatches((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, batchName: editDraft.trim() } : b,
        ),
      );
      setEditingId(null);
    } finally {
      setSavingId(null);
    }
  };

  const handleRecalculate = async (id: string) => {
    setRecalcId(id);
    try {
      await recalculateSupplyBatch(id);
      await load();
    } finally {
      setRecalcId(null);
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
      setClearResult(
        `Batch ${clearDialog.batchNumber} ${clearDialog.hasRemaining ? "cleared" : "closed"} successfully.`,
      );
      setClearDialog(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Clear failed.");
    } finally {
      setClearing(false);
    }
  };

  const exportCSV = useCallback(() => {
    const headers = [
      "Batch #",
      "Name",
      "Supplier",
      "Items",
      "Initial Qty",
      "Remaining",
      "Sold %",
      "Cost (KES)",
      "Revenue (KES)",
      "Extras (KES)",
      "Status",
      "Received",
    ];
    const lines = filtered.map((b) => [
      b.batchNumber,
      b.batchName ?? "",
      b.supplierName ?? "",
      b.itemCount,
      b.totalInitialQuantity,
      b.totalRemainingQuantity,
      b.soldPercentage + "%",
      b.totalCost,
      b.totalRevenue,
      b.totalAssociatedCosts,
      b.status,
      b.receivedAt,
    ]);
    const csv = [headers, ...lines]
      .map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supply-batches-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const hasFilters =
    branchFilter || supplierFilter || statusFilter || searchQuery;

  // ── Sort indicator helper ────────────────────────────────────────────

  const sortIndicator = (col: SortCol): string => {
    if (sortBy !== col) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  // ── Permission gate ──────────────────────────────────────────────────

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Supply batches"
        description={
          <>
            You do not have permission to view supply batches. Ask an
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

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      {/* ── Hero + Quick Links + Actions in one card ───────────────── */}
      <section className={DASHBOARD_SECTION_SURFACE}>
        <DashboardPageHero
          icon={Warehouse}
          eyebrow="Inventory"
          title="Supply batches"
          description="View and manage all incoming deliveries and purchase batches. Click a batch number to see details."
          compact
        />
        <div className="mt-5 flex flex-col gap-4 border-t border-border/50 pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <DashboardQuickLinks
            compact
            links={[
              {
                href: APP_ROUTES.inventoryValuation,
                label: "Valuation",
                desc: "",
                icon: Package,
              },
              {
                href: APP_ROUTES.inventoryTransfers,
                label: "Transfers",
                desc: "",
                icon: ArrowRightLeft,
              },
              {
                href: APP_ROUTES.inventoryStockTake,
                label: "Stock take",
                desc: "",
                icon: ClipboardList,
              },
            ]}
          />
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 shadow-sm"
              disabled={loading}
              onClick={load}
            >
              <RefreshCw
                className={cn("size-3.5", loading && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {/* ── Feedback ────────────────────────────────────────────────── */}
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

      {/* ── Table ───────────────────────────────────────────────────── */}
      <section className={DASHBOARD_TABLE_SURFACE}>
        <div className={DASHBOARD_TABLE_HEAD}>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                All batches
              </h2>
              <p className={cn(dashboardHintClass(), "mt-1")}>
                Incoming deliveries and purchase batches.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {loading ? (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Loading…
                </span>
              ) : (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {filtered.length} batch(es)
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="shadow-sm"
                onClick={exportCSV}
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Inline filter bar */}
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/40 pt-3">
            <label className="flex flex-1 min-w-0 flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Search
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Batch #, name, supplier…"
                  className={dashboardInputClass(false, "pl-9 h-9 text-sm")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </label>
            <label className="flex min-w-[10rem] flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </span>
              <select
                className={dashboardSelectClass(false, "h-9 text-sm")}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="soldout">Sold out</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <label className="hidden sm:flex min-w-[12rem] flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Branch
              </span>
              <select
                className={dashboardSelectClass(false, "h-9 text-sm")}
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="hidden sm:flex min-w-[12rem] flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Supplier
              </span>
              <select
                className={dashboardSelectClass(false, "h-9 text-sm")}
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
              >
                <option value="">All suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            {hasFilters ? (
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="mt-auto shadow-sm"
                onClick={() => {
                  setBranchFilter("");
                  setSupplierFilter("");
                  setStatusFilter("");
                  setSearchQuery("");
                }}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>

        <table className="hidden sm:table w-full border-collapse text-left text-sm">
          <thead className="border-b border-border/50 bg-muted/25">
            <tr>
              <th
                scope="col"
                className="cursor-pointer select-none px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground sm:px-6"
                onClick={() => handleSort("batchNumber")}
              >
                Batch #{sortIndicator("batchNumber")}
              </th>
              <th
                scope="col"
                className="cursor-pointer select-none px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground sm:px-6"
                onClick={() => handleSort("batchName")}
              >
                Name{sortIndicator("batchName")}
              </th>
              <th
                scope="col"
                className="cursor-pointer select-none px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground sm:px-6"
                onClick={() => handleSort("supplierName")}
              >
                Supplier{sortIndicator("supplierName")}
              </th>
              <th
                scope="col"
                className="hidden md:table-cell cursor-pointer select-none px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground sm:px-6"
                onClick={() => handleSort("itemCount")}
              >
                Items{sortIndicator("itemCount")}
              </th>
              <th
                scope="col"
                className="cursor-pointer select-none px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground sm:px-6"
                onClick={() => handleSort("soldPercentage")}
              >
                Sold{sortIndicator("soldPercentage")}
              </th>
              <th
                scope="col"
                className="hidden lg:table-cell cursor-pointer select-none px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground sm:px-6"
                onClick={() => handleSort("totalCost")}
              >
                Cost{sortIndicator("totalCost")}
              </th>
              <th
                scope="col"
                className="cursor-pointer select-none px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground sm:px-6"
                onClick={() => handleSort("totalRevenue")}
              >
                Revenue{sortIndicator("totalRevenue")}
              </th>
              <th
                scope="col"
                className="hidden lg:table-cell cursor-pointer select-none px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground sm:px-6"
                onClick={() => handleSort("totalAssociatedCosts")}
              >
                Extras{sortIndicator("totalAssociatedCosts")}
              </th>
              <th
                scope="col"
                className="hidden md:table-cell cursor-pointer select-none px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground sm:px-6"
                onClick={() => handleSort("totalRemainingQuantity")}
              >
                Left{sortIndicator("totalRemainingQuantity")}
              </th>
              <th
                scope="col"
                className="cursor-pointer select-none px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground sm:px-6"
                onClick={() => handleSort("status")}
              >
                Status{sortIndicator("status")}
              </th>
              <th
                scope="col"
                className="hidden lg:table-cell cursor-pointer select-none px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground sm:px-6"
                onClick={() => handleSort("receivedAt")}
              >
                Received{sortIndicator("receivedAt")}
              </th>
              <th
                scope="col"
                className="px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-[13px]">
            {loading ? (
              <tr>
                <td
                  colSpan={13}
                  className="px-6 py-12 text-center text-sm text-muted-foreground"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading supply batches…
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={13}
                  className="px-6 py-12 text-center text-sm text-muted-foreground"
                >
                  {hasFilters
                    ? "No supply batches match your filters."
                    : "No supply batches found. Create your first supply batch from the Purchasing → Supplies page."}
                </td>
              </tr>
            ) : (
              filtered.map((b) => {
                const isClosed = b.status?.toLowerCase() === "closed";
                const isSoldout =
                  b.status?.toLowerCase() === "soldout" ||
                  b.status?.toLowerCase() === "sold_out";
                const canAct = canWrite && !isClosed;
                const st = statusBadge(b.status);

                return (
                  <tr
                    key={b.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    {/* Batch # */}
                    <td className="px-5 py-4 sm:px-6">
                      <Link
                        href={`/inventory/supply-batches/${b.id}`}
                        className="font-medium text-foreground hover:text-primary decoration-1 underline-offset-4 hover:underline"
                      >
                        {b.batchNumber}
                      </Link>
                    </td>

                    {/* Name */}
                    <td className="px-5 py-4 sm:px-6">
                      {editingId === b.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            className={dashboardInputClass(
                              false,
                              "w-40 py-1.5 text-sm",
                            )}
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveName(b.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            className="h-6 px-1.5"
                            onClick={() => handleSaveName(b.id)}
                            disabled={savingId === b.id}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{b.batchName ?? "—"}</span>
                          {canAct && (
                            <button
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingId(b.id);
                                setEditDraft(b.batchName ?? "");
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Supplier */}
                    <td className="px-5 py-4 text-muted-foreground sm:px-6">
                      {b.supplierName ?? "—"}
                    </td>

                    {/* Items */}
                    <td className="hidden md:table-cell px-5 py-4 text-right tabular-nums text-muted-foreground sm:px-6">
                      {b.itemCount}
                    </td>

                    {/* Sold % */}
                    <td className="px-5 py-4 text-right sm:px-6">
                      {soldBar(b.soldPercentage)}
                    </td>

                    {/* Cost */}
                    <td className="hidden lg:table-cell px-5 py-4 text-right font-mono tabular-nums sm:px-6">
                      {formatMoneyShort(b.totalCost)}
                    </td>

                    {/* Revenue */}
                    <td className="px-5 py-4 text-right font-mono tabular-nums font-medium text-emerald-700 dark:text-emerald-300 sm:px-6">
                      {formatMoneyShort(b.totalRevenue)}
                    </td>

                    {/* Extras */}
                    <td className="hidden lg:table-cell px-5 py-4 text-right font-mono tabular-nums text-muted-foreground sm:px-6">
                      {formatMoneyShort(b.totalAssociatedCosts)}
                    </td>

                    {/* Left */}
                    <td className="hidden md:table-cell px-5 py-4 text-right tabular-nums sm:px-6">
                      <span
                        className={cn(
                          Number(b.totalRemainingQuantity) <= 0
                            ? "text-muted-foreground"
                            : "font-medium",
                        )}
                      >
                        {formatQty(b.totalRemainingQuantity)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 sm:px-6">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          st.className,
                        )}
                      >
                        {st.label}
                      </span>
                    </td>

                    {/* Received */}
                    <td className="hidden lg:table-cell px-5 py-4 text-xs text-muted-foreground sm:px-6">
                      {new Date(b.receivedAt).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right sm:px-6">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Link href={`/inventory/supply-batches/${b.id}`}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1"
                          >
                            <Eye className="size-3.5" />
                            View
                          </Button>
                        </Link>
                        {canAct && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => handleRecalculate(b.id)}
                            disabled={recalcId === b.id}
                          >
                            <Calculator
                              className={cn(
                                "size-3.5",
                                recalcId === b.id && "animate-spin",
                              )}
                            />
                            Recalc
                          </Button>
                        )}
                        {canAct && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-rose-600 hover:text-rose-700"
                            onClick={() =>
                              setClearDialog({
                                id: b.id,
                                batchNumber: b.batchNumber,
                                hasRemaining: !(
                                  isSoldout ||
                                  Number(b.totalRemainingQuantity) === 0
                                ),
                              })
                            }
                          >
                            <XOctagon className="size-3.5" />
                            {isSoldout || Number(b.totalRemainingQuantity) === 0
                              ? "Close"
                              : "Clear"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ── Mobile card layout (< sm breakpoint) ───────────────── */}
        <div className="flex flex-col gap-3 sm:hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading supply batches…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {hasFilters
                ? "No supply batches match your filters."
                : "No supply batches found. Create your first supply batch from the Purchasing → Supplies page."}
            </div>
          ) : (
            filtered.map((b) => {
              const isClosed = b.status?.toLowerCase() === "closed";
              const isSoldout =
                b.status?.toLowerCase() === "soldout" ||
                b.status?.toLowerCase() === "sold_out";
              const canAct = canWrite && !isClosed;
              const st = statusBadge(b.status);

              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-border/60 bg-card p-4 shadow-sm"
                >
                  {/* Top row: Batch # + Status badge */}
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/inventory/supply-batches/${b.id}`}
                      className="font-medium text-foreground hover:text-primary decoration-1 underline-offset-4 hover:underline"
                    >
                      {b.batchNumber}
                    </Link>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        st.className,
                      )}
                    >
                      {st.label}
                    </span>
                  </div>

                  {/* Second row: Supplier */}
                  <div className="mt-2 text-sm text-muted-foreground">
                    {b.supplierName ?? "—"}
                  </div>

                  {/* Third row: Revenue | Sold % */}
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="font-mono tabular-nums font-medium text-emerald-700 dark:text-emerald-300">
                      KES {formatMoneyShort(b.totalRevenue)}
                    </span>
                    {soldBar(b.soldPercentage)}
                  </div>

                  {/* Fourth row: Action buttons */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Link href={`/inventory/supply-batches/${b.id}`}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1"
                      >
                        <Eye className="size-3.5" />
                        View
                      </Button>
                    </Link>
                    {canAct && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => handleRecalculate(b.id)}
                        disabled={recalcId === b.id}
                      >
                        <Calculator
                          className={cn(
                            "size-3.5",
                            recalcId === b.id && "animate-spin",
                          )}
                        />
                        Recalc
                      </Button>
                    )}
                    {canAct && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-rose-600 hover:text-rose-700"
                        onClick={() =>
                          setClearDialog({
                            id: b.id,
                            batchNumber: b.batchNumber,
                            hasRemaining: !(
                              isSoldout ||
                              Number(b.totalRemainingQuantity) === 0
                            ),
                          })
                        }
                      >
                        <XOctagon className="size-3.5" />
                        {isSoldout || Number(b.totalRemainingQuantity) === 0
                          ? "Close"
                          : "Clear"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── Clear confirmation dialog ────────────────────────────────── */}
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
                  <span className={dashboardFilterFieldLabelClass()}>
                    Notes
                  </span>
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
