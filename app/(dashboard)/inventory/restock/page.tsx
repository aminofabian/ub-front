"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, PackageX } from "lucide-react";
import { toast } from "sonner";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchBranches,
  fetchItemsPage,
  postStockIncrease,
  type BranchRecord,
  type ItemSummaryRecord,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";
import {
  canEditStockLevels,
  canViewStockLevels,
} from "@/lib/inventory-access";
import { cn } from "@/lib/utils";

import { RestockPageHeader } from "./_components/restock-page-header";
import { RestockRowItem, type RestockRow } from "./_components/restock-row-item";

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

function RestockListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2 border-b border-border/60 px-2.5 py-1.5 last:border-0 sm:px-3"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-2 w-20 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-1">
            <div className="h-8 w-[3.25rem] animate-pulse rounded-md bg-muted" />
            <div className="h-8 w-[3.25rem] animate-pulse rounded-md bg-muted" />
            <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InventoryRestockPage() {
  const { me, business, branches: dashboardBranches } = useDashboard();
  const canRead = canViewStockLevels(me, business);
  const canWrite = canEditStockLevels(me, business);

  const [branches, setBranches] = useState<BranchRecord[]>(
    dashboardBranches ?? [],
  );
  const [branchId, setBranchId] = useState("");
  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  // Follow the global header branch selection (and stay pinned for locked roles).
  const { branchLocked: isBranchLockedRole } = useSyncBranchFilter({
    value: branchId,
    setValue: setBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
  });
  const canShowQuickLinks = !isBranchLockedRole;
  const [rows, setRows] = useState<RestockRow[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"error" | "warning">("error");
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
        if (!cancelled) {
          setMessageKind("error");
          setMessage("Failed to load branches.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canRead]);

  // When the header has no branch yet (non-locked role, nothing persisted),
  // fall back to the first active branch on this page so it isn't blank.
  useEffect(() => {
    if (isBranchLockedRole || branchId || branches.length === 0) return;
    const fallback =
      branches.find((b) => b.active)?.id || branches[0]?.id || "";
    if (fallback) setBranchId(fallback);
  }, [isBranchLockedRole, branchId, branches]);

  const loadOutOfStock = useCallback(async () => {
    const bid = branchId.trim();
    if (!bid) {
      setMessageKind("warning");
      setMessage(
        isBranchLockedRole
          ? "Your account is not assigned to a branch. Contact your administrator."
          : "Select a branch first.",
      );
      return;
    }
    setLoading(true);
    setMessage(null);
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
        setMessageKind("warning");
        setMessage("Nothing is out of stock at this branch.");
      }
    } catch (e) {
      setRows([]);
      setMessageKind("error");
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

  const activeBranchName =
    branches.find((b) => b.id === branchId)?.name?.trim() || "";

  const emptyMessage = useMemo(() => {
    if (loading) return null;
    if (!branchId.trim()) {
      return isBranchLockedRole
        ? "Your account is not assigned to a branch."
        : "Choose a branch to see out-of-stock products.";
    }
    if (!loaded) return "Loading products…";
    if (rows.length === 0) return "No out-of-stock products at this branch.";
    if (search.trim()) return "No products match your search.";
    return null;
  }, [loading, branchId, isBranchLockedRole, loaded, rows.length, search]);

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

  return (
    <div
      className={cn(
        DASHBOARD_MAX,
        "min-w-0 max-w-full space-y-2 overflow-x-hidden pb-12",
      )}
    >
      <RestockPageHeader
        me={me}
        canShowQuickLinks={canShowQuickLinks}
        loading={loading}
        onRefresh={() => void loadOutOfStock()}
      />

      {/* Toolbar */}
      <section className="flex min-w-0 flex-wrap items-center gap-2">
        {(loaded || loading) && branchId ? (
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-destructive/25 bg-destructive/5 px-2 py-1 text-[11px] font-medium tabular-nums"
            aria-live="polite"
          >
            <span className="text-muted-foreground">Out</span>
            <span className="font-bold text-destructive">
              {rows.length.toLocaleString("en-KE")}
            </span>
          </span>
        ) : null}

        {!isBranchLockedRole ? (
          <select
            className={cn(
              dashboardSelectClass(),
              "h-8 min-w-[7.5rem] max-w-[9rem] shrink-0 py-1 text-xs sm:text-sm",
            )}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            aria-label="Branch"
          >
            <option value="">Branch…</option>
            {branches
              .filter((b) => b.active || b.id === branchId)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        ) : activeBranchName ? (
          <span className="shrink-0 truncate text-[11px] text-muted-foreground">
            {activeBranchName}
          </span>
        ) : null}

        <input
          type="search"
          className={cn(
            dashboardInputClass(),
            "h-8 min-w-0 flex-1 py-1 text-xs sm:text-sm",
          )}
          placeholder="Search name, SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={!branchId.trim()}
          aria-label="Search out-of-stock products"
        />
      </section>

      {message ? (
        <DashboardFeedback kind={messageKind} text={message} />
      ) : null}
      {capped ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          Scanned first {MAX_SCAN_PAGES * PAGE_SIZE} products — search for more.
        </p>
      ) : null}
      {!canWrite && rows.length > 0 ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          View-only — enable stock editing in Business settings to restock.
        </p>
      ) : null}

      {/* Product list */}
      {!branchId.trim() ? (
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-6 text-center">
          <Package className="size-6 text-muted-foreground/40" aria-hidden />
          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : loading && !loaded ? (
        <RestockListSkeleton />
      ) : (
        <div className="min-w-0 overflow-hidden rounded-lg border border-border/60">
          {filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-6 text-center">
              <PackageX
                className="size-6 text-muted-foreground/40"
                aria-hidden
              />
              <p className="text-xs text-muted-foreground">
                {emptyMessage ?? "No products to show."}
              </p>
            </div>
          ) : (
            <>
              {search.trim() && filteredRows.length !== rows.length ? (
                <div className="border-b border-border/60 bg-muted/25 px-2.5 py-1 text-[10px] text-muted-foreground sm:px-3">
                  {filteredRows.length} of {rows.length} match
                </div>
              ) : null}
              <div className="divide-y divide-border/60 bg-card">
                {filteredRows.map((r) => (
                  <RestockRowItem
                    key={r.item.id}
                    row={r}
                    canWrite={canWrite}
                    onQtyChange={(value) =>
                      setRowField(r.item.id, "qty", value)
                    }
                    onCostChange={(value) =>
                      setRowField(r.item.id, "cost", value)
                    }
                    onSave={() => void saveRow(r.item.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
