"use client";

import { cn } from "@/lib/utils";
import type { ParentDraft } from "../_types";
import { formatAmount } from "../_utils";
import {
  productFormFieldClass,
  productFormHintClass,
  productFormInputClass,
  productFormLabelClass,
} from "./product-form-styles";

type Props = {
  draft: ParentDraft;
  setDraft: React.Dispatch<React.SetStateAction<ParentDraft>>;
  syncCostsFromBuyingPrice: (buyingPrice: string, prev: ParentDraft) => ParentDraft;
  currencyCode: string;
  marginInfo: {
    profit: number;
    margin: number;
    valid: boolean;
  } | null;
  isWeighed?: boolean;
};

export function ProductCreatePricingSection({
  draft,
  setDraft,
  syncCostsFromBuyingPrice,
  currencyCode,
  marginInfo,
  isWeighed = false,
}: Props) {
  const cur = currencyCode ? ` · ${currencyCode}` : "";
  const sellLabel = isWeighed ? `Selling price / kg${cur}` : `Selling price${cur}`;
  const valid = marginInfo?.valid;

  return (
    <div className="space-y-3">
      <label className={cn(productFormFieldClass, "gap-1.5")}>
        <span className={productFormLabelClass}>{sellLabel}</span>
        <input
          type="number"
          inputMode="decimal"
          className={cn(productFormInputClass, "w-full")}
          placeholder="0.00"
          value={draft.bundlePrice}
          onChange={(e) => setDraft((p) => ({ ...p, bundlePrice: e.target.value }))}
          required
        />
      </label>
      <label className={cn(productFormFieldClass, "gap-1.5")}>
        <span className="flex items-baseline justify-between gap-2">
          <span className={productFormLabelClass}>Cost price{cur}</span>
          <span className={productFormHintClass}>Optional</span>
        </span>
        <input
          type="number"
          inputMode="decimal"
          className={cn(productFormInputClass, "w-full")}
          placeholder="0.00"
          value={draft.buyingPrice}
          onChange={(e) => setDraft((p) => syncCostsFromBuyingPrice(e.target.value, p))}
        />
      </label>
      {valid ? (
        <p className={cn(productFormHintClass, "tabular-nums")} aria-live="polite">
          {marginInfo.margin.toFixed(0)}% margin · {formatAmount(marginInfo.profit)}
          {currencyCode ? ` ${currencyCode}` : ""} profit
        </p>
      ) : null}
    </div>
  );
}
