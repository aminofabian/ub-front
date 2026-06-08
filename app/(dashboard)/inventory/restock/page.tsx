"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PackageX, RefreshCw, Package, ClipboardList, Search } from "lucide-react";
import { toast } from "sonner";

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
        setMessage("Nothing is out of stock at this branch. 🎉");
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
      <div className="space-y-8">
        <header className="space-y-4">
          <DashboardPageHero
            icon={PackageX}
            eyebrow="Inventory"
            title="Out of stock"
            description={
              <>
                Every product with zero on-hand at the selected branch. Type the
                quantity you have and save — the figure becomes the new stock
                level.
              </>
            }
          />
          <DashboardQuickLinks
            links={[
              {
                href: APP_ROUTES.inventoryStock,
                label: "Stock",
                desc: "On-hand",
                icon: Package,
              },
              {
                href: APP_ROUTES.inventoryStockTake,
                label: "Stock take",
                desc: "Counts",
                icon: ClipboardList,
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

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
          <label className="flex min-w-[14rem] flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Branch</span>
            <select
              className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm disabled:opacity-60"
              value={branchId}
              disabled={isBranchLockedRole}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">Select a branch…</option>
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

          <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Search</span>
            <span className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-2.5 text-sm"
                placeholder="Filter by name, SKU, barcode…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </span>
          </label>

          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            onClick={() => void loadOutOfStock()}
            disabled={loading || !branchId.trim()}
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>

        {message ? <DashboardNotice text={message} /> : null}
        {capped ? (
          <DashboardNotice
            text={`Showing the first ${MAX_SCAN_PAGES * PAGE_SIZE} products scanned. Use search after refreshing to find a specific item.`}
          />
        ) : null}

        {!canWrite && rows.length > 0 ? (
          <DashboardNotice text="You can view out-of-stock products but need the inventory.write permission to update quantities." />
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border/60">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-4 py-2.5">
            <h2 className="text-sm font-semibold tracking-tight">
              {rows.length} out of stock
              {activeBranchName ? ` · ${activeBranchName}` : ""}
            </h2>
            {search.trim() && filteredRows.length !== rows.length ? (
              <span className="text-xs text-muted-foreground">
                {filteredRows.length} match{filteredRows.length === 1 ? "" : "es"}
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-border/60 bg-background text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Product</th>
                  <th className="px-3 py-2.5 font-medium">SKU</th>
                  <th className="px-3 py-2.5 text-right font-medium">New qty</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Unit cost
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted-foreground"
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
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-foreground">
                          {r.item.name?.trim() || "Unnamed product"}
                        </div>
                        {r.item.variantName?.trim() ? (
                          <div className="text-xs text-muted-foreground">
                            {r.item.variantName}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                        {r.item.sku?.trim() || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm tabular-nums disabled:opacity-60"
                          placeholder="0"
                          value={r.qty}
                          disabled={!canWrite || r.saving}
                          onChange={(e) =>
                            setRowField(r.item.id, "qty", e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveRow(r.item.id);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm tabular-nums disabled:opacity-60"
                          placeholder="opt."
                          value={r.cost}
                          disabled={!canWrite || r.saving}
                          onChange={(e) =>
                            setRowField(r.item.id, "cost", e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveRow(r.item.id);
                          }}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void saveRow(r.item.id)}
                          disabled={!canWrite || r.saving || !r.qty.trim()}
                        >
                          {r.saving ? "Saving…" : "Save"}
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
