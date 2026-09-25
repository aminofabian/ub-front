"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { FormDrawer } from "@/components/form-drawer";
import { fmtMoney } from "@/lib/business-hub/formatters";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchMarginLeaks,
  type MarginLeakRow,
  type MarginLeaksResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

function countLabel(n: number, one: string, many: string): string {
  const shown = Number.isInteger(n)
    ? n.toLocaleString("en-KE")
    : n.toLocaleString("en-KE", { maximumFractionDigits: 2 });
  return `${shown} ${n === 1 ? one : many}`;
}

/** Sale quantity is stored in stock units. Packs need to be said as packs. */
function saleLine(row: MarginLeakRow): string {
  const qty = toNum(row.quantitySold);
  const revenue = fmtMoney(toNum(row.netRevenue));
  const units = toNum(row.unitsPerPack);
  const source = row.stockSourceName?.trim();
  if (units > 1 && source) {
    const packs = qty / units;
    return `${countLabel(packs, "pack", "packs")} sold · ${countLabel(qty, "unit", "units")} of ${source} left the shelf · ${revenue} taken in`;
  }
  return `${countLabel(qty, "sold", "sold")} · ${revenue} taken in`;
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

function BridgeRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={
          strong ? "font-semibold text-foreground" : "text-muted-foreground"
        }
      >
        {label}
      </span>
      <span
        className={cn(
          "font-mono tabular-nums",
          strong && "font-semibold",
          value < 0 ? "text-rose-700" : "text-foreground",
        )}
      >
        {fmtMoney(value)}
      </span>
    </div>
  );
}

/**
 * Reconciles the card with the item list: `grossProfit = listed + removed + airtime + refunds`.
 * Without it a card can be negative while the list looks empty or unrelated.
 */
function MarginBridgeCard({ data }: { data: MarginLeaksResponse | null }) {
  if (!data) return null;
  // The card now nets refunds, so anchor on the same net figure. `listed` already excludes
  // refunded profit, so listed + removed + airtime add up to this value.
  const refunds = toNum(data.refundsInWindow);
  const net = toNum(data.grossProfit) - refunds;
  return (
    <div className="space-y-1 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 py-2 text-[11px]">
      <BridgeRow label="Gross profit (net of refunds)" value={net} strong />
      <div className="space-y-1 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pt-1">
        <BridgeRow label="Items" value={toNum(data.listedProfit)} />
        <BridgeRow
          label="Removed products"
          value={toNum(data.removedItemsProfit)}
        />
        <BridgeRow label="Airtime" value={toNum(data.airtimeProfit)} />
      </div>
      <p className="pt-1 leading-snug text-muted-foreground">
        These add up to gross profit. “Items” is the whole product list (winners
        included), not only the losses below.
        {refunds !== 0
          ? ` Refunds of ${fmtMoney(refunds)} are already netted out.`
          : ""}
      </p>
    </div>
  );
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
  const [data, setData] = useState<MarginLeaksResponse | null>(null);
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
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setData(null);
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

  const rows = data?.rows ?? [];
  const totalLoss = Math.abs(
    rows.reduce((sum, r) => sum + toNum(r.netProfit), 0),
  );

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
        ) : (
          <>
            <MarginBridgeCard data={data} />
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No loss-making items in this window — every line sold at or above
                cost. The breakdown above shows how gross profit is made up;{" "}
                <Link
                  href={APP_ROUTES.inventoryCostIssues}
                  className="font-semibold underline"
                >
                  Cost issues
                </Link>{" "}
                lists products whose cost looks wrong.
              </p>
            ) : (
              <>
                <p className="text-xs font-medium text-muted-foreground">
                  {rows.length} loss-making {rows.length === 1 ? "item" : "items"}{" "}
                  · {fmtMoney(totalLoss)} total loss
                </p>
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
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          {saleLine(row)}
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
              </>
            )}
          </>
        )}
        <p className="text-[11px] leading-snug text-muted-foreground">
          A pack can show a healthy margin and still lose money: the margin is
          the pack price against the pack cost, while profit uses every unit
          that left the shelf.{" "}
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
