"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ItemSummaryRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  nsdLineCardReady,
  nsdLineCardShell,
} from "./new-supply-drawer-ui";
import { ProductPickCell } from "./product-pick-cell";
import {
  SupplyCostCell,
  SupplyExpiryCell,
  SupplyQtyCell,
  SupplyStockCell,
} from "./supply-line-metric-cells";
import type { SupplyPackQtyDefaults } from "./supply-pack-qty-modal";
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
  onQtyEnterNext?: () => void;
  onFocusCost?: () => void;
  onFocusRetail?: () => void;
  onFocusExpiry?: () => void;
  /** Receive date YYYY-MM-DD for shelf-life chips. */
  receivedYmd: string;
  packDefaults?: SupplyPackQtyDefaults | null;
  onPackModalOpenChange?: (open: boolean) => void;
};

/**
 * Compact mobile receiving ticket — stock + qty / cost / retail, expiry with +Nd.
 */
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
  onQtyEnterNext,
  onFocusCost,
  onFocusRetail,
  onFocusExpiry,
  receivedYmd,
  packDefaults = null,
  onPackModalOpenChange,
}: SupplyDraftLineCardProps) {
  const [moreOpen, setMoreOpen] = useState(Boolean(row.expiry.trim()));

  return (
    <article
      className={cn(
        nsdLineCardShell,
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150",
        isReady && nsdLineCardReady,
      )}
    >
      <div className="flex items-start gap-2 px-2.5 py-2">
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
            <h4 className="break-words text-[13px] font-semibold leading-snug tracking-tight text-foreground">
              {label}
            </h4>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
            {barcode !== "—" ? (
              <span className="font-mono">{barcode}</span>
            ) : null}
            {stock != null && !canEditStock ? (
              <span>
                Stock{" "}
                <span
                  className={cn(
                    "font-mono tabular-nums",
                    stock <= 0
                      ? "font-semibold text-red-700 dark:text-red-300"
                      : "text-foreground",
                  )}
                >
                  {Number.isInteger(stock) ? stock : stock.toFixed(2)}
                </span>
                {stockAfter != null && qty != null ? (
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
              </span>
            ) : null}
            {lineTotal != null ? (
              <span className="font-mono tabular-nums">
                Σ {lineTotal.toFixed(2)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isReady ? (
            <span className="rounded-sm bg-primary/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
              Ready
            </span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:bg-destructive/10"
            disabled={busy}
            aria-label="Remove line"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {canEditStock ? (
        <div className="border-t border-border/70 px-2 pb-1.5 pt-1.5">
          <SupplyStockCell
            touch
            label="On hand"
            stock={stock}
            reorderLevel={reorderLevel}
            canEdit={canEditStock}
            itemId={itemId}
            branchId={branchId}
            unitCostHint={unitCost ?? referenceCost}
            disabled={busy}
            onStockChange={onStockChange}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-1.5 border-t border-border/70 px-2 pb-2 pt-1.5">
        <SupplyQtyCell
          touch
          label="Qty"
          value={row.qtyStr}
          onChange={onQtyChange}
          onUnitCostChange={onUnitChange}
          disabled={busy}
          isReady={isReady}
          packDefaults={packDefaults}
          onPackModalOpenChange={onPackModalOpenChange}
          onEnterCost={onFocusCost}
          onEnterNext={onQtyEnterNext}
        />
        <SupplyCostCell
          touch
          label="Cost"
          value={row.unitStr}
          onChange={onUnitChange}
          disabled={busy}
          referenceCost={referenceCost}
          onEnterNext={onFocusRetail}
        />
        <SupplyShelfPriceCell
          touch
          label="Sell"
          value={row.sellPriceStr}
          onChange={onSellPriceChange}
          disabled={busy || !hasItemId}
          canSetSellPrice={canSetSellPrice}
          hint={pricingHint}
          unitStr={row.unitStr}
          sellPriceTouched={row.sellPriceTouched}
          onEnterNext={() => {
            setMoreOpen(true);
            onFocusExpiry?.();
          }}
        />
      </div>

      <div className="border-t border-border/50">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left touch-manipulation"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((o) => !o)}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {row.expiry.trim() ? `Expires ${row.expiry}` : "Expiry (optional)"}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
              moreOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        {moreOpen ? (
          <div className="border-t border-border/50 px-2.5 pb-2.5 pt-2">
            <SupplyExpiryCell
              touch
              value={row.expiry}
              onChange={onExpiryChange}
              disabled={busy}
              baseYmd={receivedYmd}
              onEnterNext={onQtyEnterNext}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
