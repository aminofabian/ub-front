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
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-lg font-bold tabular-nums tracking-tight",
          accent ?? "text-foreground",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p> : null}
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

  return (
    <aside
      className={cn(
        "flex flex-col gap-4 rounded-sm bg-card shadow-sm",
        nsdBorder,
        className,
      )}
    >
      <div className="border-b border-border bg-muted/40 px-4 py-3.5 sm:px-5">
        <p className={nsdKicker}>Live summary</p>
        <p className="mt-1 font-heading text-sm font-semibold tracking-tight text-foreground">
          Before you post
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Totals update as you enter quantities and prices.
        </p>
      </div>

      <div className="space-y-3 px-4 sm:px-5">
        <div className="flex items-start gap-3 rounded-sm border border-border bg-muted/20 px-3 py-2.5">
          <Truck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Supplier
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              {supplierName ?? "Not selected"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              Receiving at {branchName || "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <SummaryMetric
            label="Lines ready"
            value={String(lineStats.valid)}
            sub={`${lineStats.withQty} with qty · ${lineStats.totalRows} total`}
          />
          <SummaryMetric
            label="Payable"
            value={estimatedProfit.cost.toFixed(2)}
            sub="Buying × qty"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <SummaryMetric
            label="Retail value"
            value={estimatedProfit.revenue.toFixed(2)}
            accent="text-emerald-700 dark:text-emerald-300"
          />
          <SummaryMetric
            label="Net margin"
            value={`${marginPct}%`}
            sub={`Profit ${netProfit.toFixed(2)}`}
            accent={
              netProfit >= 0
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-red-600 dark:text-red-400"
            }
          />
        </div>

        {extrasTotal > 0 ? (
          <SummaryMetric
            label="Extra costs"
            value={extrasTotal.toFixed(2)}
            sub="Added to batch after post"
          />
        ) : null}
      </div>

      <div
        className={cn(
          "mx-4 mb-4 mt-1 flex items-start gap-2.5 rounded-sm border px-3 py-2.5 text-xs sm:mx-5",
          canPost
            ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
            : "border-border bg-muted/25 text-muted-foreground",
        )}
      >
        <PackagePlus className="size-4 shrink-0" aria-hidden />
        <p className="leading-relaxed">
          {canPost
            ? "Ready to post — stock and payables will update for this branch."
            : "Select a supplier and enter quantity + buying price on at least one line."}
        </p>
      </div>

      <div className="hidden border-t border-border bg-muted/20 px-4 py-3 sm:block sm:px-5">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <TrendingUp className="size-3.5 shrink-0" aria-hidden />
          Shelf prices apply after post when you have permission.
        </div>
      </div>
    </aside>
  );
}
