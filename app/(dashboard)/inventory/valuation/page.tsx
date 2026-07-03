"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  BarChart3,
  ClipboardList,
  Layers,
  Package,
  PackageX,
  RefreshCw,
  Truck,
  Warehouse,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchBranches,
  fetchInventoryValuation,
  type BranchRecord,
  type InventoryValuationResponseRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { filterInventoryQuickLinksForUser } from "@/lib/inventory-access";
import { cn } from "@/lib/utils";

function formatMoney(amount: number, currencyCode: string): string {
  try {
    return amount.toLocaleString(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return amount.toFixed(2);
  }
}

function moneyValue(v: number | string): number {
  return typeof v === "number" ? v : Number(v);
}

export default function InventoryValuationPage() {
  const { me, business, setBranchId: setHeaderBranchId } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.InventoryRead);
  const currency = business?.currency?.trim() || "KES";

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  // Report page: follow the header branch, allowing an empty "All branches" view.
  const { branchLocked: isBranchLockedRole } = useSyncBranchFilter({
    value: branchFilter,
    setValue: setBranchFilter,
    availableIds: branches.length > 0 ? branchIds : undefined,
    allowAll: true,
  });
  const [appliedBranchId, setAppliedBranchId] = useState("");
  const onChangeBranch = useCallback(
    (id: string) => {
      setBranchFilter(id);
      setAppliedBranchId(id);
      if (!isBranchLockedRole && id.trim()) setHeaderBranchId(id.trim());
    },
    [isBranchLockedRole, setHeaderBranchId],
  );
  const [data, setData] = useState<InventoryValuationResponseRecord | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const runValuationLoad = useCallback(async (branchId: string) => {
    setMessage("");
    setLoading(true);
    try {
      const row = await fetchInventoryValuation(branchId.trim() || undefined);
      setData(row);
    } catch (error) {
      setData(null);
      setMessage(
        error instanceof Error ? error.message : "Failed to load valuation.",
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
    if (!appliedBranchId && branchFilter !== undefined) {
      setAppliedBranchId(branchFilter);
    }
  }, [branchFilter, appliedBranchId]);

  const branchScopeStale = branchFilter !== appliedBranchId;
  const appliedBranchLabel = useMemo(() => {
    if (!appliedBranchId) return "All branches";
    return (
      branches.find((b) => b.id === appliedBranchId)?.name?.trim() ||
      appliedBranchId
    );
  }, [appliedBranchId, branches]);
  const pendingBranchLabel = useMemo(() => {
    if (!branchFilter) return "All branches";
    return (
      branches.find((b) => b.id === branchFilter)?.name?.trim() || branchFilter
    );
  }, [branchFilter, branches]);

  // Warn locked-role users who have no assigned branch (sync hook keeps the
  // filter pinned to their branch otherwise).
  useEffect(() => {
    if (!allowed || !isBranchLockedRole) return;
    if (!me?.branchId?.trim()) {
      setMessage(
        "Your account is not assigned to a branch. Contact your administrator.",
      );
    }
  }, [allowed, isBranchLockedRole, me?.branchId]);

  useEffect(() => {
    if (!allowed) return;
    if (isBranchLockedRole && !me?.branchId?.trim()) return;
    void runValuationLoad(appliedBranchId);
  }, [
    allowed,
    appliedBranchId,
    isBranchLockedRole,
    me?.branchId,
    runValuationLoad,
  ]);

  const branchCount = data?.byBranch.length ?? 0;

  const activeBranchName = useMemo(() => {
    if (!appliedBranchId) return "All branches";
    return (
      branches.find((b) => b.id === appliedBranchId)?.name?.trim() ||
      appliedBranchId
    );
  }, [appliedBranchId, branches]);

  const quickLinks = useMemo(
    () =>
      filterInventoryQuickLinksForUser(me, [
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
          href: APP_ROUTES.inventorySupplyBatches,
          label: "Supply batches",
          desc: "Cost layers",
          icon: Layers,
        },
        {
          href: APP_ROUTES.purchasingAddSupplies,
          label: "Receive supplies",
          desc: "New delivery",
          icon: Truck,
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

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Stock valuation"
        description={
          <>
            You do not have permission to view inventory valuation. Ask an
            administrator to grant{" "}
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
    <div className={DASHBOARD_MAX}>
      <div className="space-y-4">
        <header className="space-y-2 border-b border-border/50 pb-4">
          <DashboardPageHero
            compact
            showActiveScope
            icon={BarChart3}
            eyebrow="Inventory"
            title="Stock valuation"
            description="Extension value — qty remaining × unit cost per active batch."
          />
          {quickLinks.length > 0 ? (
            <DashboardQuickLinks compact links={quickLinks} />
          ) : null}
        </header>

        <div className="space-y-2.5 rounded-xl border border-border/60 bg-muted/15 p-3">
          {branchScopeStale ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-950 dark:text-amber-100">
              <span>
                Branch changed to <strong>{pendingBranchLabel}</strong>. Report
                still shows <strong>{appliedBranchLabel}</strong>.
              </span>
              <button
                type="button"
                className="shrink-0 rounded-md border border-amber-600/30 bg-background/80 px-2.5 py-1 text-[11px] font-semibold shadow-sm hover:bg-background"
                onClick={() => setAppliedBranchId(branchFilter)}
              >
                Apply branch
              </button>
            </div>
          ) : null}

          {data ? (
            <div className="flex flex-wrap gap-1.5 sm:flex-nowrap">
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-2 sm:px-3">
                <span className="truncate text-[11px] font-medium text-muted-foreground">
                  Total value
                </span>
                <span className="shrink-0 text-base font-bold tabular-nums leading-none text-foreground">
                  {formatMoney(moneyValue(data.totalExtensionValue), currency)}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-2.5 py-2 sm:px-3">
                <span className="truncate text-[11px] font-medium text-muted-foreground">
                  Branches
                </span>
                <span className="shrink-0 text-base font-bold tabular-nums leading-none">
                  {branchCount.toLocaleString("en-KE")}
                </span>
              </div>
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5"
              disabled={loading || (isBranchLockedRole && !me?.branchId?.trim())}
              onClick={() => void runValuationLoad(appliedBranchId)}
            >
              <RefreshCw
                className={cn("size-3.5", loading && "animate-spin")}
              />
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
              {loading ? (
                "Loading valuation…"
              ) : data ? (
                <>
                  By branch · {activeBranchName}
                </>
              ) : (
                "Valuation report"
              )}
            </h2>
            {data && !loading ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                {branchCount} branch{branchCount === 1 ? "" : "es"}
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[24rem] text-left text-sm">
              <thead className="border-b border-border/60 bg-background text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Branch</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Extension
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : !data ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      Choose a branch or refresh to load the report.
                    </td>
                  </tr>
                ) : data.byBranch.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      No stock on hand for this filter.
                    </td>
                  </tr>
                ) : (
                  data.byBranch.map((row) => (
                    <tr key={row.branchId} className="hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <div className="text-sm font-medium">
                          {row.branchName}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMoney(
                          moneyValue(row.extensionValue),
                          currency,
                        )}
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
