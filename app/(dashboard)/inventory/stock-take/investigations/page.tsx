"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchBranches,
  fetchDailyAuditInvestigations,
  type BranchRecord,
  type DailyAuditInvestigationRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function num(v: number | string | null | undefined): string {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n.toLocaleString() : String(v);
}

export default function DailyAuditInvestigationsPage() {
  const { me } = useDashboard();
  const canApprove = hasPermission(me?.permissions, Permission.StocktakeApprove);

  const [branchId, setBranchId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [rows, setRows] = useState<DailyAuditInvestigationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSyncBranchFilter(branchId, setBranchId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(
        await fetchDailyAuditInvestigations({
          branchId: branchId || undefined,
          from: from || undefined,
          to: to || undefined,
        }),
      );
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Could not load investigations");
    } finally {
      setLoading(false);
    }
  }, [branchId, from, to]);

  useEffect(() => {
    fetchBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    if (canApprove) void load();
  }, [canApprove, load]);

  if (!canApprove) {
    return (
      <DashboardAccessDenied message="Only admins can view investigation reports." />
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX, "mx-auto space-y-4 px-4 pb-8 pt-4")}>
      <Link
        href={APP_ROUTES.inventoryStockTakeDailyAuditReview}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Daily audit review
      </Link>

      <DashboardPageHero
        title="Investigations"
        description="Escalated daily audit items requiring follow-up."
        icon={ShieldAlert}
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Branch</span>
          <select
            className={dashboardSelectClass}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">From</span>
          <input
            type="date"
            className={dashboardInputClass}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">To</span>
          <input
            type="date"
            className={dashboardInputClass}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <div className="flex items-end">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            Apply
          </Button>
        </div>
      </div>

      {error ? <DashboardFeedback variant="error" message={error} /> : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No escalated items found for these filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Morning</th>
                <th className="px-3 py-2">Evening</th>
                <th className="px-3 py-2">System</th>
                <th className="px-3 py-2">Variance</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.auditId}-${row.itemId}`} className="border-b last:border-0">
                  <td className="px-3 py-3 whitespace-nowrap">{row.auditDate}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{row.itemName}</div>
                    <div className="text-xs text-muted-foreground">{row.itemSku}</div>
                  </td>
                  <td className="px-3 py-3">{num(row.morningCount)}</td>
                  <td className="px-3 py-3">{num(row.eveningCount)}</td>
                  <td className="px-3 py-3">{num(row.systemStock)}</td>
                  <td className="px-3 py-3 text-red-600">{num(row.variance)}</td>
                  <td className="px-3 py-3 max-w-xs truncate">{row.reviewNotes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
