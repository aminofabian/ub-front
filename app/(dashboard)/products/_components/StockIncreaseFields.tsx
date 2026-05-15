"use client";

import { Building2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { ProductFormField } from "./ProductFormField";
import {
  productFormGrid2Class,
  productFormInputClass,
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
  className?: string;
  hint?: string;
};

export function StockIncreaseFields({
  branches,
  branchId,
  onBranchIdChange,
  quantity,
  onQuantityChange,
  unitCost,
  onUnitCostChange,
  className,
  hint = "Adds to on-hand stock at the selected branch. Use Add stock — Save changes does not apply here.",
}: Props) {
  return (
    <div className={cn(productFormSectionClass, className)}>
      <p className={cn("flex items-center gap-1.5", productFormSectionTitleClass)}>
        <Building2 className="size-3" aria-hidden />
        Add stock
      </p>
      {hint ? (
        <p className="text-[10px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
      <div className={productFormStackClass}>
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
        <div className={productFormGrid2Class}>
          <ProductFormField label="Qty to add" required>
            <input
              className={productFormInputClass}
              inputMode="decimal"
              placeholder="e.g. 10"
              value={quantity}
              onChange={(e) => onQuantityChange(e.target.value)}
            />
          </ProductFormField>
          <ProductFormField label="Unit cost" required>
            <input
              className={productFormInputClass}
              inputMode="decimal"
              placeholder="0.00"
              value={unitCost}
              onChange={(e) => onUnitCostChange(e.target.value)}
            />
          </ProductFormField>
        </div>
      </div>
    </div>
  );
}
