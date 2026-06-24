"use client";

import { Trash2 } from "lucide-react";

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
};

function CardSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className={nsdFieldLabel}>{title}</p>
      {children}
    </div>
  );
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
}: SupplyDraftLineCardProps) {
  return (
    <article
      className={cn(
        nsdLineCardShell,
        isReady && nsdLineCardReady,
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-border/80 bg-muted/25 px-2.5 py-2">
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
            <h4 className="break-words text-sm font-semibold leading-snug text-foreground">
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
            <span className="rounded-sm bg-primary/12 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-primary">
              Ready
            </span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:bg-destructive/10"
            disabled={busy}
            aria-label="Remove line"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 p-2.5">
        <CardSection title="Inventory">
          <div className="grid grid-cols-2 gap-2">
            <SupplyStockCell
              label="Stock"
              stock={stock}
              reorderLevel={reorderLevel}
            />
            <SupplyQtyCell
              label="Qty"
              value={row.qtyStr}
              onChange={onQtyChange}
              disabled={busy}
              isReady={isReady}
            />
            <SupplyStockAfterCell
              label="After"
              stock={stock}
              stockAfter={stockAfter}
              qty={qty}
            />
            <SupplyCostCell
              label="Cost"
              value={row.unitStr}
              onChange={onUnitChange}
              disabled={busy}
              referenceCost={referenceCost}
            />
          </div>
        </CardSection>

        <CardSection title="Pricing">
          <div className="grid grid-cols-2 gap-2">
            <SupplyLineTotalCell
              label="Total"
              total={lineTotal}
              qty={qty}
              unitCost={unitCost}
              isReady={isReady}
            />
            <div className="col-span-2 sm:col-span-1">
              <SupplyShelfPriceCell
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
          </div>
        </CardSection>

        <CardSection title="Batch">
          <YmdDateInput
            value={row.expiry}
            onValueChange={onExpiryChange}
            disabled={busy}
            placeholder="Expiry date (optional)"
            aria-label="Expiry date"
          />
        </CardSection>
      </div>
    </article>
  );
}
