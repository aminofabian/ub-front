"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Wine } from "lucide-react";

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
  fetchBarUsage,
  fetchBranches,
  type BarUsageResponseRecord,
  type BranchRecord,
} from "@/lib/api";
import { filterInventoryQuickLinksForUser } from "@/lib/inventory-access";
import { hasPermission, Permission } from "@/lib/permissions";

const num = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(4).replace(/\.?0+$/, ""));

function varianceTone(v: number | null): string {
  if (v == null || v === 0) return "text-emerald-600";
  return v < 0 ? "text-red-600" : "text-amber-600";
}

/** Where each bottle's stock went over a day (poured, sold whole, wasted) and the count variance. */
export default function BarUsagePage() {
  const { me } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.StocktakeRead);

  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [report, setReport] = useState<BarUsageResponseRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked } = useSyncBranchFilter({
    value: branchId,
    setValue: setBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
  });

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
      setReport(await fetchBarUsage(branchId, date));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to load the bar usage report.");
    } finally {
      setLoading(false);
    }
  }, [branchId, date]);

  const quickLinks = useMemo(
    () =>
      filterInventoryQuickLinksForUser(me, [
        { href: APP_ROUTES.inventoryStockTake, label: "Stock take", desc: "Count inventory", icon: ClipboardList },
      ]),
    [me],
  );

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Bar usage"
        description={
          <>
            You need <code className="text-xs">{Permission.StocktakeRead}</code>.
          </>
        }
        backHref={APP_ROUTES.inventoryStockTake}
        backLabel="Stock take"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-1">
        <header className="space-y-1">
          <DashboardPageHero
            showActiveScope
            icon={Wine}
            eyebrow="Stock Take"
            title="Bar usage"
            description="Where each bottle went over a day — poured, sold whole, or wasted — and how a count compares."
          />
          {quickLinks.length > 0 ? <DashboardQuickLinks links={quickLinks} /> : null}
        </header>

        <div className="rounded-none border bg-white p-6 shadow-none">
          <h3 className="mb-4 text-sm font-semibold">Pick a day</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            The report reads every pour, whole-bottle sale and write-off for the day. Enter a stock-take count to see
            the variance (a shortfall is over-pour or spillage).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-muted-foreground">Branch</span>
              <select
                className="h-11 rounded-2xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 text-[15px] disabled:cursor-not-allowed disabled:opacity-60 sm:h-8 sm:rounded-none sm:px-2.5 sm:text-sm"
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
              <span className="text-sm font-medium text-muted-foreground">Date</span>
              <input
                type="date"
                className="h-11 rounded-2xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 text-[15px] sm:h-8 sm:rounded-none sm:px-2.5 sm:text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          <Button
            className="mt-4 h-12 w-full rounded-2xl text-[14px] sm:h-9 sm:w-auto sm:rounded-none sm:text-sm"
            disabled={loading}
            onClick={onGenerate}
          >
            {loading ? "Loading…" : "Show usage"}
          </Button>
        </div>

        {message ? <DashboardFeedback kind="error" text={message} /> : null}

        {report ? (
          report.lines.length === 0 ? (
            <p className="rounded-none border bg-white p-6 text-sm text-muted-foreground shadow-none">
              No stocked bottles moved or were held at this branch for that day.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-none border bg-white shadow-none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="p-3">Bottle</th>
                    <th className="p-3 text-right">Opening</th>
                    <th className="p-3 text-right">Poured</th>
                    <th className="p-3 text-right">Sold whole</th>
                    <th className="p-3 text-right">Wasted</th>
                    <th className="p-3 text-right">Should be left</th>
                    <th className="p-3 text-right">Counted</th>
                    <th className="p-3 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {report.lines.map((l) => (
                    <tr key={l.itemId} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="font-medium">{l.name}</div>
                        {l.sku ? <div className="text-[11px] text-muted-foreground">{l.sku}</div> : null}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums">{num(l.openingOnHand)}</td>
                      <td className="p-3 text-right font-mono tabular-nums">{num(l.poured)}</td>
                      <td className="p-3 text-right font-mono tabular-nums">{num(l.directSold)}</td>
                      <td className="p-3 text-right font-mono tabular-nums">{num(l.wasted)}</td>
                      <td className="p-3 text-right font-mono tabular-nums">{num(l.systemOnHand)}</td>
                      <td className="p-3 text-right font-mono tabular-nums">{l.counted == null ? "—" : num(l.counted)}</td>
                      <td className={`p-3 text-right font-mono tabular-nums ${varianceTone(l.variance)}`}>
                        {l.variance == null ? "—" : `${l.variance > 0 ? "+" : ""}${num(l.variance)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
