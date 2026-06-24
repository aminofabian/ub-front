"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ItemSummaryRecord } from "@/lib/api";

export type RestockRow = {
  item: ItemSummaryRecord;
  qty: string;
  cost: string;
  saving: boolean;
};

type RestockRowItemProps = {
  row: RestockRow;
  canWrite: boolean;
  onQtyChange: (value: string) => void;
  onCostChange: (value: string) => void;
  onSave: () => void;
};

export function RestockRowItem({
  row,
  canWrite,
  onQtyChange,
  onCostChange,
  onSave,
}: RestockRowItemProps) {
  const name = row.item.name?.trim() || "Unnamed product";
  const sku = row.item.sku?.trim();
  const variant = row.item.variantName?.trim();

  return (
    <div className="flex min-w-0 items-center gap-2 px-2.5 py-1.5 sm:gap-3 sm:px-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-tight text-foreground">
          {name}
          {variant ? (
            <span className="ml-1 font-normal text-muted-foreground">
              {variant}
            </span>
          ) : null}
        </p>
        {sku ? (
          <p className="truncate font-mono text-[10px] leading-tight text-muted-foreground">
            {sku}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          className="h-8 w-[3.25rem] rounded-md border border-border bg-background px-1.5 text-right text-xs tabular-nums disabled:opacity-60 sm:w-14 sm:text-sm"
          placeholder="Qty"
          value={row.qty}
          disabled={!canWrite || row.saving}
          onChange={(e) => onQtyChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
          }}
          aria-label={`Quantity for ${name}`}
        />
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          className="h-8 w-[3.25rem] rounded-md border border-border bg-background px-1.5 text-right text-xs tabular-nums disabled:opacity-60 sm:w-14 sm:text-sm"
          placeholder="Cost"
          value={row.cost}
          disabled={!canWrite || row.saving}
          onChange={(e) => onCostChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
          }}
          aria-label={`Unit cost for ${name}`}
        />
        <Button
          type="button"
          size="sm"
          className="h-8 w-8 shrink-0 p-0 sm:w-auto sm:px-2.5"
          onClick={onSave}
          disabled={!canWrite || row.saving || !row.qty.trim()}
          aria-label={`Save restock for ${name}`}
        >
          {row.saving ? (
            <span className="text-xs">…</span>
          ) : (
            <>
              <Check className="size-3.5 sm:hidden" aria-hidden />
              <span className="hidden text-xs sm:inline">Save</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
