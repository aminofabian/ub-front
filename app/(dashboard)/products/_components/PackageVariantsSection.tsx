"use client";

import { Boxes, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  productFormGrid2Class,
  productFormHintClass,
  productFormInputClass,
  productFormLabelClass,
  productFormRequiredClass,
  productFormSectionTitleClass,
} from "./product-form-styles";
import { type PackageDraft, emptyPackageDraft } from "../_types";

type Props = {
  /** When false, only the package rows are shown (for modals). */
  showEnableToggle?: boolean;
  compact?: boolean;
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
    <label className="flex flex-col gap-1.5">
      <span className={cn(productFormLabelClass, "flex items-center gap-1")}>
        {title}
        {required ? (
          <span className={productFormRequiredClass} aria-hidden>
            *
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

export function PackageVariantsSection({
  showEnableToggle = true,
  compact = false,
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
          cn(
            "rounded-none border border-border bg-muted/10 p-2.5 shadow-none",
            compact && "p-2",
          ),
        className,
      )}
    >
      {showEnableToggle ? (
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            className={cn("size-3.5 rounded-none border-input", compact ? "mt-0.5" : "mt-1")}
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
          />
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "flex items-center gap-1.5 tracking-tight text-foreground",
                compact ? "text-[12px] font-semibold" : "text-[13px] font-semibold",
              )}
            >
              <Boxes className="size-3.5 text-foreground/50" />
              Sell in different units
            </span>
            <span
              className={cn(
                productFormHintClass,
                "mt-0.5 block",
              )}
            >
              {compact
                ? `Shared stock (e.g. 1 tray = 30 ${baseUnitHint}s).`
                : `Add selling units (single, tray, crate, …) with their own price and barcode. Stock is shared with this product — e.g. 1 tray = 30 ${baseUnitHint}s deducted from the same inventory.`}
            </span>
          </span>
        </label>
      ) : null}

      {showRows ? (
        <div
          className={cn(
            compact ? "space-y-2" : "space-y-3",
            showEnableToggle && cn("border-t border-border/40 pt-2", compact ? "mt-2" : "mt-4 pt-4"),
          )}
        >
          {rows.map((row, index) => (
            <div
              key={index}
              className="rounded-none border border-border bg-background p-3 shadow-none"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className={productFormSectionTitleClass}>
                  Package {String(index + 1).padStart(2, "0")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-[11px] font-medium text-foreground/50"
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
                <p className={cn(productFormHintClass, "mt-2")}>
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
