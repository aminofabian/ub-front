"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  ClipboardList,
  Layers,
  Package,
  PackageX,
  RefreshCw,
  Warehouse,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { AdjustItemCostDialog } from "@/components/inventory/adjust-item-cost-dialog";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchBranches,
  fetchCostIssues,
  type BranchRecord,
  type CostIssueRowRecord,
  type CostIssuesResponseRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { filterInventoryQuickLinksForUser } from "@/lib/inventory-access";
import { cn } from "@/lib/utils";

type IssueFilter = "all" | "zero_cost" | "sells_at_loss" | "thin_margin";

function toNum(n: number | string | null | undefined): number | null {
  if (n == null || n === "") return null;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : null;
}

function fmtMoney(n: number | null, currency: string): string {
  if (n == null) return "—";
  try {
    return n.toLocaleString(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return n.toFixed(2);
  }
}

function fmtQty(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const ISSUE_META: Record<
  Exclude<IssueFilter, "all">,
  { label: string; className: string }
> = {
  zero_cost: {
    label: "No cost",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  sells_at_loss: {
    label: "Sells at loss",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  thin_margin: {
    label: "Thin margin",
    className: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
};

export default function InventoryCostIssuesPage() {
  const { me, business, setBranchId: setHeaderBranchId } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.PricingRead);
  const canAdjust = hasPermission(me?.permissions, Permission.PricingCostPriceSet);
  const currency = business?.currency?.trim() || "KES";

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked: isBranchLockedRole } = useSyncBranchFilter({
    value: branchFilter,
    setValue: setBranchFilter,
    availableIds: branches.length > 0 ? branchIds : undefined,
    allowAll: true,
  });

  const [data, setData] = useState<CostIssuesResponseRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [issueFilter, setIssueFilter] = useState<IssueFilter>("all");
  const [inStockOnly, setInStockOnly] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<CostIssueRowRecord | null>(null);

  const onChangeBranch = useCallback(
    (id: string) => {
      setBranchFilter(id);
      if (!isBranchLockedRole && id.trim()) setHeaderBranchId(id.trim());
    },
    [isBranchLockedRole, setHeaderBranchId],
  );

  const runLoad = useCallback(async (branchId: string) => {
    setMessage("");
    setLoading(true);
    try {
      const row = await fetchCostIssues(branchId.trim() || undefined);
      setData(row);
    } catch (error) {
      setData(null);
      setMessage(
        error instanceof Error ? error.message : "Failed to load cost issues.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
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
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    if (isBranchLockedRole && !me?.branchId?.trim()) return;
    void runLoad(branchFilter);
  }, [allowed, branchFilter, isBranchLockedRole, me?.branchId, runLoad]);

  const activeBranchName = useMemo(() => {
    if (!branchFilter) return "All branches";
    return (
      branches.find((b) => b.id === branchFilter)?.name?.trim() || branchFilter
    );
  }, [branchFilter, branches]);

  const rows = useMemo(() => {
    let list = data?.items ?? [];
    if (issueFilter !== "all") {
      list = list.filter((r) => r.primaryIssue === issueFilter);
    }
    if (inStockOnly) {
      list = list.filter((r) => (toNum(r.activeQty) ?? 0) > 0);
    }
    return list;
  }, [data, issueFilter, inStockOnly]);

  const quickLinks = useMemo(
    () =>
      filterInventoryQuickLinksForUser(me, [
        {
          href: APP_ROUTES.inventoryValuation,
          label: "Valuation",
          desc: "Extension value",
          icon: BarChart3,
        },
        {
          href: APP_ROUTES.inventorySupplyBatches,
          label: "Supply batches",
          desc: "Cost layers",
          icon: Layers,
        },
        {
          href: APP_ROUTES.inventoryStock,
          label: "Stock",
          desc: "On-hand",
          icon: Warehouse,
        },
        {
          href: APP_ROUTES.inventoryRestock,
          label: "Out of stock",
          desc: "Restock",
          icon: PackageX,
        },
        {
          href: APP_ROUTES.inventoryStockTake,
          label: "Stock take",
          desc: "Counts",
          icon: ClipboardList,
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
      ]),
    [me],
  );

  const openAdjust = useCallback((row: CostIssueRowRecord) => {
    setActiveRow(row);
    setDialogOpen(true);
  }, []);

  const onSaved = useCallback((updated: CostIssueRowRecord) => {
    setData((prev) => {
      if (!prev) return prev;
      const stillAnIssue =
        updated.zeroCost || updated.sellsAtLoss || updated.thinMargin;
      const items = stillAnIssue
        ? prev.items.map((r) => (r.itemId === updated.itemId ? updated : r))
        : prev.items.filter((r) => r.itemId !== updated.itemId);
      return recount({ ...prev, items });
    });
  }, []);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Cost issues"
        description={
          <>
            You do not have permission to review item costs. Ask an
            administrator to grant{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              {Permission.PricingRead}
            </code>
            .
          </>
        }
        backHref={APP_ROUTES.inventoryValuation}
        backLabel="Valuation"
      />
    );
  }

  const counts = data
    ? [
        { key: "all" as const, label: "All", value: data.total },
        { key: "zero_cost" as const, label: "No cost", value: data.zeroCostCount },
        {
          key: "sells_at_loss" as const,
          label: "Sells at loss",
          value: data.sellsAtLossCount,
        },
        {
          key: "thin_margin" as const,
          label: "Thin margin",
          value: data.thinMarginCount,
        },
      ]
    : [];

  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-4">
        <header className="space-y-2 border-b border-border/50 pb-4">
          <DashboardPageHero
            compact
            showActiveScope
            icon={AlertTriangle}
            eyebrow="Inventory"
            title="Cost issues"
            description="Items with missing cost, cost above the sell price, or a thin margin. Fix the cost to correct future profit."
          />
          {quickLinks.length > 0 ? (
            <DashboardQuickLinks compact links={quickLinks} />
          ) : null}
        </header>

        <div className="space-y-2.5 rounded-xl border border-border/60 bg-muted/15 p-3">
          {counts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {counts.map((c) => {
                const active = issueFilter === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setIssueFilter(c.key)}
                    className={cn(
                      "flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors sm:px-3",
                      active
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/60 bg-background hover:bg-muted/40",
                    )}
                  >
                    <span className="truncate text-[11px] font-medium text-muted-foreground">
                      {c.label}
                    </span>
                    <span className="shrink-0 text-base font-bold tabular-nums leading-none">
                      {c.value.toLocaleString("en-KE")}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5 text-xs sm:max-w-[14rem]">
              <span className="text-muted-foreground">Branch</span>
              <select
                className={cn(
                  dashboardSelectClass(),
                  "h-9 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60",
                )}
                value={branchFilter}
                disabled={isBranchLockedRole}
                onChange={(event) => onChangeBranch(event.target.value)}
                aria-label="Branch filter"
              >
                {isBranchLockedRole ? null : (
                  <option value="">All branches</option>
                )}
                {branches
                  .filter((b) => b.active)
                  .filter((b) => !isBranchLockedRole || b.id === me?.branchId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="flex h-9 items-center gap-2 rounded-lg border border-border/60 bg-background px-3 text-xs font-medium text-muted-foreground">
              <input
                type="checkbox"
                className="size-3.5 accent-[#B08D48]"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
              />
              In stock only
            </label>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5"
              disabled={loading || (isBranchLockedRole && !me?.branchId?.trim())}
              onClick={() => void runLoad(branchFilter)}
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              {loading ? "…" : "Refresh"}
            </Button>
          </div>
        </div>

        {message ? (
          <p className="text-xs text-destructive">{message}</p>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
            <h2 className="text-xs font-semibold sm:text-sm">
              {loading ? "Loading…" : `Flagged items · ${activeBranchName}`}
            </h2>
            {data && !loading ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                {rows.length} shown
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="border-b border-border/60 bg-background text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 text-right font-medium">Stock</th>
                  <th className="px-3 py-2 text-right font-medium">Cost</th>
                  <th className="px-3 py-2 text-right font-medium">Sell</th>
                  <th className="px-3 py-2 text-right font-medium">Margin</th>
                  <th className="px-3 py-2 font-medium">Issue</th>
                  <th className="px-3 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : !data ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      Refresh to load cost issues.
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      {data.total === 0
                        ? "No cost issues. Every stocked item has a sensible cost."
                        : "No items match this filter."}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const cost = toNum(row.effectiveCost);
                    const sell = toNum(row.sellPrice);
                    const margin = toNum(row.marginPct);
                    const meta = ISSUE_META[row.primaryIssue];
                    return (
                      <tr key={row.itemId} className="hover:bg-muted/20">
                        <td className="px-3 py-2">
                          <div className="max-w-[16rem] truncate text-sm font-medium">
                            {row.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {row.sku}
                            {row.costSource === "reference"
                              ? " · reference cost"
                              : row.costSource === "none"
                                ? " · no cost set"
                                : ""}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {fmtQty(toNum(row.activeQty))}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {cost == null || cost <= 0 ? (
                            <span className="text-rose-600">—</span>
                          ) : (
                            fmtMoney(cost, currency)
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {fmtMoney(sell, currency)}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2 text-right tabular-nums",
                            margin != null && margin < 0
                              ? "text-rose-600"
                              : margin != null && margin < 5
                                ? "text-amber-600"
                                : "",
                          )}
                        >
                          {margin == null ? "—" : `${margin.toFixed(1)}%`}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              meta.className,
                            )}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {canAdjust ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => openAdjust(row)}
                            >
                              Fix cost
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              View only
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AdjustItemCostDialog
        open={dialogOpen}
        row={activeRow}
        branchId={branchFilter.trim() || undefined}
        branchLabel={branchFilter ? activeBranchName : undefined}
        currency={currency}
        onOpenChange={setDialogOpen}
        onSaved={onSaved}
      />
    </div>
  );
}

function recount(data: CostIssuesResponseRecord): CostIssuesResponseRecord {
  let zero = 0;
  let loss = 0;
  let thin = 0;
  for (const r of data.items) {
    if (r.primaryIssue === "zero_cost") zero++;
    else if (r.primaryIssue === "sells_at_loss") loss++;
    else if (r.primaryIssue === "thin_margin") thin++;
  }
  return {
    ...data,
    total: data.items.length,
    zeroCostCount: zero,
    sellsAtLossCount: loss,
    thinMarginCount: thin,
  };
}
