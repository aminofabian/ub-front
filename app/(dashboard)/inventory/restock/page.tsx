"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PackageX, RefreshCw, Package, ClipboardList, Search, Warehouse, Layers, BarChart3, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchBranches,
  fetchItemsPage,
  postStockIncrease,
  type BranchRecord,
  type ItemSummaryRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

/** Stop paging the catalog after this many rows so very large catalogs can't
 *  hang the page. The notice tells the user if the cap was hit. */
const MAX_SCAN_PAGES = 40;
const PAGE_SIZE = 100;

function toNum(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** On-hand at the selected branch. Package variants derive stock from a parent,
 *  so they're excluded from this screen (restock the base SKU instead). */
function onHandOf(row: ItemSummaryRecord): number {
  return toNum(row.stockQty) ?? 0;
}

type RestockRow = {
  item: ItemSummaryRecord;
  qty: string;
  cost: string;
  saving: boolean;
};

export default function InventoryRestockPage() {
  const { me, branchId: headerBranchId, branches: dashboardBranches } =
    useDashboard();
  const canRead = hasPermission(me?.permissions, Permission.InventoryRead);
  const canWrite = hasPermission(me?.permissions, Permission.InventoryWrite);

  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  const isBranchLockedRole =
    roleKey === "stock_manager" || roleKey === "cashier";

  const [branches, setBranches] = useState<BranchRecord[]>(
    dashboardBranches ?? [],
  );
  const [branchId, setBranchId] = useState("");
  const [rows, setRows] = useState<RestockRow[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [capped, setCapped] = useState(false);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    fetchBranches()
      .then((list) => {
        if (!cancelled) setBranches(list);
      })
      .catch(() => {
        if (!cancelled) setMessage("Failed to load branches.");
      });
    return () => {
      cancelled = true;
    };
  }, [canRead]);

  // Resolve the working branch: assigned branch for locked roles, otherwise the
  // header branch, otherwise the first active branch.
  useEffect(() => {
    if (isBranchLockedRole) {
      setBranchId(me?.branchId?.trim() ?? "");
      return;
    }
    if (branchId) return;
    const fallback =
      headerBranchId?.trim() ||
      branches.find((b) => b.active)?.id ||
      branches[0]?.id ||
      "";
    if (fallback) setBranchId(fallback);
  }, [isBranchLockedRole, me?.branchId, headerBranchId, branches, branchId]);

  const loadOutOfStock = useCallback(async () => {
    const bid = branchId.trim();
    if (!bid) {
      setMessage(
        isBranchLockedRole
          ? "Your account is not assigned to a branch. Contact your administrator."
          : "Select a branch first.",
      );
      return;
    }
    setLoading(true);
    setMessage("");
    setCapped(false);
    try {
      const found: ItemSummaryRecord[] = [];
      let page = 0;
      let hitCap = false;
      for (;;) {
        const res = await fetchItemsPage(undefined, {
          branchId: bid,
          catalogScope: "SKUS_ONLY",
          page,
          size: PAGE_SIZE,
        });
        for (const item of res.content) {
          if (item.packageVariant) continue;
          if (onHandOf(item) <= 0) found.push(item);
        }
        if (res.last || res.content.length === 0) break;
        page += 1;
        if (page >= MAX_SCAN_PAGES) {
          hitCap = true;
          break;
        }
      }
      found.sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "", undefined, {
          sensitivity: "base",
        }),
      );
      setCapped(hitCap);
      setRows(
        found.map((item) => ({ item, qty: "", cost: "", saving: false })),
      );
      setLoaded(true);
      if (found.length === 0) {
        setMessage("Nothing is out of stock at this branch.");
      }
    } catch (e) {
      setRows([]);
      setMessage(
        e instanceof Error ? e.message : "Failed to load products.",
      );
    } finally {
      setLoading(false);
    }
  }, [branchId, isBranchLockedRole]);

  // Auto-load whenever the working branch resolves/changes.
  useEffect(() => {
    if (!canRead || !branchId.trim()) return;
    void loadOutOfStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead, branchId]);

  const setRowField = useCallback(
    (id: string, field: "qty" | "cost", value: string) => {
      setRows((prev) =>
        prev.map((r) => (r.item.id === id ? { ...r, [field]: value } : r)),
      );
    },
    [],
  );

  const saveRow = useCallback(
    async (id: string) => {
      if (!canWrite) {
        toast.error("You do not have permission to adjust stock.");
        return;
      }
      const bid = branchId.trim();
      const target = rows.find((r) => r.item.id === id);
      if (!target || !bid) return;

      const qty = Number(target.qty.trim());
      if (!Number.isFinite(qty) || qty <= 0) {
        toast.error("Enter a quantity greater than zero.");
        return;
      }
      const costRaw = target.cost.trim();
      const unitCost = costRaw === "" ? 0 : Number(costRaw);
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        toast.error("Unit cost must be a valid non-negative number.");
        return;
      }

      setRows((prev) =>
        prev.map((r) => (r.item.id === id ? { ...r, saving: true } : r)),
      );
      try {
        await postStockIncrease({
          branchId: bid,
          itemId: id,
          quantity: qty,
          unitCost,
          notes: "Restock from out-of-stock list",
        });
        toast.success(`${target.item.name ?? "Product"} set to ${qty}.`);
        setRows((prev) => prev.filter((r) => r.item.id !== id));
      } catch (e) {
        setRows((prev) =>
          prev.map((r) => (r.item.id === id ? { ...r, saving: false } : r)),
        );
        toast.error(
          e instanceof Error ? e.message : "Stock update failed.",
        );
      }
    },
    [canWrite, branchId, rows],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const i = r.item;
      return (
        (i.name ?? "").toLowerCase().includes(q) ||
        (i.sku ?? "").toLowerCase().includes(q) ||
        (i.barcode ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="Out of stock"
        description={
          <>
            You do not have permission to view inventory. Ask an administrator to
            grant{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              {Permission.InventoryRead}
            </code>
            .
          </>
        }
        backHref={APP_ROUTES.inventoryStock}
        backLabel="Stock"
      />
    );
  }

  const activeBranchName =
    branches.find((b) => b.id === branchId)?.name?.trim() || "";

  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-4">
        <header className="space-y-2 border-b border-border/50 pb-4">
          <DashboardPageHero
            compact
            icon={PackageX}
            eyebrow="Inventory"
            title="Out of stock"
            description="Zero on-hand at this branch — enter qty and save to restock."
          />
          <DashboardQuickLinks
            compact
            links={[
              {
                href: APP_ROUTES.inventoryStock,
                label: "Stock",
                desc: "On-hand",
                icon: Warehouse,
              },
              {
                href: APP_ROUTES.inventoryStockTake,
                label: "Stock take",
                desc: "Counts",
                icon: ClipboardList,
              },
              {
                href: APP_ROUTES.inventorySupplyBatches,
                label: "Supply batches",
                desc: "Cost layers",
                icon: Layers,
              },
              {
                href: APP_ROUTES.inventoryValuation,
                label: "Valuation",
                desc: "Extension value",
                icon: BarChart3,
              },
              {
                href: APP_ROUTES.inventoryTransfers,
                label: "Transfers",
                desc: "Move stock",
                icon: ArrowRightLeft,
              },
              {
                href: APP_ROUTES.products,
                label: "Products",
                desc: "Catalog",
                icon: Package,
              },
            ]}
          />
        </header>

        <div className="space-y-2.5 rounded-xl border border-border/60 bg-muted/15 p-3">
          {(loaded || loading) && branchId ? (
            <div
              className="flex items-center justify-between gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-2.5 py-2"
              aria-live="polite"
            >
              <span className="text-[11px] font-medium text-muted-foreground">
                Out of stock
              </span>
              <span className="text-base font-bold tabular-nums leading-none text-destructive">
                {rows.length.toLocaleString("en-KE")}
              </span>
            </div>
          ) : null}

          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5 text-xs sm:max-w-[11rem]">
              <span className="text-muted-foreground">Branch</span>
              <select
                className={cn(
                  dashboardSelectClass(),
                  "h-9 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60",
                )}
                value={branchId}
                disabled={isBranchLockedRole}
                onChange={(e) => setBranchId(e.target.value)}
                aria-label="Branch"
              >
                <option value="">Select branch…</option>
                {branches
                  .filter((b) => b.active || b.id === branchId)
                  .filter((b) => !isBranchLockedRole || b.id === me?.branchId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="flex min-w-[10rem] flex-[2] flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground">Search</span>
              <span className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  className={cn(
                    dashboardInputClass(),
                    "h-9 py-1.5 pl-8 text-sm",
                  )}
                  placeholder="Name, SKU, barcode…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search out-of-stock products"
                />
              </span>
            </label>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5"
              onClick={() => void loadOutOfStock()}
              disabled={loading || !branchId.trim()}
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              {loading ? "…" : "Refresh"}
            </Button>
          </div>
        </div>

        {message ? (
          <p className="text-xs text-muted-foreground">{message}</p>
        ) : null}
        {capped ? (
          <p className="text-xs text-muted-foreground">
            Scanned the first {MAX_SCAN_PAGES * PAGE_SIZE} products — use search
            to find a specific item.
          </p>
        ) : null}
        {!canWrite && rows.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            View-only — inventory write permission required to restock.
          </p>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
            <h2 className="text-xs font-semibold tracking-tight sm:text-sm">
              {filteredRows.length.toLocaleString("en-KE")} to restock
              {activeBranchName ? ` · ${activeBranchName}` : ""}
            </h2>
            {search.trim() && filteredRows.length !== rows.length ? (
              <span className="text-xs text-muted-foreground">
                {filteredRows.length} of {rows.length} match
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b border-border/60 bg-background text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-2 py-2 font-medium">SKU</th>
                  <th className="px-2 py-2 text-right font-medium">Qty</th>
                  <th className="px-2 py-2 text-right font-medium">Cost</th>
                  <th className="px-3 py-2 text-right font-medium" />
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-10 text-center text-sm text-muted-foreground"
                    >
                      {loading
                        ? "Loading products…"
                        : !loaded
                          ? "Select a branch and refresh to see out-of-stock products."
                          : rows.length === 0
                            ? "No out-of-stock products."
                            : "No products match your search."}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr
                      key={r.item.id}
                      className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-3 py-2">
                        <div className="text-sm font-medium text-foreground">
                          {r.item.name?.trim() || "Unnamed product"}
                          {r.item.variantName?.trim() ? (
                            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                              {r.item.variantName}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-2 font-mono text-[11px] text-muted-foreground">
                        {r.item.sku?.trim() || "—"}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          className="h-8 w-20 rounded-md border border-border bg-background px-2 text-right text-sm tabular-nums disabled:opacity-60"
                          placeholder="0"
                          value={r.qty}
                          disabled={!canWrite || r.saving}
                          onChange={(e) =>
                            setRowField(r.item.id, "qty", e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveRow(r.item.id);
                          }}
                          aria-label={`Quantity for ${r.item.name ?? "product"}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          className="h-8 w-20 rounded-md border border-border bg-background px-2 text-right text-sm tabular-nums disabled:opacity-60"
                          placeholder="opt."
                          value={r.cost}
                          disabled={!canWrite || r.saving}
                          onChange={(e) =>
                            setRowField(r.item.id, "cost", e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveRow(r.item.id);
                          }}
                          aria-label={`Unit cost for ${r.item.name ?? "product"}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => void saveRow(r.item.id)}
                          disabled={!canWrite || r.saving || !r.qty.trim()}
                        >
                          {r.saving ? "…" : "Save"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
