"use client";

import { ArrowRight, Building2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useBranchOnHand } from "../_hooks/useBranchOnHand";
import { formatAmount, toNumber } from "../_utils";
import { ProductFormField } from "./ProductFormField";
import {
  productFormGrid2Class,
  productFormInputClass,
  productFormPreviewClass,
  productFormSectionClass,
  productFormSectionTitleClass,
  productFormSelectClass,
  productFormStackClass,
} from "./product-form-styles";

type Branch = { id: string; name: string };

type Props = {
  branches: Branch[];
  branchId: string;
  onBranchIdChange: (id: string) => void;
  quantity: string;
  onQuantityChange: (value: string) => void;
  unitCost: string;
  onUnitCostChange: (value: string) => void;
  /** When set, on-hand is loaded for the selected branch. */
  itemId?: string | null;
  /** Catalog / supplier buying price used to prefill and show "current". */
  currentUnitCost?: number | null;
  /** New product: on-hand starts at 0 (opening stock on create). */
  mode?: "add" | "opening";
  unitCostLabel?: string;
  unitCostHint?: string;
  catalogCostLabel?: string;
  receiptCostLabel?: string;
  className?: string;
  hint?: string;
  /** Hide helper copy and cost prefill notes (e.g. new product drawer). */
  minimal?: boolean;
  /** Hide the unit cost column — parent shows derived cost from pricing instead */
  hideUnitCostInput?: boolean;
};

function previewArrow() {
  return (
    <ArrowRight
      className="size-3 shrink-0 text-muted-foreground/50"
      aria-hidden
    />
  );
}

function formatQty(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function PreviewStat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <span className={productFormPreviewClass}>
      <span className="text-muted-foreground/80">{label}</span>{" "}
      <span
        className={cn(
          "font-medium tabular-nums",
          strong ? "text-foreground" : "text-foreground/90",
        )}
      >
        {value}
      </span>
    </span>
  );
}

export function StockIncreaseFields({
  branches,
  branchId,
  onBranchIdChange,
  quantity,
  onQuantityChange,
  unitCost,
  onUnitCostChange,
  itemId,
  currentUnitCost = null,
  mode = "add",
  unitCostLabel,
  unitCostHint,
  catalogCostLabel,
  receiptCostLabel,
  className,
  hint,
  minimal = false,
  hideUnitCostInput = false,
}: Props) {
  const isOpening = mode === "opening";
  const defaultHint = minimal
    ? ""
    : isOpening
      ? "Optional — recorded when the product is created at the selected branch."
      : "Adds to on-hand at the selected branch. Use Add stock, or fill qty in the edit drawer and Save changes.";
  const resolvedHint = hint ?? defaultHint;

  const branchName =
    branches.find((b) => b.id === branchId)?.name?.trim() || null;
  const { onHand: fetchedOnHand, loading: onHandLoading } = useBranchOnHand(
    itemId,
    branchId,
    !isOpening && !!itemId?.trim(),
  );
  const onHand = isOpening ? 0 : fetchedOnHand;

  const addQty = toNumber(quantity.trim());
  const receiptUnitCost = toNumber(unitCost.trim());
  const hasAddQty =
    addQty != null && Number.isFinite(addQty) && addQty > 0;
  const newOnHand =
    onHand != null && hasAddQty ? onHand + addQty! : null;

  const catalogCost = currentUnitCost;
  const showCostPreview =
    catalogCost != null || receiptUnitCost != null;

  return (
    <div className={cn(productFormSectionClass, className)}>
      {!minimal ? (
        <p className={cn("flex items-center gap-1.5", productFormSectionTitleClass)}>
          <Building2 className="size-3" aria-hidden />
          {isOpening ? "Opening stock" : "Add stock"}
        </p>
      ) : null}
      {resolvedHint ? (
        <p className="text-[10px] leading-snug text-muted-foreground">
          {resolvedHint}
        </p>
      ) : null}
      <div className={cn(minimal ? "flex flex-col gap-2" : productFormStackClass)}>
        <ProductFormField label="Branch" required>
          <select
            className={productFormSelectClass}
            value={branchId}
            onChange={(e) => onBranchIdChange(e.target.value)}
          >
            <option value="">— Select branch —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </ProductFormField>

        <div className={cn(hideUnitCostInput ? "max-w-sm" : productFormGrid2Class)}>
          <ProductFormField
            label={isOpening ? "Opening qty" : "Qty to add"}
            required={!isOpening}
            hint={
              minimal
                ? undefined
                : isOpening
                  ? "New product — starts at 0"
                  : branchId
                    ? branchName
                      ? `On-hand at ${branchName}`
                      : "On-hand at branch"
                    : "Select a branch first"
            }
          >
            <input
              className={productFormInputClass}
              inputMode="decimal"
              placeholder="e.g. 10"
              value={quantity}
              onChange={(e) => onQuantityChange(e.target.value)}
            />
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {isOpening || branchId ? (
                !isOpening && onHandLoading ? (
                  <span className={productFormPreviewClass}>Loading stock…</span>
                ) : (
                  <>
                    <PreviewStat
                      label="On hand"
                      value={formatQty(onHand ?? 0)}
                    />
                    {hasAddQty ? (
                      <>
                        {previewArrow()}
                        <PreviewStat
                          label={isOpening ? "After create" : "After"}
                          value={formatQty(newOnHand)}
                          strong
                        />
                        <span className={productFormPreviewClass}>
                          (+{formatQty(addQty)})
                        </span>
                      </>
                    ) : minimal ? null : (
                      <span className={productFormPreviewClass}>
                        {isOpening
                          ? "Enter opening qty to preview on-hand"
                          : "Enter qty to preview new on-hand"}
                      </span>
                    )}
                  </>
                )
              ) : minimal ? null : (
                <span className={productFormPreviewClass}>
                  Select branch to see current stock
                </span>
              )}
            </div>
          </ProductFormField>

          {!hideUnitCostInput ? (
          <ProductFormField
            label={
              unitCostLabel ??
              (minimal ? "Unit cost" : isOpening ? "Cost per unit received" : "Unit cost")
            }
            required={!isOpening}
            hint={
              minimal
                ? undefined
                : unitCostHint ??
                  (isOpening
                    ? "Values this stock batch in inventory — usually buy price ÷ pack qty"
                    : "Cost per unit for this stock-in")
            }
          >
            <input
              className={productFormInputClass}
              inputMode="decimal"
              placeholder={
                catalogCost != null ? formatAmount(catalogCost) : "0.00"
              }
              value={unitCost}
              onChange={(e) => onUnitCostChange(e.target.value)}
            />
            {showCostPreview && !minimal ? (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <PreviewStat
                  label={
                    catalogCostLabel ??
                    (isOpening ? "Catalog cost / unit" : "Buying price")
                  }
                  value={formatAmount(catalogCost ?? 0)}
                />
                {receiptUnitCost != null &&
                Number.isFinite(receiptUnitCost) &&
                unitCost.trim() !== "" ? (
                  <>
                    {previewArrow()}
                    <PreviewStat
                      label={
                        receiptCostLabel ??
                        (isOpening ? "This delivery" : "This receipt")
                      }
                      value={formatAmount(receiptUnitCost)}
                      strong
                    />
                  </>
                ) : (
                  <span className={productFormPreviewClass}>
                    {isOpening
                      ? "Prefilled from buy price ÷ pack qty — change if landed cost differs"
                      : "Prefilled from catalog — edit if this receipt differs"}
                  </span>
                )}
              </div>
            ) : null}
          </ProductFormField>
          ) : null}
        </div>
      </div>
    </div>
  );
}
