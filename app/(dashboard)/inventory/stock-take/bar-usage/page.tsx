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

/** Where each bottle's stock went over a day (poured, sold whole, wasted) and what should be left. */
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
            title="Pour check"
            description="For a day, how much of each bottle was poured, sold whole or wasted — and how much should be left to count."
          />
          {quickLinks.length > 0 ? <DashboardQuickLinks links={quickLinks} /> : null}
        </header>

        <div className="rounded-none border bg-white p-6 shadow-none">
          <h3 className="mb-4 text-sm font-semibold">Pick a day</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Shows what the till says left each bottle through the day. Then count the bottles — if the count comes up
            short, that is over-pouring or spillage.
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
              Nothing moved for this day — no pours, sales or write-offs against your stocked bottles.
            </p>
          ) : (
            (() => {
              // Deliveries, transfers and adjustments: shown only when some bottle has one, so a row
              // always adds up (started with − poured − sold − wasted + received = should be left).
              const anyOther = report.lines.some((l) => l.otherMoved !== 0);
              const signed = (v: number) => `${v > 0 ? "+" : ""}${num(v)}`;
              return (
            <div className="space-y-3">
              {/* Desktop/tablet: a table. Each bottle shows where it went and what should be left. */}
              <div className="hidden overflow-x-auto rounded-none border bg-white shadow-none sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="p-3">Bottle</th>
                      <th className="p-3 text-right">Started with</th>
                      <th className="p-3 text-right">Poured</th>
                      <th className="p-3 text-right">Sold whole</th>
                      <th className="p-3 text-right">Wasted</th>
                      {anyOther ? <th className="p-3 text-right">Received / moved</th> : null}
                      <th className="bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_6%,transparent)] p-3 text-right font-semibold text-foreground">
                        Should be left
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.lines.map((l) => (
                      <tr key={l.itemId} className="border-b last:border-0">
                        <td className="p-3">
                          <div className="font-medium">{l.name}</div>
                          {l.sku ? <div className="text-[11px] text-muted-foreground">{l.sku}</div> : null}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums text-muted-foreground">{num(l.openingOnHand)}</td>
                        <td className="p-3 text-right font-mono tabular-nums">{l.poured > 0 ? num(l.poured) : "—"}</td>
                        <td className="p-3 text-right font-mono tabular-nums">{l.directSold > 0 ? num(l.directSold) : "—"}</td>
                        <td className={`p-3 text-right font-mono tabular-nums ${l.wasted > 0 ? "text-amber-600" : ""}`}>
                          {l.wasted > 0 ? num(l.wasted) : "—"}
                        </td>
                        {anyOther ? (
                          <td className="p-3 text-right font-mono tabular-nums">{l.otherMoved !== 0 ? signed(l.otherMoved) : "—"}</td>
                        ) : null}
                        <td className="bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_6%,transparent)] p-3 text-right font-mono text-base font-semibold tabular-nums">
                          {num(l.systemOnHand)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: a card per bottle, so nothing is cramped or scrolled sideways. */}
              <ul className="grid gap-2 sm:hidden">
                {report.lines.map((l) => (
                  <li key={l.itemId} className="rounded-none border bg-white p-3 shadow-none">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{l.name}</span>
                      <span className="text-right">
                        <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">Should be left</span>
                        <span className="font-mono text-lg font-semibold tabular-nums">{num(l.systemOnHand)}</span>
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>Started with {num(l.openingOnHand)}</span>
                      {l.poured > 0 ? <span>· poured {num(l.poured)}</span> : null}
                      {l.directSold > 0 ? <span>· sold {num(l.directSold)}</span> : null}
                      {l.wasted > 0 ? <span className="text-amber-600">· wasted {num(l.wasted)}</span> : null}
                      {l.otherMoved !== 0 ? <span>· received/moved {signed(l.otherMoved)}</span> : null}
                    </div>
                  </li>
                ))}
              </ul>

              <p className="text-xs text-muted-foreground">
                Now count the bottles. Open a <strong className="text-foreground">stock take</strong> for this branch and
                enter what you find — anything less than “should be left” is over-pouring, spillage or shrinkage.
              </p>
            </div>
              );
            })()
          )
        ) : null}
      </div>
    </div>
  );
}
