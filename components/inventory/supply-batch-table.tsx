"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Calculator,
  XOctagon,
  Pencil,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  DollarSign,
  TrendingUp,
  Receipt,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SupplyBatchSummaryRecord } from "@/lib/api";

function formatQty(v: number | string): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatMoney(v: number | string): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return (
    "KES " +
    n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatMoneyShort(v: number | string): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  if (n >= 1_000_000) return "KES " + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "KES " + (n / 1_000).toFixed(1) + "k";
  return "KES " + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function statusBadge(status: string) {
  const s = status?.toLowerCase() ?? "";
  if (s === "active")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        ● Active
      </span>
    );
  if (s === "soldout" || s === "sold_out" || s === "sold out")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        ✅ Sold out
      </span>
    );
  if (s === "clearing")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        ⏳ Clearing
      </span>
    );
  if (s === "closed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        🔴 Closed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
      {status}
    </span>
  );
}

function soldBar(pct: number): React.ReactNode {
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {pct}%
      </span>
    </div>
  );
}

export type SupplyBatchTableProps = {
  batches: SupplyBatchSummaryRecord[];
  total: number;
  page: number;
  size: number;
  sortBy: string;
  sortDir: string;
  onSort: (col: string) => void;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  loading: boolean;
  canWrite: boolean;
  onRecalculate: (id: string) => Promise<void>;
  onClear: (id: string, batchNumber: string, hasRemaining: boolean) => void;
  onRename: (id: string, name: string) => Promise<void>;
};

export function SupplyBatchTable({
  batches,
  total,
  page,
  size,
  sortBy,
  sortDir,
  onSort,
  onPageChange,
  onSizeChange,
  loading,
  canWrite,
  onRecalculate,
  onClear,
  onRename,
}: SupplyBatchTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const start = total > 0 ? page * size + 1 : 0;
  const end = Math.min((page + 1) * size, total);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [recalcId, setRecalcId] = useState<string | null>(null);

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col)
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-primary" />
    );
  };

  const Th = ({
    col,
    children,
    align = "left",
  }: {
    col: string;
    children: React.ReactNode;
    align?: "left" | "right";
  }) => (
    <th
      className={cn(
        "cursor-pointer select-none px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/60",
        align === "right" && "text-right",
      )}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center">
        {children}
        <SortIcon col={col} />
      </span>
    </th>
  );

  const handleSaveName = async (id: string) => {
    setSavingId(id);
    try {
      await onRename(id, editDraft.trim());
      setEditingId(null);
    } finally {
      setSavingId(null);
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
    const lines = batches.map((b) => [
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
  }, [batches]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          <strong className="text-foreground">
            {start}–{end}
          </strong>{" "}
          of <strong className="text-foreground">{total}</strong> supply batches
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-1 h-3.5 w-3.5" />
            Export CSV
          </Button>
          <select
            className="rounded-lg border bg-background px-2 py-1.5 text-sm"
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur">
            <tr className="border-b">
              <Th col="batchNumber">Batch #</Th>
              <Th col="batchName">Name</Th>
              <Th col="supplierName">Supplier</Th>
              <Th col="itemCount" align="right">
                Items
              </Th>
              <Th col="soldPercentage" align="right">
                Sold
              </Th>
              <Th col="totalCost" align="right">
                Cost
              </Th>
              <Th col="totalRevenue" align="right">
                Revenue
              </Th>
              <Th col="totalAssociatedCosts" align="right">
                Extras
              </Th>
              <Th col="totalRemainingQuantity" align="right">
                Left
              </Th>
              <Th col="status">Status</Th>
              <Th col="receivedAt">Received</Th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-3 py-12 text-center text-muted-foreground"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    Loading supply batches…
                  </div>
                </td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-3 py-12 text-center text-muted-foreground"
                >
                  No supply batches found.
                </td>
              </tr>
            ) : (
              batches.map((b) => {
                const isClosed = b.status?.toLowerCase() === "closed";
                const isSoldout = b.status?.toLowerCase() === "soldout";
                const canAct = canWrite && !isClosed;
                const revenue = Number(b.totalRevenue);
                const cost = Number(b.totalCost);
                const profit = revenue - cost - Number(b.totalAssociatedCosts);
                return (
                  <tr
                    key={b.id}
                    className="border-b last:border-0 transition-colors hover:bg-muted/40"
                  >
                    <td className="px-3 py-2.5 font-medium">
                      <Link
                        href={`/inventory/supply-batches/${b.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {b.batchNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      {editingId === b.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            className="w-40 rounded border bg-background px-2 py-1 text-sm"
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
                            <Check className="h-3 w-3" />
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
                    <td className="px-3 py-2.5 text-sm text-muted-foreground">
                      {b.supplierName ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {b.itemCount}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {soldBar(b.soldPercentage)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                      {formatMoneyShort(b.totalCost)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium text-emerald-600">
                      {formatMoneyShort(b.totalRevenue)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                      {formatMoneyShort(b.totalAssociatedCosts)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatQty(b.totalRemainingQuantity)}
                    </td>
                    <td className="px-3 py-2.5">{statusBadge(b.status)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {new Date(b.receivedAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/inventory/supply-batches/${b.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-1.5"
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        {canAct && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-1.5"
                            title="Recalculate"
                            onClick={async () => {
                              setRecalcId(b.id);
                              try {
                                await onRecalculate(b.id);
                              } finally {
                                setRecalcId(null);
                              }
                            }}
                            disabled={recalcId === b.id}
                          >
                            <Calculator
                              className={`h-3.5 w-3.5 ${recalcId === b.id ? "animate-spin" : ""}`}
                            />
                          </Button>
                        )}
                        {canAct && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-1.5 text-rose-600 hover:text-rose-700"
                            title={
                              isSoldout ||
                              Number(b.totalRemainingQuantity) === 0
                                ? "Close batch"
                                : "Clear batch"
                            }
                            onClick={() =>
                              onClear(
                                b.id,
                                b.batchNumber,
                                !(
                                  isSoldout ||
                                  Number(b.totalRemainingQuantity) === 0
                                ),
                              )
                            }
                          >
                            <XOctagon className="h-3.5 w-3.5" />
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
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 0 || loading}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page <strong className="text-foreground">{page + 1}</strong> of{" "}
          {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page + 1 >= totalPages || loading}
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
