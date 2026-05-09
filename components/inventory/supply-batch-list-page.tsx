"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, ClipboardList, Package, Warehouse } from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardNotice,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchBranches,
  fetchSupplyBatches,
  fetchSuppliers,
  type BranchRecord,
  type SupplierRecord,
  type SupplyBatchSummaryRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function formatQty(v: number | string): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function statusBadge(status: string) {
  const s = status?.toLowerCase() ?? "";
  if (s === "active")
    return <span className="inline-flex items-center gap-1 text-emerald-600">● Active</span>;
  if (s === "soldout" || s === "sold_out" || s === "sold out")
    return <span className="inline-flex items-center gap-1 text-blue-600">✅ Sold out</span>;
  if (s === "partial")
    return <span className="inline-flex items-center gap-1 text-amber-600">⚠️ Partial</span>;
  if (s === "closed")
    return <span className="inline-flex items-center gap-1 text-muted-foreground">🔴 Closed</span>;
  return <span className="text-muted-foreground">{status}</span>;
}

export function SupplyBatchListPage() {
  const { me } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.InventoryRead);

  const [batches, setBatches] = useState<SupplyBatchSummaryRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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
      setMessage(error instanceof Error ? error.message : "Failed to load supply batches.");
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

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Supply batches"
        description={
          <>
            You do not have permission to view supply batches. Ask an administrator to grant{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{Permission.InventoryRead}</code>.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-8">
        <header className="space-y-4">
          <DashboardPageHero
            icon={Warehouse}
            eyebrow="Inventory"
            title="Supply batches"
            description="View and track all incoming deliveries and purchase batches."
          />
          <DashboardQuickLinks
            links={[
              { href: APP_ROUTES.inventoryValuation, label: "Valuation", desc: "Stock value", icon: Package },
              { href: APP_ROUTES.inventoryTransfers, label: "Transfers", desc: "Move stock", icon: ArrowRightLeft },
              { href: APP_ROUTES.inventoryStockTake, label: "Stock take", desc: "Counts", icon: ClipboardList },
            ]}
          />
        </header>

        <form
          className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/20 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <label className="flex min-w-[12rem] flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Branch</span>
            <select
              className="rounded border bg-background px-2 py-1.5"
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
          <label className="flex min-w-[12rem] flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Supplier</span>
            <select
              className="rounded border bg-background px-2 py-1.5"
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
          <label className="flex min-w-[10rem] flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Status</span>
            <select
              className="rounded border bg-background px-2 py-1.5"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="soldout">Sold out</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <Button type="submit" disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </form>

        {message ? <DashboardNotice text={message} /> : null}

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Batch #</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Supplier</th>
                <th className="px-3 py-2 text-right font-medium">Items</th>
                <th className="px-3 py-2 text-right font-medium">Remaining</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    {loading ? "Loading…" : "No supply batches found."}
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <Link
                        href={`/inventory/supply-batches/${b.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {b.batchNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {b.batchName ?? "—"}
                    </td>
                    <td className="px-3 py-2">{b.supplierName ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{b.itemCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatQty(b.totalRemainingQuantity)}
                    </td>
                    <td className="px-3 py-2">{statusBadge(b.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
