"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ItemSummaryRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  supFormCellInput,
  supTableCell,
  supTableRow,
} from "../../../suppliers/_components/supplier-ui-tokens";

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
    <tr className={supTableRow}>
      <td className={cn(supTableCell, "min-w-[10rem] align-top")}>
        <p className="max-w-[18rem] truncate text-sm font-medium leading-tight text-foreground">
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
      </td>
      <td className={cn(supTableCell, "w-[5.5rem] p-0 align-top")}>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          className={cn(
            supFormCellInput,
            "h-8 w-full text-right tabular-nums disabled:opacity-60",
          )}
          placeholder="Qty"
          value={row.qty}
          disabled={!canWrite || row.saving}
          onChange={(e) => onQtyChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
          }}
          aria-label={`Quantity for ${name}`}
        />
      </td>
      <td className={cn(supTableCell, "w-[5.5rem] p-0 align-top")}>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          className={cn(
            supFormCellInput,
            "h-8 w-full text-right tabular-nums disabled:opacity-60",
          )}
          placeholder="Cost"
          value={row.cost}
          disabled={!canWrite || row.saving}
          onChange={(e) => onCostChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
          }}
          aria-label={`Unit cost for ${name}`}
        />
      </td>
      <td className={cn(supTableCell, "w-[4.5rem] p-0 text-right align-middle")}>
        <Button
          type="button"
          size="sm"
          className="h-8 w-full rounded-none px-2 text-xs sm:w-auto"
          onClick={onSave}
          disabled={!canWrite || row.saving || !row.qty.trim()}
          aria-label={`Save restock for ${name}`}
        >
          {row.saving ? (
            <span>…</span>
          ) : (
            <>
              <Check className="size-3.5 sm:mr-1" aria-hidden />
              <span className="hidden sm:inline">Save</span>
            </>
          )}
        </Button>
      </td>
    </tr>
  );
}
