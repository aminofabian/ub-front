"use client";

import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import type { BranchRecord, CategoryRecord, SupplierRecord } from "@/lib/api";

/** Mirrors VariantDraft in page.tsx — kept local to avoid circular imports */
export type VariantDrawerDraft = {
  sku: string;
  variantName: string;
  name: string;
  barcode: string;
  description: string;
  categoryId: string;
  unitType: string;
  minStockLevel: string;
  reorderLevel: string;
  reorderQty: string;
  imageKey: string;
  bundleQty: string;
  bundlePrice: string;
  bundleName: string;
  sellingPrice: string;
  sellBranchId: string;
  sellEffectiveFrom: string;
  supplierId: string;
  supplierSku: string;
  defaultCostPrice: string;
  setPrimarySupplier: boolean;
  openingQty: string;
  openingBranchId: string;
  openingUnitCost: string;
};

type Props = {
  variantDraft: VariantDrawerDraft;
  setVariantDraft: Dispatch<SetStateAction<VariantDrawerDraft>>;
  sortedCategories: CategoryRecord[];
  branches: BranchRecord[];
  suppliersForLink: SupplierRecord[];
  suppliersLoading: boolean;
  loadSuppliersForLink: () => void | Promise<void>;
  canLinkSupplier: boolean;
  canListSuppliers: boolean;
  canSetSellPrice: boolean;
  canInventoryWrite: boolean;
  currencyCode: string;
  pendingVariantImage: File | null;
  setPendingVariantImage: (file: File | null) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  inputClassName: string;
  /** Hint from GET /items/next-sku — optional fill-in, or leave SKU empty for server auto-assign. */
  suggestedNextSku?: string | null;
};

