"use client";

import { cn } from "@/lib/utils";
import type { ParentDraft } from "../_types";
import { formatAmount } from "../_utils";
import {
  productFormFieldClass,
  productFormHintClass,
  productFormInputClass,
  productFormLabelClass,
  productFormRequiredClass,
  productFormSectionTitleClass,
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
  /** When true, sell price is per kilogram (butcher weighed items). */
  isWeighed?: boolean;
};

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: React.ReactNode;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn(productFormFieldClass, "gap-1")}>
      <span className="flex min-w-0 items-baseline justify-between gap-2">
        <span className={cn(productFormLabelClass, "flex items-center gap-1")}>
          {label}
          {required ? (
            <span className={productFormRequiredClass} aria-hidden>
              *
            </span>
          ) : null}
        </span>
        {hint ? (
          <span className={cn(productFormHintClass, "truncate text-right")}>
            {hint}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function MarginDisplay({
  marginInfo,
}: {
  marginInfo: Props["marginInfo"];
  currencyCode: string;
}) {
  const valid = marginInfo?.valid;
  const margin = valid ? marginInfo.margin : null;
  const tone =
    valid && margin! >= 20
      ? "text-emerald-700 dark:text-emerald-400"
      : valid && margin! >= 10
        ? "text-amber-700 dark:text-amber-400"
        : valid
          ? "text-red-700 dark:text-red-400"
          : "text-foreground/35";

  return (
    <div
      className="flex min-w-[3.75rem] flex-col items-center justify-center gap-0.5 self-end rounded-none border border-border bg-muted/15 px-1.5 py-1.5 sm:min-h-8"
      aria-live="polite"
      aria-label={
        valid
          ? `Margin ${margin!.toFixed(0)} percent`
          : "Margin not available until buy and sell prices are entered"
      }
    >
      <span className={cn(productFormSectionTitleClass, "tracking-[0.1em]")}>
        Margin
      </span>
      <span className={cn("text-sm font-semibold tabular-nums leading-none", tone)}>
        {valid ? `${margin!.toFixed(0)}%` : "—"}
      </span>
      {valid ? (
        <span className={cn(productFormHintClass, "tabular-nums text-[10px]")}>
          +{formatAmount(marginInfo.profit)}
        </span>
      ) : null}
    </div>
  );
}

export function ProductCreatePricingSection({
  draft,
  setDraft,
  syncCostsFromBuyingPrice,
  currencyCode,
  marginInfo,
  isWeighed = false,
}: Props) {
  const cur = currencyCode ? ` (${currencyCode})` : "";
  const sellLabel = isWeighed ? <>Price per kg{cur}</> : <>Sell price{cur}</>;
  const sellHint = isWeighed ? "Shelf price per kilogram" : "At the till";

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
      <Field label={sellLabel} required hint={sellHint}>
        <input
          type="number"
          inputMode="decimal"
          className={cn(productFormInputClass, "w-full")}
          placeholder="0.00"
          value={draft.bundlePrice}
          onChange={(e) => setDraft((p) => ({ ...p, bundlePrice: e.target.value }))}
          required
        />
      </Field>

      <MarginDisplay marginInfo={marginInfo} currencyCode={currencyCode} />

      <Field label={<>Buy price{cur}</>} hint="Optional">
        <input
          type="number"
          inputMode="decimal"
          className={cn(productFormInputClass, "w-full")}
          placeholder="0.00"
          value={draft.buyingPrice}
          onChange={(e) => setDraft((p) => syncCostsFromBuyingPrice(e.target.value, p))}
        />
      </Field>
    </div>
  );
}
