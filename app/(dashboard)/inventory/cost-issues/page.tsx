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
  Warehouse,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
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
  CostIssuesTheatre,
  type IssueFilter,
} from "./_components/cost-issues-theatre";

function toNum(n: number | string | null | undefined): number | null {
  if (n == null || n === "") return null;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : null;
}

export default function InventoryCostIssuesPage() {
  const { me, business, setBranchId: setHeaderBranchId } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.PricingRead);
  const canAdjust = hasPermission(
    me?.permissions,
    Permission.PricingCostPriceSet,
  );
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
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

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
      setSelectedId(null);
      setMobileShowDetail(false);
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
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, issueFilter, inStockOnly, search]);

  const selectedRow = useMemo(
    () => rows.find((r) => r.itemId === selectedId) ?? null,
    [rows, selectedId],
  );

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

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setMobileShowDetail(false);
  }, []);

  const selectRow = useCallback(
    (row: CostIssueRowRecord) => {
      if (selectedId === row.itemId) {
        clearSelection();
        return;
      }
      setSelectedId(row.itemId);
      setMobileShowDetail(true);
    },
    [selectedId, clearSelection],
  );

  const onSaved = useCallback(
    (updated: CostIssueRowRecord) => {
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

      const stillAnIssue =
        updated.zeroCost ||
        updated.sellsAtLoss ||
        updated.thinMargin ||
        updated.highMargin;

      if (!stillAnIssue) {
        clearSelection();
        return;
      }

      setSelectedId(updated.itemId);
    },
    [clearSelection],
  );

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
        {
          key: "zero_cost" as const,
          label: "No cost",
          value: data.zeroCostCount,
        },
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
    <div className={cn(DASHBOARD_MAX_WIDE, "flex flex-col gap-1.5 pb-8")}>
      <header className="space-y-1">
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

      <CostIssuesTheatre
        loading={loading}
        message={message}
        data={data}
        rows={rows}
        currency={currency}
        canAdjust={canAdjust}
        branches={branches}
        branchFilter={branchFilter}
        isBranchLockedRole={isBranchLockedRole}
        meBranchId={me?.branchId}
        onChangeBranch={onChangeBranch}
        onRefresh={() => void runLoad(branchFilter)}
        issueFilter={issueFilter}
        onIssueFilterChange={setIssueFilter}
        counts={counts}
        inStockOnly={inStockOnly}
        onInStockOnlyChange={setInStockOnly}
        activeBranchName={activeBranchName}
        search={search}
        onSearchChange={setSearch}
        selectedId={selectedId}
        selectedRow={selectedRow}
        onSelect={selectRow}
        onClearSelection={clearSelection}
        mobileShowDetail={mobileShowDetail}
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