export function VariantDrawerForm({
  variantDraft,
  setVariantDraft,
  sortedCategories,
  branches,
  suppliersForLink,
  suppliersLoading,
  loadSuppliersForLink,
  canLinkSupplier,
  canListSuppliers,
  canSetSellPrice,
  canInventoryWrite,
  currencyCode,
  pendingVariantImage,
  setPendingVariantImage,
  onSubmit,
  inputClassName,
  suggestedNextSku,
}: Props) {
  const ic = inputClassName;

  return (
    <form id="add-variant-form" className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-3 rounded-xl border border-primary/15 bg-primary/[0.02] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Start here</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-medium text-muted-foreground">SKU</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className={`${ic} min-w-0 flex-1 sm:min-w-[8rem]`}
                placeholder="Optional — auto number if empty"
                value={variantDraft.sku}
                onChange={(event) =>
                  setVariantDraft((previous) => ({ ...previous, sku: event.target.value }))
                }
                autoComplete="off"
                aria-label="Variant SKU"
              />
              {suggestedNextSku ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 gap-1 px-2.5 text-xs"
                  onClick={() =>
                    setVariantDraft((previous) => ({ ...previous, sku: suggestedNextSku }))
                  }
                >
                  Use {suggestedNextSku}
                </Button>
              ) : null}
            </div>
            <span className="font-normal text-[11px] leading-snug text-muted-foreground">
              Leave empty to save with the next free numeric code
              {suggestedNextSku ? ` (currently ${suggestedNextSku})` : ""}.
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-medium text-muted-foreground">
              Option label <span className="text-destructive">*</span>
            </span>
            <input
              className={ic}
              placeholder="e.g. Red / Medium / 500 ml"
              value={variantDraft.variantName}
              onChange={(event) =>
                setVariantDraft((previous) => ({ ...previous, variantName: event.target.value }))
              }
              required
              autoComplete="off"
              aria-label="Variant option label"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
            <span className="font-medium text-muted-foreground">Barcode (scan or type)</span>
            <input
              className={ic}
              placeholder="Optional"
              value={variantDraft.barcode}
              onChange={(event) =>
                setVariantDraft((previous) => ({ ...previous, barcode: event.target.value }))
              }
              aria-label="Variant barcode"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
            <span className="font-medium text-muted-foreground">Name on receipts &amp; search</span>
            <span className="font-normal text-muted-foreground/90">
              Leave blank to reuse the parent product name.
            </span>
            <input
              className={ic}
              placeholder="Optional — defaults to parent name"
              value={variantDraft.name}
              onChange={(event) =>
                setVariantDraft((previous) => ({ ...previous, name: event.target.value }))
              }
              aria-label="Variant display name"
            />
          </label>
        </div>
      </div>

      <details className="group rounded-xl border border-border/80 bg-muted/10 open:bg-background">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span className="text-muted-foreground transition group-open:rotate-90" aria-hidden>
            ▸
          </span>
          Story, category &amp; cover link
        </summary>
        <div className="space-y-3 border-t px-4 py-4 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
          <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
            <span className="font-medium text-muted-foreground">Description</span>
            <textarea
              className={`${ic} min-h-[5rem] resize-y`}
              placeholder="Optional — defaults to parent description"
              value={variantDraft.description}
              onChange={(event) =>
                setVariantDraft((previous) => ({ ...previous, description: event.target.value }))
              }
              aria-label="Variant description"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Category</span>
            <select
              className={ic}
              value={variantDraft.categoryId}
              onChange={(event) =>
                setVariantDraft((previous) => ({ ...previous, categoryId: event.target.value }))
              }
              aria-label="Variant category"
            >
              <option value="">Same as parent product</option>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Unit</span>
            <input
              className={ic}
              placeholder="each, kg, box… — blank matches parent"
              value={variantDraft.unitType}
              onChange={(event) =>
                setVariantDraft((previous) => ({ ...previous, unitType: event.target.value }))
              }
              aria-label="Variant unit type"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
            <span className="font-medium text-muted-foreground">Cover image URL</span>
            <input
              className={ic}
              placeholder="https://…"
              value={variantDraft.imageKey}
              onChange={(event) =>
                setVariantDraft((previous) => ({ ...previous, imageKey: event.target.value }))
              }
              aria-label="Variant cover image URL"
            />
          </label>
        </div>
      </details>

      <details className="group rounded-xl border border-border/80 bg-muted/10">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span className="text-muted-foreground transition group-open:rotate-90" aria-hidden>
            ▸
          </span>
          Reorder reminders
        </summary>
        <div className="grid gap-3 border-t px-4 py-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Warn when below</span>
            <input
              className={ic}
              inputMode="decimal"
              placeholder="Min on hand"
              value={variantDraft.minStockLevel}
              onChange={(event) =>
                setVariantDraft((previous) => ({ ...previous, minStockLevel: event.target.value }))
              }
              aria-label="Min stock level"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Reorder at</span>
            <input
              className={ic}
              inputMode="decimal"
              placeholder="Level"
              value={variantDraft.reorderLevel}
              onChange={(event) =>
                setVariantDraft((previous) => ({ ...previous, reorderLevel: event.target.value }))
              }
              aria-label="Reorder level"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Suggest order qty</span>
            <input
              className={ic}
              inputMode="decimal"
              placeholder="Units"
              value={variantDraft.reorderQty}
              onChange={(event) =>
                setVariantDraft((previous) => ({ ...previous, reorderQty: event.target.value }))
              }
              aria-label="Reorder quantity"
            />
          </label>
        </div>
      </details>

      <details className="group rounded-xl border border-border/80 bg-muted/10">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span className="text-muted-foreground transition group-open:rotate-90" aria-hidden>
            ▸
          </span>
          Multipack / bundle
        </summary>
        <div className="grid gap-3 border-t px-4 py-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Items in pack</span>
            <input
              className={ic}
              inputMode="numeric"
              placeholder="e.g. 6"
              value={variantDraft.bundleQty}
              onChange={(event) =>
                setVariantDraft((previous) => ({ ...previous, bundleQty: event.target.value }))
              }
              aria-label="Bundle quantity"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-medium text-muted-foreground">
              Pack price{currencyCode ? ` (${currencyCode})` : ""}
            </span>
            <input
              className={ic}
              inputMode="decimal"
              placeholder="Optional"
              value={variantDraft.bundlePrice}
              onChange={(event) =>
                setVariantDraft((previous) => ({ ...previous, bundlePrice: event.target.value }))
              }
              aria-label="Bundle price"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
            <span className="font-medium text-muted-foreground">Pack label</span>
            <input
              className={ic}
              placeholder='e.g. "6-pack"'
              value={variantDraft.bundleName}
              onChange={(event) =>
                setVariantDraft((previous) => ({ ...previous, bundleName: event.target.value }))
              }
              aria-label="Bundle name"
            />
          </label>
        </div>
      </details>

      <details className="group rounded-xl border border-border/80 bg-muted/10">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span className="text-muted-foreground transition group-open:rotate-90" aria-hidden>
            ▸
          </span>
          Selling price
          {!canSetSellPrice ? (
            <span className="ml-auto text-xs font-normal text-muted-foreground">(needs access)</span>
          ) : null}
        </summary>
        <div className="space-y-3 border-t px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-medium text-muted-foreground">
                Price{currencyCode ? ` (${currencyCode})` : ""}
              </span>
              <input
                className={ic}
                inputMode="decimal"
                placeholder="Optional"
                value={variantDraft.sellingPrice}
                onChange={(event) =>
                  setVariantDraft((previous) => ({ ...previous, sellingPrice: event.target.value }))
                }
                aria-label="Selling price"
                disabled={!canSetSellPrice}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-medium text-muted-foreground">Effective from</span>
              <input
                className={ic}
                type="date"
                value={variantDraft.sellEffectiveFrom}
                onChange={(event) =>
                  setVariantDraft((previous) => ({
                    ...previous,
                    sellEffectiveFrom: event.target.value,
                  }))
                }
                aria-label="Price effective from"
                disabled={!canSetSellPrice}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
              <span className="font-medium text-muted-foreground">Only at branch</span>
              <select
                className={ic}
                value={variantDraft.sellBranchId}
                onChange={(event) =>
                  setVariantDraft((previous) => ({ ...previous, sellBranchId: event.target.value }))
                }
                aria-label="Branch for selling price"
                disabled={!canSetSellPrice}
              >
                <option value="">All locations</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </details>

      {canLinkSupplier ? (
        <details className="group rounded-xl border border-border/80 bg-muted/10">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <span className="text-muted-foreground transition group-open:rotate-90" aria-hidden>
              ▸
            </span>
            Supplier &amp; buy cost
          </summary>
          <div className="space-y-3 border-t px-4 py-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={suppliersLoading || !canListSuppliers}
                onClick={() => void loadSuppliersForLink()}
              >
                {suppliersLoading ? "Loading…" : "Refresh supplier list"}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                <span className="font-medium text-muted-foreground">Supplier</span>
                <select
                  className={ic}
                  value={
                    suppliersForLink.some((s) => s.id === variantDraft.supplierId)
                      ? variantDraft.supplierId
                      : ""
                  }
                  onChange={(event) =>
                    setVariantDraft((previous) => ({ ...previous, supplierId: event.target.value }))
                  }
                >
                  <option value="">— None —</option>
                  {suppliersForLink.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                <span className="font-medium text-muted-foreground">Supplier ID (advanced)</span>
                <input
                  className={`${ic} font-mono text-xs`}
                  placeholder="UUID paste"
                  value={variantDraft.supplierId}
                  onChange={(event) =>
                    setVariantDraft((previous) => ({ ...previous, supplierId: event.target.value }))
                  }
                  aria-label="Supplier ID"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-medium text-muted-foreground">Their SKU</span>
                <input
                  className={ic}
                  placeholder="Optional"
                  value={variantDraft.supplierSku}
                  onChange={(event) =>
                    setVariantDraft((previous) => ({ ...previous, supplierSku: event.target.value }))
                  }
                  aria-label="Supplier SKU"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-medium text-muted-foreground">
                  Buy price / unit{currencyCode ? ` (${currencyCode})` : ""}
                </span>
                <input
                  className={ic}
                  inputMode="decimal"
                  placeholder="Optional"
                  value={variantDraft.defaultCostPrice}
                  onChange={(event) =>
                    setVariantDraft((previous) => ({
                      ...previous,
                      defaultCostPrice: event.target.value,
                    }))
                  }
                  aria-label="Buy cost"
                />
              </label>
              <label className="flex items-center gap-2 text-xs sm:col-span-2">
                <input
                  type="checkbox"
                  checked={variantDraft.setPrimarySupplier}
                  onChange={(event) =>
                    setVariantDraft((previous) => ({
                      ...previous,
                      setPrimarySupplier: event.target.checked,
                    }))
                  }
                />
                <span className="text-foreground">Primary supplier for this variant</span>
              </label>
            </div>
          </div>
        </details>
      ) : null}

      <details className="group rounded-xl border border-border/80 bg-muted/10">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span className="text-muted-foreground transition group-open:rotate-90" aria-hidden>
            ▸
          </span>
          Starting stock
          {!canInventoryWrite ? (
            <span className="ml-auto text-xs font-normal text-muted-foreground">(needs access)</span>
          ) : null}
        </summary>
        <div className="grid gap-3 border-t px-4 py-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Quantity</span>
            <input
              className={ic}
              inputMode="decimal"
              placeholder="Optional"
              value={variantDraft.openingQty}
              onChange={(event) =>
                setVariantDraft((previous) => ({ ...previous, openingQty: event.target.value }))
              }
              aria-label="Opening quantity"
              disabled={!canInventoryWrite}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Branch</span>
            <select
              className={ic}
              value={variantDraft.openingBranchId}
              onChange={(event) =>
                setVariantDraft((previous) => ({ ...previous, openingBranchId: event.target.value }))
              }
              aria-label="Branch for opening stock"
              disabled={!canInventoryWrite}
            >
              <option value="">Choose branch…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
            <span className="font-medium text-muted-foreground">
              Unit cost{currencyCode ? ` (${currencyCode})` : ""}
            </span>
            <input
              className={ic}
              inputMode="decimal"
              placeholder="Matches buy price if set"
              value={variantDraft.openingUnitCost}
              onChange={(event) =>
                setVariantDraft((previous) => ({ ...previous, openingUnitCost: event.target.value }))
              }
              aria-label="Opening unit cost"
              disabled={!canInventoryWrite}
            />
          </label>
        </div>
      </details>

      <details className="group rounded-xl border border-border/80 bg-muted/10">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span className="text-muted-foreground transition group-open:rotate-90" aria-hidden>
            ▸
          </span>
          Photo file (after create)
        </summary>
        <div className="border-t px-4 py-4">
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Image file</span>
            <input
              type="file"
              accept="image/*"
              className="text-sm file:mr-3 file:rounded file:border file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setPendingVariantImage(file);
              }}
              aria-label="Variant photo file"
            />
            {pendingVariantImage ? (
              <span className="text-xs text-muted-foreground">Selected: {pendingVariantImage.name}</span>
            ) : null}
          </label>
        </div>
      </details>

      <p className="text-[11px] text-muted-foreground">
        Required field: option label only — SKU is optional and can be auto-numbered. Everything else folds open when you need it.
      </p>
    </form>
  );
}
