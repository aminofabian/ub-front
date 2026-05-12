"use client";

import { useCallback } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";
import type { BatchTableRow } from "@/lib/api";

function formatQty(v: number | string): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatMoney(v: number | string): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusBadge(status: string) {
  const s = status?.toLowerCase() ?? "";
  if (s === "active")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Active
      </span>
    );
  if (s === "depleted")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        <Package className="h-3 w-3" /> Depleted
      </span>
    );
  if (s === "closed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        <XCircle className="h-3 w-3" /> Closed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
      {status}
    </span>
  );
}

function qtyIndicator(qty: number | string, initial: number | string) {
  const q = typeof qty === "number" ? qty : Number(qty);
  const i = typeof initial === "number" ? initial : Number(initial);
  if (q <= 0)
    return (
      <span className="inline-flex items-center gap-1 text-rose-600">
        <XCircle className="h-3 w-3" /> {formatQty(q)}
      </span>
    );
  if (i > 0 && q / i < 0.2)
    return (
      <span className="inline-flex items-center gap-1 text-amber-600">
        <AlertTriangle className="h-3 w-3" /> {formatQty(q)}
      </span>
    );
  return <span className="text-emerald-600">{formatQty(q)}</span>;
}

export type BatchTableProps = {
  rows: BatchTableRow[];
  total: number;
  page: number;
  size: number;
  sortBy: string;
  sortDir: string;
  onSort: (col: string) => void;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  loading: boolean;
};

export function BatchTable({
  rows,
  total,
  page,
  size,
  sortBy,
  sortDir,
  onSort,
  onPageChange,
  onSizeChange,
  loading,
}: BatchTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const start = page * size + 1;
  const end = Math.min((page + 1) * size, total);

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
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
      scope="col"
      className={cn(
        "cursor-pointer select-none px-5 py-3.5 text-left font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/40 sm:px-6",
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

  const exportCSV = useCallback(() => {
    const headers = [
      "Batch #",
      "Item",
      "SKU",
      "Category",
      "Initial Qty",
      "Remaining",
      "Unit Cost",
      "Total Value",
      "Expiry",
      "Status",
      "Received",
      "Supplier",
    ];
    const lines = rows.map((r) => [
      r.batchNumber,
      r.itemName,
      r.itemSku,
      r.categoryName,
      r.initialQuantity,
      r.quantityRemaining,
      r.unitCost,
      r.totalValue,
      r.expiryDate ?? "",
      r.status,
      r.receivedAt,
      r.supplierName,
    ]);
    const csv = [headers, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batches-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows]);

  return (
    <div className={DASHBOARD_TABLE_SURFACE}>
      <div className={DASHBOARD_TABLE_HEAD}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Showing <strong className="text-foreground">{total > 0 ? start : 0}–{end}</strong> of{" "}
            <strong className="text-foreground">{total}</strong> batches
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="shadow-sm" onClick={exportCSV}>
              <Download className="mr-1 h-3.5 w-3.5" />
              Export CSV
            </Button>
            <select
              className={dashboardSelectClass(false, "h-9 min-w-[7.5rem] text-sm")}
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/50 bg-muted/25">
            <tr>
              <Th col="batchNumber">Batch #</Th>
              <Th col="itemName">Item</Th>
              <Th col="initialQuantity" align="right">Initial</Th>
              <Th col="quantityRemaining" align="right">Remaining</Th>
              <Th col="unitCost" align="right">Cost</Th>
              <Th col="totalValue" align="right">Value</Th>
              <Th col="expiryDate">Expiry</Th>
              <Th col="status">Status</Th>
              <Th col="receivedAt">Received</Th>
              <th
                scope="col"
                className="px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    Loading batches…
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No batches found. Try adjusting your filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-5 py-4 sm:px-6 font-medium">
                    <Link
                      href={`/inventory/supply-batches/${row.supplyBatchId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {row.batchNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-4 sm:px-6">
                    <div className="font-medium">{row.itemName}</div>
                    <div className="text-xs text-muted-foreground">{row.itemSku}</div>
                  </td>
                  <td className="px-5 py-4 sm:px-6 text-right tabular-nums">{formatQty(row.initialQuantity)}</td>
                  <td className="px-5 py-4 sm:px-6 text-right tabular-nums">
                    {qtyIndicator(row.quantityRemaining, row.initialQuantity)}
                  </td>
                  <td className="px-5 py-4 sm:px-6 text-right tabular-nums">{formatMoney(row.unitCost)}</td>
                  <td className="px-5 py-4 sm:px-6 text-right tabular-nums">{formatMoney(row.totalValue)}</td>
                  <td className="px-5 py-4 sm:px-6 text-xs">
                    {row.expiryDate ? (
                      <span
                        className={cn(
                          new Date(row.expiryDate) < new Date()
                            ? "text-rose-600"
                            : new Date(row.expiryDate) < new Date(Date.now() + 7 * 86400000)
                              ? "text-amber-600"
                              : "text-muted-foreground",
                        )}
                      >
                        {new Date(row.expiryDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 sm:px-6">{statusBadge(row.status)}</td>
                  <td className="px-5 py-4 sm:px-6 text-xs text-muted-foreground">
                    {row.receivedAt ? new Date(row.receivedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-4 sm:px-6 text-right">
                    <Link href={`/inventory/supply-batches/${row.supplyBatchId}`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border/50 px-5 py-4 sm:px-6">
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
          Page <strong className="text-foreground">{page + 1}</strong> of {totalPages}
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
