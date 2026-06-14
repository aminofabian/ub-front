"use client";

import { cn } from "@/lib/utils";
import type { ParentDraft } from "../_types";
import { formatAmount } from "../_utils";
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
    valid: boolean;
  } | null;
};

function icClass() {
  return productFormInputClass;
}

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
    <label className={cn("flex flex-col gap-1", productFormLabelClass)}>
      <span className="flex items-center gap-1 normal-case">
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </span>
      {hint ? (
        <span className="text-[10px] font-normal normal-case leading-snug text-muted-foreground">
          {hint}
        </span>
      ) : null}
      {children}
    </label>
  );
}

function MarginDisplay({
  marginInfo,
  currencyCode,
}: {
  marginInfo: Props["marginInfo"];
  currencyCode: string;
}) {
  const curLabel = currencyCode || "KES";
  const valid = marginInfo?.valid;
  const margin = valid ? marginInfo.margin : null;
  const tone =
    valid && margin! >= 20
      ? "text-emerald-700 dark:text-emerald-400"
      : valid && margin! >= 10
        ? "text-amber-700 dark:text-amber-400"
        : valid
          ? "text-red-700 dark:text-red-400"
          : "text-muted-foreground";

  return (
    <div
      className="flex min-w-[4.5rem] flex-col items-center justify-end gap-0.5 rounded-md border border-border/50 bg-muted/15 px-2 py-1.5 sm:min-h-[4.25rem]"
      aria-live="polite"
      aria-label={
        valid
          ? `Margin ${margin!.toFixed(0)} percent`
          : "Margin not available until buy and sell prices are entered"
      }
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Margin
      </span>
      <span className={cn("text-base font-bold tabular-nums leading-none", tone)}>
        {valid ? `${margin!.toFixed(0)}%` : "—"}
      </span>
      {valid ? (
        <span className="text-[10px] tabular-nums text-muted-foreground">
          +{curLabel} {formatAmount(marginInfo.profit)}
        </span>
      ) : (
        <span className="text-[10px] text-muted-foreground/80">per sale</span>
      )}
    </div>
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
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
        <Field label={<>Sell price{cur}</>} required hint="At the till">
          <input
            type="number"
            inputMode="decimal"
            className={cn(icClass(), "w-full")}
            placeholder="0.00"
            value={draft.bundlePrice}
            onChange={(e) => setDraft((p) => ({ ...p, bundlePrice: e.target.value }))}
            required
          />
        </Field>

        <MarginDisplay marginInfo={marginInfo} currencyCode={currencyCode} />

        <Field label={<>Buy price{cur}</>} hint="Optional — also in Supplies">
          <input
            type="number"
            inputMode="decimal"
            className={cn(icClass(), "w-full")}
            placeholder="0.00"
            value={draft.buyingPrice}
            onChange={(e) => setDraft((p) => syncCostsFromBuyingPrice(e.target.value, p))}
          />
        </Field>
      </div>
    </div>
  );
}
