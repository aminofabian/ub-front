"use client";

import { Boxes, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  productFormGrid2Class,
  productFormInputClass,
  productFormLabelClass,
} from "./product-form-styles";
import { type PackageDraft, emptyPackageDraft } from "../_types";

type Props = {
  /** When false, only the package rows are shown (for modals). */
  showEnableToggle?: boolean;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  rows: PackageDraft[];
  onRowsChange: (rows: PackageDraft[]) => void;
  baseUnitHint?: string;
  currencyCode?: string;
  className?: string;
};

function Label({
  title,
  children,
  required,
}: {
  title: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={productFormLabelClass}>
        {title}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

export function PackageVariantsSection({
  showEnableToggle = true,
  enabled,
  onEnabledChange,
  rows,
  onRowsChange,
  baseUnitHint = "base unit",
  currencyCode = "",
  className,
}: Props) {
  const updateRow = (index: number, patch: Partial<PackageDraft>) => {
    onRowsChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => onRowsChange([...rows, emptyPackageDraft()]);

  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      onRowsChange([emptyPackageDraft()]);
      return;
    }
    onRowsChange(rows.filter((_, i) => i !== index));
  };

  const showRows = showEnableToggle ? enabled : true;

  return (
    <div
      className={cn(
        showEnableToggle &&
          "rounded-2xl border border-border/55 bg-muted/15 p-4 shadow-sm ring-1 ring-black/[0.02]",
        className,
      )}
    >
      {showEnableToggle ? (
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 rounded border-input"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Boxes className="size-4 text-primary" />
              Sell in different units
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              Add selling units (single, tray, crate, …) with their own price and barcode. Stock is
              shared with this product — e.g. 1 tray = 30 {baseUnitHint}s deducted from the same
              inventory.
            </span>
          </span>
        </label>
      ) : null}

      {showRows ? (
        <div
          className={cn(
            "space-y-3",
            showEnableToggle && "mt-4 border-t border-border/40 pt-4",
          )}
        >
          {rows.map((row, index) => (
            <div
              key={index}
              className="rounded-xl border border-border/50 bg-card/80 p-3 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Package {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-muted-foreground"
                  onClick={() => removeRow(index)}
                >
                  <Trash2 className="size-3" />
                  Remove
                </Button>
              </div>
              <div className={cn(productFormGrid2Class, "gap-3")}>
                <Label title="Package name" required>
                  <input
                    className={productFormInputClass}
                    placeholder="e.g. Tray of 30"
                    value={row.name}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                  />
                </Label>
                <Label title={`Conversion (${baseUnitHint}s per unit)`} required>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className={productFormInputClass}
                    placeholder="30"
                    value={row.unitsPerPackage}
                    onChange={(e) =>
                      updateRow(index, { unitsPerPackage: e.target.value })
                    }
                  />
                </Label>
                <Label title={`Price per package${currencyCode ? ` (${currencyCode})` : ""}`}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={productFormInputClass}
                    placeholder="0.00"
                    value={row.price}
                    onChange={(e) => updateRow(index, { price: e.target.value })}
                  />
                </Label>
                <Label title="SKU (optional)">
                  <input
                    className={productFormInputClass}
                    value={row.sku}
                    onChange={(e) => updateRow(index, { sku: e.target.value })}
                  />
                </Label>
                <Label title="Barcode (optional)">
                  <input
                    className={productFormInputClass}
                    value={row.barcode}
                    onChange={(e) => updateRow(index, { barcode: e.target.value })}
                  />
                </Label>
              </div>
              {row.unitsPerPackage.trim() && Number(row.unitsPerPackage) > 0 ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Selling 1× {row.name.trim() || "this package"} deducts{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {row.unitsPerPackage}
                  </span>{" "}
                  {baseUnitHint}
                  {Number(row.unitsPerPackage) !== 1 ? "s" : ""} from stock.
                </p>
              ) : null}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={addRow}
          >
            <Plus className="size-3.5" />
            Add another package
          </Button>
        </div>
      ) : null}
    </div>
  );
}
