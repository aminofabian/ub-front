"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  BarChart3,
  ClipboardList,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchBranches,
  fetchStockTakeReconciliation,
  type BranchRecord,
  type ReconciliationResponseRecord,
  type ReconciliationLineRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { filterInventoryQuickLinksForUser } from "@/lib/inventory-access";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────

function parseNum(v: number | string): number {
  return typeof v === "number" ? v : parseFloat(v) || 0;
}

function varianceColor(v: number): string {
  if (v === 0) return "text-emerald-600";
  if (Math.abs(v) <= 2) return "text-amber-600";
  return "text-red-600";
}

function varianceBg(v: number): string {
  if (v === 0) return "bg-emerald-50 dark:bg-emerald-950/20";
  if (Math.abs(v) <= 2) return "bg-amber-50 dark:bg-amber-950/20";
  return "bg-red-50 dark:bg-red-950/20";
}

// ── Page ──────────────────────────────────────────────────────────────

/** Return a human-readable label for a reconciliation line.
 *  Falls back to SKU or a generic label when the backend sends a raw UUID. */
function getReconLineName(line: ReconciliationLineRecord): string {
  const name = line.itemName?.trim();
  if (name && !/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/i.test(name)) {
    return name;
  }
  const sku = line.sku?.trim();
  if (sku) return sku;
  return "Unnamed item";
}

export default function ReconciliationPage() {
  const { me } = useDashboard();
  const canRead = hasPermission(me?.permissions, Permission.StocktakeRead);
  const canApprove = hasPermission(
    me?.permissions,
    Permission.StocktakeApprove,
  );
  const allowed = canRead || canApprove;

  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [report, setReport] = useState<ReconciliationResponseRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  // Follow the global header branch selection (pinned for locked roles).
  const { branchLocked } = useSyncBranchFilter({
    value: branchId,
    setValue: setBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
  });

  // Load branches
  useEffect(() => {
    let cancelled = false;
    fetchBranches()
      .then((list) => {
        if (!cancelled) setBranches(list.filter((b) => b.active));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Fall back to the first branch when the header has no selection.
  useEffect(() => {
    if (branchLocked || branchId || branches.length === 0) return;
    setBranchId(branches[0].id);
  }, [branchLocked, branchId, branches]);

  const onGenerate = useCallback(async () => {
    if (!branchId || !date) {
      setMessage("Select a branch and date.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const r = await fetchStockTakeReconciliation(
        undefined,
        undefined,
        branchId,
        date,
      );
      setReport(r);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Failed to load reconciliation.",
      );
    } finally {
      setLoading(false);
    }
  }, [branchId, date]);

  const quickLinks = useMemo(
    () =>
      filterInventoryQuickLinksForUser(me, [
        {
          href: APP_ROUTES.inventoryStockTake,
          label: "Stock take",
          desc: "Count inventory",
          icon: ClipboardList,
        },
        {
          href: APP_ROUTES.inventoryTransfers,
          label: "Transfers",
          desc: "Move stock",
          icon: ArrowRightLeft,
        },
      ]),
    [me],
  );

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Reconciliation Report"
        description={
          <>
            You need <code className="text-xs">{Permission.StocktakeRead}</code>
            .
          </>
        }
        backHref={APP_ROUTES.inventoryStockTake}
        backLabel="Stock take"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-6">
        <header className="space-y-4">
          <DashboardPageHero
            showActiveScope
            icon={BarChart3}
            eyebrow="Stock Take"
            title="Reconciliation Report"
            description="Compare morning and evening stocktake sessions to identify daily variances."
          />
          {quickLinks.length > 0 ? (
            <DashboardQuickLinks links={quickLinks} />
          ) : null}
        </header>

        {/* Auto-detect form */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold">Generate Report</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Select a branch and date. The system will automatically find the
            morning and evening sessions.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-muted-foreground">
                Branch
              </span>
              <select
                className="rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={branchLocked}
              >
                <option value="">Select branch…</option>
                {branches
                  .filter((b) => !branchLocked || b.id === me?.branchId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-muted-foreground">
                Date
              </span>
              <input
                type="date"
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          <Button className="mt-4" disabled={loading} onClick={onGenerate}>
            Generate Report
          </Button>
        </div>

        {message ? <DashboardFeedback kind="error" text={message} /> : null}

        {/* Report */}
        {report ? (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
                <div className="text-2xl font-bold">
                  {report.totalReconciled}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Items reconciled
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-emerald-600">
                  {report.zeroVariance}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Zero variance
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-red-600">
                  {report.withVariance}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  With variance
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center shadow-sm col-span-2">
                <div className="text-xs text-muted-foreground">
                  {report.morningSessionName} → {report.eveningSessionName}
                </div>
              </div>
            </div>

            {/* Session info */}
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div>
                Morning:{" "}
                <span className="font-mono">{report.morningSessionId}</span>
              </div>
              <div>
                Evening:{" "}
                <span className="font-mono">{report.eveningSessionId}</span>
              </div>
            </div>

            {report.totalReconciled === 0 ? (
              <DashboardFeedback
                kind="warning"
                text={
                  report.eveningConfirmedCount === 0
                    ? `No items confirmed in the evening session yet. Confirm ${report.morningConfirmedCount} items in the evening session to see reconciliation.`
                    : report.morningConfirmedCount === 0
                      ? `No items confirmed in the morning session yet.`
                      : `Both sessions have confirmed items but no items appear in both. This is unexpected.`
                }
              />
            ) : null}

            {/* Report table */}
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="sticky top-0 border-b bg-muted/40">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Product</th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Opening
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">Sold</th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Expected
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Actual
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Variance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.lines.map((line) => {
                    const v = parseNum(line.variance);
                    return (
                      <tr
                        key={line.itemId}
                        className={cn("border-b last:border-0", varianceBg(v))}
                      >
                        <td className="px-3 py-2.5">
                          <div className="max-w-[12rem] truncate font-medium">
                            {getReconLineName(line)}
                          </div>
                          {line.sku ? (
                            <div className="text-xs text-muted-foreground">
                              {line.sku}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {String(line.openingStock)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                          {String(line.unitsSold)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {String(line.expectedClosing)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                          {String(line.actualClosing)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-semibold",
                              varianceColor(v),
                            )}
                          >
                            {v > 0 ? (
                              <TrendingUp className="size-3.5" />
                            ) : v < 0 ? (
                              <TrendingDown className="size-3.5" />
                            ) : (
                              <CheckCircle2 className="size-3.5 text-emerald-500" />
                            )}
                            {v > 0 ? "+" : ""}
                            {v}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
