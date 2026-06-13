"use client";

import { PackagePlus, TrendingUp, Truck } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  nsdBorder,
  nsdKicker,
  nsdStatTile,
} from "./new-supply-drawer-ui";

function SummaryMetric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className={nsdStatTile}>
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-mono text-sm font-bold tabular-nums tracking-tight",
          accent ?? "text-foreground",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-px text-[10px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function SupplyDrawerSummaryPanel({
  supplierName,
  branchName,
  lineStats,
  estimatedProfit,
  extrasTotal,
  canPost,
  className,
}: {
  supplierName: string | null;
  branchName: string;
  lineStats: { totalRows: number; withQty: number; valid: number };
  estimatedProfit: { cost: number; revenue: number; profit: number };
  extrasTotal: number;
  canPost: boolean;
  className?: string;
}) {
  const netProfit = estimatedProfit.profit - extrasTotal;
  const marginPct =
    estimatedProfit.revenue > 0
      ? Math.round((netProfit / estimatedProfit.revenue) * 100)
      : 0;
  const lineProgress =
    lineStats.totalRows > 0
      ? Math.round((lineStats.valid / lineStats.totalRows) * 100)
      : 0;

  return (
    <aside
      className={cn(
        "flex flex-col gap-1.5 rounded-sm bg-card shadow-sm",
        nsdBorder,
        className,
      )}
    >
      <div className="border-b border-border bg-muted/40 px-2.5 py-2">
        <p className={nsdKicker}>Live summary</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Updates as you fill receiving lines
        </p>
      </div>

      <div className="space-y-2 px-2.5 pb-1">
        <div className="flex items-start gap-2 rounded-sm border border-border bg-muted/20 px-2 py-2">
          <Truck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">
              {supplierName ?? "No supplier selected"}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {branchName || "Branch not set"}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">
              Lines complete
            </span>
            <span className="font-mono tabular-nums text-foreground">
              {lineStats.valid}/{lineStats.totalRows}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${lineProgress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <SummaryMetric
            label="Payable"
            value={estimatedProfit.cost.toFixed(2)}
            sub={`${lineStats.withQty} w/ qty`}
            accent="text-foreground"
          />
          <SummaryMetric
            label="Retail est."
            value={estimatedProfit.revenue.toFixed(2)}
            accent="text-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <SummaryMetric
            label="Margin"
            value={`${marginPct}%`}
            sub={netProfit.toFixed(2)}
            accent={
              netProfit >= 0 ? "text-primary" : "text-red-600 dark:text-red-400"
            }
          />
          {extrasTotal > 0 ? (
            <SummaryMetric label="Extras" value={extrasTotal.toFixed(2)} />
          ) : (
            <SummaryMetric label="Extras" value="0.00" sub="Optional" />
          )}
        </div>
      </div>

      <div
        className={cn(
          "mx-2.5 mb-2.5 flex items-start gap-2 rounded-sm border px-2.5 py-2 text-[10px]",
          canPost
            ? "border-primary/35 bg-primary/10 text-foreground"
            : "border-border bg-muted/25 text-muted-foreground",
        )}
      >
        <PackagePlus className="size-4 shrink-0 text-primary" aria-hidden />
        <p className="leading-snug">
          {canPost
            ? "All set — post when the delivery matches your paperwork."
            : "Select a supplier and enter qty + cost on at least one line."}
        </p>
      </div>

      <div className="border-t border-border bg-muted/20 px-2.5 py-2">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <TrendingUp className="size-3 shrink-0" aria-hidden />
          Shelf prices apply when you post, not while drafting.
        </div>
      </div>
    </aside>
  );
}
