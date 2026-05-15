"use client";

import { Tag, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ParentDraft } from "../_types";
import {
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
    unitCost: number;
    valid: boolean;
  } | null;
};

function icClass() {
  return productFormInputClass;
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className={cn("flex flex-col gap-1", productFormLabelClass)}>
      <span className="flex items-center gap-1">
        {children}
        {required ? <span className="text-destructive">*</span> : null}
      </span>
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  min,
  step,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: string;
  step?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={cn(icClass(), "w-full")}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      step={step}
    />
  );
}

export function ProductCreatePricingSection({
  draft,
  setDraft,
  syncCostsFromBuyingPrice,
  currencyCode,
  marginInfo,
}: Props) {
  const cur = currencyCode ? ` (${currencyCode})` : "";

  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 via-background to-muted/15 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-2 border-b border-border/35 pb-3">
        <Tag className="size-4 text-primary" aria-hidden />
        <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Pricing
        </span>
        {marginInfo?.valid ? (
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              marginInfo.margin >= 20
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : marginInfo.margin >= 10
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "bg-red-500/10 text-red-700 dark:text-red-400",
            )}
          >
            <TrendingUp className="size-3" aria-hidden />
            {marginInfo.margin.toFixed(1)}%
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Label>
            Pack qty
            <NumberInput
              value={draft.bundleQty}
              onChange={(v) => setDraft((p) => ({ ...p, bundleQty: v }))}
              placeholder="1"
              min="1"
              step="1"
            />
          </Label>
          <Label>
            Pack label
            <input
              className={icClass()}
              placeholder="6-pack"
              value={draft.bundleName}
              onChange={(e) =>
                setDraft((p) => ({ ...p, bundleName: e.target.value }))
              }
            />
          </Label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Label required>
            Sell price{cur}
            <NumberInput
              value={draft.bundlePrice}
              onChange={(v) => setDraft((p) => ({ ...p, bundlePrice: v }))}
              placeholder="0.00"
            />
          </Label>
          <Label>
            Buy price{cur}
            <NumberInput
              value={draft.buyingPrice}
              onChange={(v) => setDraft((p) => syncCostsFromBuyingPrice(v, p))}
              placeholder="0.00"
            />
          </Label>
        </div>
      </div>
    </div>
  );
}
