"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { FormDrawer } from "@/components/form-drawer";
import { fmtMoney } from "@/lib/business-hub/formatters";
import { APP_ROUTES } from "@/lib/config";
import { fetchMarginLeaks, type MarginLeakRow } from "@/lib/api";
import { cn } from "@/lib/utils";

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

function reasonLabel(code: string): string {
  switch (code) {
    case "below_cost":
      return "Below cost";
    case "refund":
      return "Refund";
    default:
      return "Margin loss";
  }
}

type MarginLeaksDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  from: string;
  to: string;
  branchId?: string | null;
  itemTypeId?: string | null;
  grossProfit: number;
  periodLabel: string;
};

export function MarginLeaksDrawer({
  open,
  onOpenChange,
  from,
  to,
  branchId,
  itemTypeId,
  grossProfit,
  periodLabel,
}: MarginLeaksDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<MarginLeakRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchMarginLeaks(from, to, {
      branchId: branchId ?? undefined,
      itemTypeId: itemTypeId ?? undefined,
      limit: 25,
    })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setRows([]);
          setError(
            e instanceof Error ? e.message : "Could not load loss-making items.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, from, to, branchId, itemTypeId]);

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Why is profit negative?"
      description={`${periodLabel} · Gross profit ${fmtMoney(grossProfit)}`}
      width="wide"
      appearance="sharp"
      headerDensity="compact"
    >
      <div className="space-y-4 px-1 pb-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Finding loss makers…
          </div>
        ) : error ? (
          <p className="text-sm text-rose-700">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No loss-making items in this window. Gross profit may be dragged by
            aggregate cost timing — check{" "}
            <Link
              href={APP_ROUTES.inventoryCostIssues}
              className="font-semibold underline"
            >
              Cost issues
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
            {rows.map((row) => (
              <li
                key={row.itemId}
                className="flex flex-col gap-1 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {row.itemName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {toNum(row.quantitySold).toLocaleString("en-KE")} sold · Rev{" "}
                    {fmtMoney(toNum(row.netRevenue))}
                    {row.sku ? ` · ${row.sku}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {row.reasons.map((r) => (
                      <span
                        key={r}
                        className="border border-rose-500/30 bg-rose-500/5 px-1.5 py-0.5 text-[10px] font-medium text-rose-800"
                      >
                        {reasonLabel(r)}
                      </span>
                    ))}
                    <span className="text-[10px] text-muted-foreground">
                      {toNum(row.shareOfLossPct).toFixed(0)}% of loss
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "font-mono text-sm font-semibold tabular-nums",
                      toNum(row.netProfit) < 0
                        ? "text-rose-700"
                        : "text-foreground",
                    )}
                  >
                    {fmtMoney(toNum(row.netProfit))}
                  </p>
                  <Link
                    href={`${APP_ROUTES.products}?product=${encodeURIComponent(row.itemId)}&search=${encodeURIComponent(
                      row.sku?.trim() || row.itemName,
                    )}`}
                    onClick={() => onOpenChange(false)}
                    className="text-[11px] font-semibold text-[var(--pos-primary,#0f766e)] underline"
                  >
                    Open product
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground">
          Gross profit is after cost of goods — fixing sell prices or costs stops
          new red weeks.{" "}
          <Link
            href={APP_ROUTES.inventoryCostIssues}
            className="font-semibold underline"
          >
            Cost issues
          </Link>
        </p>
      </div>
    </FormDrawer>
  );
}
