"use client";

import { useState } from "react";
import { ChevronDown, Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { YmdDateInput } from "@/components/ymd-date-input";
import type { ItemSummaryRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  nsdFieldLabel,
  nsdLineCardReady,
  nsdLineCardShell,
} from "./new-supply-drawer-ui";
import { ProductPickCell } from "./product-pick-cell";
import {
  SupplyCostCell,
  SupplyLineTotalCell,
  SupplyQtyCell,
  SupplyStockAfterCell,
  SupplyStockCell,
} from "./supply-line-metric-cells";
import {
  SupplyShelfPriceCell,
  type ShelfPriceHint,
} from "./supply-shelf-price-cell";

type DraftLineRow = {
  key: string;
  source: "linked" | "adhoc";
  item: ItemSummaryRecord | null;
  qtyStr: string;
  unitStr: string;
  sellPriceStr: string;
  sellPriceTouched: boolean;
  expiry: string;
};

type SupplyDraftLineCardProps = {
  row: DraftLineRow;
  label: string;
  barcode: string;
  busy: boolean;
  canSetSellPrice: boolean;
  isReady: boolean;
  stock: number | null;
  stockAfter: number | null;
  reorderLevel?: number | null;
  lineTotal: number | null;
  qty: number | null;
  unitCost: number | null;
  referenceCost?: number | null;
  pricingHint?: ShelfPriceHint;
  onQtyChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  onSellPriceChange: (value: string) => void;
  onExpiryChange: (value: string) => void;
  onItemChange: (item: ItemSummaryRecord | null) => void;
  onRemove: () => void;
  hasItemId: boolean;
  branchId?: string;
  canEditStock?: boolean;
  itemId?: string | null;
  onStockChange?: (nextStock: number) => void;
};

function bumpQty(raw: string, delta: number): string {
  const t = raw.trim();
  const current = t ? Number(t) : 0;
  if (!Number.isFinite(current)) {
    return delta > 0 ? "1" : "";
  }
  const next = Math.round((current + delta) * 1000) / 1000;
  if (next <= 0) {
    return "";
  }
  return Number.isInteger(next) ? String(next) : String(next);
}

export function SupplyDraftLineCard({
  row,
  label,
  barcode,
  busy,
  canSetSellPrice,
  isReady,
  stock,
  stockAfter,
  reorderLevel = null,
  lineTotal,
  qty,
  unitCost,
  referenceCost = null,
  pricingHint,
  onQtyChange,
  onUnitChange,
  onSellPriceChange,
  onExpiryChange,
  onItemChange,
  onRemove,
  hasItemId,
  branchId,
  canEditStock = false,
  itemId = null,
  onStockChange,
}: SupplyDraftLineCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const showBatchHint = Boolean(row.expiry.trim()) || detailsOpen;

  return (
    <article
      className={cn(
        nsdLineCardShell,
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200",
        isReady && nsdLineCardReady,
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-border/80 bg-muted/25 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          {row.source === "adhoc" ? (
            <ProductPickCell
              sharp
              branchId={branchId}
              item={row.item}
              disabled={busy}
              onItemChange={onItemChange}
            />
          ) : (
            <h4 className="break-words text-[15px] font-semibold leading-snug tracking-tight text-foreground">
              {label}
            </h4>
          )}
          {barcode !== "—" ? (
            <p className="mt-0.5 break-all font-mono text-[10px] leading-snug text-muted-foreground">
              {barcode}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {isReady ? (
            <span className="rounded-sm bg-primary/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
              Ready
            </span>
          ) : (
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
              Fill
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-destructive hover:bg-destructive/10"
            disabled={busy}
            aria-label="Remove line"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3.5 p-3">
        {/* Qty — primary thumb action */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className={nsdFieldLabel}>Quantity received</p>
            {stock != null ? (
              <p className="text-[11px] text-muted-foreground">
                On hand{" "}
                <span className="font-mono tabular-nums text-foreground">
                  {Number.isInteger(stock) ? stock : stock.toFixed(2)}
                </span>
                {stockAfter != null ? (
                  <>
                    {" "}
                    →{" "}
                    <span className="font-mono font-semibold tabular-nums text-primary">
                      {Number.isInteger(stockAfter)
                        ? stockAfter
                        : stockAfter.toFixed(2)}
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              disabled={busy || !row.qtyStr.trim()}
              aria-label="Decrease quantity"
              onClick={() => onQtyChange(bumpQty(row.qtyStr, -1))}
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-foreground",
                "transition-colors active:scale-95 active:bg-muted",
                "disabled:pointer-events-none disabled:opacity-40",
                "touch-manipulation",
              )}
            >
              <Minus className="size-5" strokeWidth={2.5} />
            </button>
            <div className="min-w-0 flex-1">
              <SupplyQtyCell
                touch
                value={row.qtyStr}
                onChange={onQtyChange}
                disabled={busy}
                isReady={isReady}
              />
            </div>
            <button
              type="button"
              disabled={busy}
              aria-label="Increase quantity"
              onClick={() => onQtyChange(bumpQty(row.qtyStr, 1))}
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-sm border border-primary/35 bg-primary/10 text-primary",
                "transition-colors active:scale-95 active:bg-primary/20",
                "disabled:pointer-events-none disabled:opacity-40",
                "touch-manipulation",
              )}
            >
              <Plus className="size-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Cost + Shelf — side by side, large */}
        <div className="grid grid-cols-2 gap-2.5">
          <SupplyCostCell
            touch
            label="Unit cost"
            value={row.unitStr}
            onChange={onUnitChange}
            disabled={busy}
            referenceCost={referenceCost}
          />
          <SupplyShelfPriceCell
            touch
            label="Shelf"
            value={row.sellPriceStr}
            onChange={onSellPriceChange}
            disabled={busy || !hasItemId}
            canSetSellPrice={canSetSellPrice}
            hint={pricingHint}
            unitStr={row.unitStr}
            sellPriceTouched={row.sellPriceTouched}
          />
        </div>

        <SupplyLineTotalCell
          touch
          label="Line total"
          total={lineTotal}
          qty={qty}
          unitCost={unitCost}
          isReady={isReady}
        />

        {/* Secondary: stock / expiry — collapsed by default */}
        <div className="overflow-hidden rounded-sm border border-border/70 bg-muted/15">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-2.5 py-2.5 text-left touch-manipulation"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((o) => !o)}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {showBatchHint && row.expiry.trim()
                ? `Expiry · ${row.expiry}`
                : "Stock & expiry"}
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                detailsOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>
          {detailsOpen ? (
            <div className="space-y-3 border-t border-border/60 px-2.5 pb-3 pt-2.5">
              <div className="grid grid-cols-2 gap-2">
                <SupplyStockCell
                  touch
                  label="Stock"
                  stock={stock}
                  reorderLevel={reorderLevel}
                  canEdit={canEditStock}
                  itemId={itemId}
                  branchId={branchId}
                  unitCostHint={unitCost ?? referenceCost}
                  disabled={busy}
                  onStockChange={onStockChange}
                />
                <SupplyStockAfterCell
                  touch
                  label="After"
                  stock={stock}
                  stockAfter={stockAfter}
                  qty={qty}
                />
              </div>
              <div className="space-y-1">
                <p className={nsdFieldLabel}>Expiry (optional)</p>
                <YmdDateInput
                  value={row.expiry}
                  onValueChange={onExpiryChange}
                  disabled={busy}
                  placeholder="YYYY-MM-DD"
                  aria-label="Expiry date"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
