"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, Package, Receipt, ShoppingCart } from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardNotice,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSessionBranch, useSyncBranchFilter } from "@/hooks/use-session-scope";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchBranches,
  fetchSalesRevenueByCategory,
  type BranchRecord,
  type RevenueByCategoryRow,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function rowAmount(row: RevenueByCategoryRow): number {
  return typeof row.netRevenue === "number" ? row.netRevenue : Number(row.netRevenue);
}

export default function SalesReportsPage() {
  const { me, business, setBranchId: setHeaderBranchId } = useDashboard();
  const { branchName: headerBranchName } = useSessionBranch();
  const allowed = hasPermission(me?.permissions, Permission.SalesIntelligenceRead);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchId, setBranchId] = useState("");
  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked } = useSyncBranchFilter({
    value: branchId,
    setValue: setBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
    allowAll: true,
  });
  const onChangeBranch = useCallback(
    (id: string) => {
      setBranchId(id);
      if (!branchLocked && id.trim()) setHeaderBranchId(id.trim());
    },
    [branchLocked, setHeaderBranchId],
  );

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RevenueByCategoryRow[]>([]);

  useEffect(() => {
    void fetchBranches()
      .then((list) => setBranches(list.filter((b) => b.active)))
      .catch(() => setBranches([]));
  }, []);

  const load = useCallback(async () => {
    setMessage("");
    setLoading(true);
    try {
      const fromArg = from.trim() || undefined;
      const toArg = to.trim() || undefined;
      const branchArg = branchId.trim() || undefined;
      const data = await fetchSalesRevenueByCategory(
        fromArg,
        toArg,
        undefined,
        branchArg,
      );
      setRows(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, [from, to, branchId]);

  useEffect(() => {
    if (!allowed) return;
    void load();
  }, [allowed, load]);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Sales by category"
        description={
          <>
            You do not have permission to view this report. Ask an administrator to grant{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{Permission.SalesIntelligenceRead}</code>.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  const currency = business?.currency?.trim() ?? "";
  const branchLabel = branchId
    ? branches.find((b) => b.id === branchId)?.name?.trim() || headerBranchName
    : "All branches";

  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-8">
      <header className="space-y-4">
        <DashboardPageHero
          showActiveScope
          icon={ShoppingCart}
          eyebrow="Sales"
          title="Sales by category"
          description={
            <>
              Net POS revenue rolled up by catalog category (sale line totals minus refunds in the selected window).
              Sale rows use each sale&apos;s date; refunds use the refund date. Leave dates empty for the default
              rolling window (last 90 days ending today).
              {currency ? ` Amounts use business currency (${currency}).` : ""}
              {branchLabel ? ` Showing: ${branchLabel}.` : ""}
            </>
          }
        />
        <DashboardQuickLinks
          links={[
            { href: APP_ROUTES.salesQuick, label: "Quick sale", desc: "POS", icon: Receipt },
            { href: APP_ROUTES.categories, label: "Categories", desc: "Rollup keys", icon: LayoutGrid },
            { href: APP_ROUTES.products, label: "Products", desc: "Catalog", icon: Package },
          ]}
        />
      </header>

      <form
        className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/20 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          load().catch(() => {
            setMessage("Failed to load report.");
          });
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">From</span>
          <input
            type="date"
            className="rounded border bg-background px-2 py-1.5"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">To</span>
          <input
            type="date"
            className="rounded border bg-background px-2 py-1.5"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <label className="flex min-w-[10rem] flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Branch</span>
          <select
            className={cn(dashboardSelectClass(), "h-9")}
            value={branchId}
            disabled={branchLocked}
            onChange={(e) => onChangeBranch(e.target.value)}
            aria-label="Branch"
          >
            {!branchLocked ? <option value="">All branches</option> : null}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </form>

      {message ? <DashboardNotice text={message} /> : null}

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Net revenue by category</h3>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium text-right">Net revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-muted-foreground">
                    No rows yet — choose dates and click Refresh, or nothing matched this range.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.categoryId} className="border-b last:border-0">
                    <td className="px-3 py-2">{row.categoryName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(rowAmount(row))}</td>
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
