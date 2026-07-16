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

import {
  supFieldLabel,
  supFilterRail,
  supInput,
  supKicker,
  supSelect,
  supTableCell,
  supTableHead,
  supTableRow,
  supWorkspaceShell,
} from "../../suppliers/_components/supplier-ui-tokens";

type IssueFilter =
  | "all"
  | "zero_cost"
  | "sells_at_loss"
  | "thin_margin"
  | "high_margin";

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
    className: "border-rose-600/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  sells_at_loss: {
    label: "Sells at loss",
    className: "border-rose-600/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  thin_margin: {
    label: "Thin margin",
    className: "border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  high_margin: {
    label: "High margin",
    className: "border-sky-600/30 bg-sky-500/10 text-sky-800 dark:text-sky-200",
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
        updated.zeroCost ||
        updated.sellsAtLoss ||
        updated.thinMargin ||
        updated.highMargin;
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
        {
          key: "high_margin" as const,
          label: "High margin",
          value: data.highMarginCount,
        },
      ]
    : [];

  return (
    <div className={DASHBOARD_MAX}>
      <div className="flex min-h-0 flex-col gap-0 overflow-hidden border border-border bg-card">
        <header className="space-y-2 border-b border-border px-3 py-3">
          <DashboardPageHero
            compact
            showActiveScope
            icon={AlertTriangle}
            eyebrow="Inventory"
            title="Cost issues"
            description="Items with missing cost, cost above the sell price, a thin margin, or an exaggerated margin above 50%. Fix the cost to correct future profit."
          />
          {quickLinks.length > 0 ? (
            <DashboardQuickLinks compact links={quickLinks} />
          ) : null}
        </header>

        <div className={cn(supFilterRail, "flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-end")}>
          {counts.length > 0 ? (
            <div
              className="inline-flex flex-wrap border border-border bg-background p-0.5"
              role="group"
              aria-label="Issue type filter"
            >
              {counts.map((c) => {
                const active = issueFilter === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setIssueFilter(c.key)}
                    className={cn(
                      "inline-flex h-8 items-center gap-2 px-2.5 text-left text-[11px] font-semibold transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    <span>{c.label}</span>
                    <span className="font-mono tabular-nums">
                      {c.value.toLocaleString("en-KE")}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="flex flex-1 flex-wrap items-end gap-2">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 sm:max-w-[14rem]">
              <span className={supFieldLabel}>Branch</span>
              <select
                className={cn(
                  supSelect,
                  "h-8 bg-background disabled:cursor-not-allowed disabled:opacity-60",
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

            <label className="flex h-8 items-center gap-2 border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground">
              <input
                type="checkbox"
                className="size-3.5 rounded-none border-input accent-primary"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
              />
              In stock only
            </label>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 rounded-none px-3"
              disabled={loading || (isBranchLockedRole && !me?.branchId?.trim())}
              onClick={() => void runLoad(branchFilter)}
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              {loading ? "…" : "Refresh"}
            </Button>
          </div>
        </div>

        {message ? (
          <p className="border-b border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {message}
          </p>
        ) : null}

        <div className={cn(supWorkspaceShell, "border-0 border-t")}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-[#e8eef5] px-2.5 py-1.5 dark:bg-muted/40">
            <h2 className="text-xs font-semibold tracking-tight text-foreground">
              {loading ? "Loading…" : `Flagged items · ${activeBranchName}`}
            </h2>
            {data && !loading ? (
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {rows.length} shown
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse border-0 text-left text-xs">
              <thead>
                <tr className={supTableHead}>
                  <th className={cn(supTableCell, "min-w-[12rem]")}>Item</th>
                  <th className={cn(supTableCell, "text-right")}>Stock</th>
                  <th className={cn(supTableCell, "text-right")}>Cost</th>
                  <th className={cn(supTableCell, "text-right")}>Sell</th>
                  <th className={cn(supTableCell, "text-right")}>Margin</th>
                  <th className={supTableCell}>Issue</th>
                  <th className={cn(supTableCell, "text-right")}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className={supTableRow}>
                    <td
                      colSpan={7}
                      className={cn(supTableCell, "py-8 text-center text-sm text-muted-foreground")}
                    >
                      Loading…
                    </td>
                  </tr>
                ) : !data ? (
                  <tr className={supTableRow}>
                    <td
                      colSpan={7}
                      className={cn(supTableCell, "py-8 text-center text-sm text-muted-foreground")}
                    >
                      Refresh to load cost issues.
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr className={supTableRow}>
                    <td
                      colSpan={7}
                      className={cn(supTableCell, "py-8 text-center text-sm text-muted-foreground")}
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
                      <tr key={row.itemId} className={supTableRow}>
                        <td className={supTableCell}>
                          <div className="max-w-[16rem] truncate text-sm font-medium">
                            {row.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {row.sku}
                            {row.costSource === "reference"
                              ? " · reference cost"
                              : row.costSource === "none"
                                ? " · no cost set"
                                : ""}
                          </div>
                        </td>
                        <td className={cn(supTableCell, "text-right font-mono tabular-nums")}>
                          {fmtQty(toNum(row.activeQty))}
                        </td>
                        <td className={cn(supTableCell, "text-right font-mono tabular-nums")}>
                          {cost == null || cost <= 0 ? (
                            <span className="text-rose-600">—</span>
                          ) : (
                            fmtMoney(cost, currency)
                          )}
                        </td>
                        <td className={cn(supTableCell, "text-right font-mono tabular-nums")}>
                          {fmtMoney(sell, currency)}
                        </td>
                        <td
                          className={cn(
                            supTableCell,
                            "text-right font-mono tabular-nums",
                            margin != null && margin < 0
                              ? "text-rose-600"
                              : margin != null && margin < 5
                                ? "text-amber-600"
                                : margin != null && margin > 50
                                  ? "text-sky-700 dark:text-sky-300"
                                  : "",
                          )}
                        >
                          {margin == null ? "—" : `${margin.toFixed(1)}%`}
                        </td>
                        <td className={supTableCell}>
                          <span
                            className={cn(
                              "inline-flex items-center border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide",
                              meta.className,
                            )}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className={cn(supTableCell, "text-right")}>
                          {canAdjust ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 rounded-none px-2.5 text-xs"
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

          {data && !loading && rows.length > 0 ? (
            <div className="border-t border-border bg-[#eef2f7] px-2.5 py-1.5 text-[10px] text-muted-foreground dark:bg-muted/25">
              <span className={supKicker}>Summary</span>
              <span className="ml-2 font-mono tabular-nums text-foreground">
                {rows.length}
              </span>{" "}
              items shown ·{" "}
              <span className="font-mono tabular-nums text-foreground">
                {data.total}
              </span>{" "}
              total flagged
            </div>
          ) : null}
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
  let high = 0;
  for (const r of data.items) {
    if (r.primaryIssue === "zero_cost") zero++;
    else if (r.primaryIssue === "sells_at_loss") loss++;
    else if (r.primaryIssue === "thin_margin") thin++;
    else if (r.primaryIssue === "high_margin") high++;
  }
  return {
    ...data,
    total: data.items.length,
    zeroCostCount: zero,
    sellsAtLossCount: loss,
    thinMarginCount: thin,
    highMarginCount: high,
  };
}
