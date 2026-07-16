"use client";

import { PackagePlus, Truck } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  nsdBorder,
  nsdKicker,
  nsdStatTile,
} from "./new-supply-drawer-ui";
import { formatSupplyMoneyCompact } from "./supplies-shared";

function SummaryMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
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
  currency = "KES",
  className,
}: {
  supplierName: string | null;
  branchName: string;
  lineStats: { totalRows: number; withQty: number; valid: number };
  estimatedProfit: { cost: number; revenue: number; profit: number };
  extrasTotal: number;
  canPost: boolean;
  currency?: string;
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
  const money = (n: number) => formatSupplyMoneyCompact(n, currency);

  return (
    <aside
      className={cn(
        "flex flex-col gap-0 overflow-hidden rounded-none bg-card",
        nsdBorder,
        className,
      )}
    >
      <div className="border-b border-border bg-[#e8eef5] px-2.5 py-2 dark:bg-muted/40">
        <p className={nsdKicker}>Summary</p>
      </div>

      <div className="space-y-0 divide-y divide-border">
        <div className="flex items-start gap-2 px-2.5 py-2">
          <Truck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">
              {supplierName ?? "No supplier"}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {branchName || "No branch"}
            </p>
          </div>
        </div>

        <div className="space-y-1 px-2.5 py-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">
              Ready
            </span>
            <span className="font-mono tabular-nums text-foreground">
              {lineStats.valid} of {lineStats.totalRows}
            </span>
          </div>
          <div className="h-1 overflow-hidden bg-muted">
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{ width: `${lineProgress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-0 divide-x divide-border border-t border-border">
          <div className="p-2">
            <SummaryMetric label="Payable" value={money(estimatedProfit.cost)} />
          </div>
          <div className="p-2">
            <SummaryMetric
              label="Sell total"
              value={money(estimatedProfit.revenue)}
              accent="text-primary"
            />
          </div>
        </div>

        {(extrasTotal > 0 || estimatedProfit.revenue > 0) && (
          <div className="grid grid-cols-2 gap-0 divide-x divide-border border-t border-border">
            <div className="p-2">
              <SummaryMetric
                label="Margin"
                value={`${marginPct}%`}
                accent={
                  netProfit >= 0
                    ? "text-primary"
                    : "text-red-600 dark:text-red-400"
                }
              />
            </div>
            <div className="p-2">
              <SummaryMetric label="Extras" value={money(extrasTotal)} />
            </div>
          </div>
        )}
      </div>

      <div
        className={cn(
          "mt-auto flex items-start gap-2 border-t px-2.5 py-2 text-[10px]",
          canPost
            ? "border-primary/35 bg-primary/10 text-foreground"
            : "border-border bg-muted/20 text-muted-foreground",
        )}
      >
        <PackagePlus className="size-4 shrink-0 text-primary" aria-hidden />
        <p className="leading-snug">
          {canPost
            ? "Ready to post this delivery."
            : "Enter qty and cost on at least one line."}
        </p>
      </div>
    </aside>
  );
}
