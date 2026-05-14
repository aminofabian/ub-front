"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CircleDollarSign,
  ImagePlus,
  Layers2,
  Plus,
  ScanLine,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  Warehouse,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BranchRecord, CategoryRecord, SupplierRecord } from "@/lib/api";
import { type VariantDraft, emptyVariantDraft } from "./_types";

export type VariantDrawerDraft = VariantDraft;

type Props = {
  variantDraftRows: VariantDraft[];
  setVariantDraftRows: Dispatch<SetStateAction<VariantDraft[]>>;
  addVariantDraftRow: () => void;
  removeVariantDraftRow: (index: number) => void;
  parentDisplayName: string;
  parentIsProductGroup: boolean;
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
  suggestedNextSku?: string | null;
};

function SectionChevron() {
  return (
    <span
      className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-90"
      aria-hidden
    >
      ▸
    </span>
  );
}

function DrawerSection({
  icon: Icon,
  title,
  subtitle,
  initiallyOpen = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  initiallyOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group overflow-hidden rounded-lg border border-border/60 bg-card/50"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2 sm:px-3.5 [&::-webkit-details-marker]:hidden">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/[0.08] text-primary">
          <Icon className="size-3.5" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left leading-tight">
          <span className="block text-xs font-semibold text-foreground">{title}</span>
          <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{subtitle}</span>
        </span>
        <SectionChevron />
      </summary>
      <div className="border-t border-border/40 bg-muted/10 px-3 pb-3 pt-2.5 sm:px-3.5">{children}</div>
    </details>
  );
}

function FieldLabel({
  children,
  hint,
  requiredMark,
}: {
  children: React.ReactNode;
  hint?: string;
  requiredMark?: boolean;
}) {
  return (
    <span className="flex flex-col gap-0">
      <span className="text-[11px] font-medium text-foreground">
        {children}
        {requiredMark ? <span className="text-destructive"> *</span> : null}
      </span>
      {hint ? (
        <span className="text-[10px] font-normal leading-snug text-muted-foreground">{hint}</span>
      ) : null}
    </span>
  );
}

type EconomicsProps = {
  draft: VariantDraft;
  onPatch: (partial: Partial<VariantDraft>) => void;
  currencyCode: string;
  branches: BranchRecord[];
  suppliersForLink: SupplierRecord[];
  suppliersLoading: boolean;
  loadSuppliersForLink: () => void | Promise<void>;
  canLinkSupplier: boolean;
  canListSuppliers: boolean;
  canSetSellPrice: boolean;
  canInventoryWrite: boolean;
  ic: string;
};

function VariantEconomicsFields({
  draft,
  onPatch,
  currencyCode,
  branches,
  suppliersForLink,
  suppliersLoading,
  loadSuppliersForLink,
  canLinkSupplier,
  canListSuppliers,
  canSetSellPrice,
  canInventoryWrite,
  ic,
}: EconomicsProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Tag className="size-3 shrink-0 opacity-80" aria-hidden />
          Pack &amp; shelf
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-muted-foreground">Pack qty</span>
            <input
              className={ic}
              inputMode="numeric"
              placeholder="e.g. 1 or 6"
              value={draft.bundleQty}
              onChange={(event) => onPatch({ bundleQty: event.target.value })}
              aria-label="Bundle quantity"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-muted-foreground">
              Line price{currencyCode ? ` (${currencyCode})` : ""}
            </span>
            <input
              className={ic}
              inputMode="decimal"
              placeholder="Leave blank if unsure"
              value={draft.bundlePrice}
              onChange={(event) => onPatch({ bundlePrice: event.target.value })}
              aria-label="Bundle price"
            />
          </label>
          <label className="flex flex-col gap-1 col-span-2 sm:col-span-3">
            <span className="text-[10px] font-medium text-muted-foreground">Pack label</span>
            <input
              className={ic}
              placeholder='e.g. "6-pack"'
              value={draft.bundleName}
              onChange={(event) => onPatch({ bundleName: event.target.value })}
              aria-label="Bundle name"
            />
          </label>
        </div>
      </div>

      {canSetSellPrice ? (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <CircleDollarSign className="size-3 shrink-0 opacity-80" aria-hidden />
            Branch sell price
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">
                Price{currencyCode ? ` (${currencyCode})` : ""}
              </span>
              <input
                className={ic}
                inputMode="decimal"
                placeholder="Optional"
                value={draft.sellingPrice}
                onChange={(event) => onPatch({ sellingPrice: event.target.value })}
                aria-label="Selling price"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">From</span>
              <input
                className={ic}
                type="date"
                value={draft.sellEffectiveFrom}
                onChange={(event) => onPatch({ sellEffectiveFrom: event.target.value })}
                aria-label="Price effective from"
              />
            </label>
            <label className="flex flex-col gap-1 col-span-2">
              <span className="text-[10px] font-medium text-muted-foreground">Branch</span>
              <select
                className={ic}
                value={draft.sellBranchId}
                onChange={(event) => onPatch({ sellBranchId: event.target.value })}
                aria-label="Branch for selling price"
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
      ) : (
        <p className="text-xs text-muted-foreground">You don&apos;t have access to set branch selling prices.</p>
      )}

      {canLinkSupplier ? (
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Truck className="size-3 shrink-0 opacity-80" aria-hidden />
              Supplier
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[10px]"
              disabled={suppliersLoading || !canListSuppliers}
              onClick={() => void loadSuppliersForLink()}
            >
              {suppliersLoading ? "…" : "Refresh"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 col-span-2">
              <span className="text-[10px] font-medium text-muted-foreground">Supplier</span>
              <select
                className={ic}
                value={
                  suppliersForLink.some((s) => s.id === draft.supplierId) ? draft.supplierId : ""
                }
                onChange={(event) => onPatch({ supplierId: event.target.value })}
              >
                <option value="">None</option>
                {suppliersForLink.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">Their SKU</span>
              <input
                className={ic}
                placeholder="Optional"
                value={draft.supplierSku}
                onChange={(event) => onPatch({ supplierSku: event.target.value })}
                aria-label="Supplier SKU"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">
                Buy{currencyCode ? ` (${currencyCode})` : ""}
              </span>
              <input
                className={ic}
                inputMode="decimal"
                placeholder="Optional"
                value={draft.defaultCostPrice}
                onChange={(event) => onPatch({ defaultCostPrice: event.target.value })}
                aria-label="Buy cost"
              />
            </label>
            <label className="flex items-center gap-2 text-[10px] sm:col-span-2">
              <input
                type="checkbox"
                checked={draft.setPrimarySupplier}
                onChange={(event) => onPatch({ setPrimarySupplier: event.target.checked })}
              />
              <span className="text-foreground">Primary supplier</span>
            </label>
            <details className="col-span-2">
              <summary className="cursor-pointer text-[10px] text-muted-foreground underline-offset-2 hover:underline">
                Supplier UUID
              </summary>
              <label className="mt-1.5 flex flex-col gap-1">
                <span className="text-[10px] font-medium text-muted-foreground">UUID</span>
                <input
                  className={cn(ic, "font-mono text-xs")}
                  placeholder="UUID"
                  value={draft.supplierId}
                  onChange={(event) => onPatch({ supplierId: event.target.value })}
                  aria-label="Supplier ID"
                />
              </label>
            </details>
          </div>
        </div>
      ) : null}

      {canInventoryWrite ? (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Warehouse className="size-3 shrink-0 opacity-80" aria-hidden />
            Opening stock
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">Qty</span>
              <input
                className={ic}
                inputMode="decimal"
                placeholder="Optional"
                value={draft.openingQty}
                onChange={(event) => onPatch({ openingQty: event.target.value })}
                aria-label="Opening quantity"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">Branch</span>
              <select
                className={ic}
                value={draft.openingBranchId}
                onChange={(event) => onPatch({ openingBranchId: event.target.value })}
                aria-label="Opening stock branch"
              >
                <option value="">Choose…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 col-span-2">
              <span className="text-[10px] font-medium text-muted-foreground">
                Unit cost{currencyCode ? ` (${currencyCode})` : ""}
              </span>
              <input
                className={ic}
                inputMode="decimal"
                placeholder="Matches buy cost if set"
                value={draft.openingUnitCost}
                onChange={(event) => onPatch({ openingUnitCost: event.target.value })}
                aria-label="Opening unit cost"
              />
            </label>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">You don&apos;t have access to post opening stock here.</p>
      )}
    </div>
  );
}

export function VariantDrawerForm({
  variantDraftRows,
  setVariantDraftRows,
  addVariantDraftRow,
  removeVariantDraftRow,
  parentDisplayName,
  parentIsProductGroup,
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
  const icComfort = cn(ic, "min-h-9 py-1.5 text-sm");

  const [extrasRow, setExtrasRow] = useState(0);

  useEffect(() => {
    setExtrasRow((i) => Math.min(i, Math.max(0, variantDraftRows.length - 1)));
  }, [variantDraftRows.length]);

  const patchRow = useCallback(
    (index: number, partial: Partial<VariantDraft>) => {
      setVariantDraftRows((rows) =>
        rows.map((r, i) => (i === index ? { ...r, ...partial } : r)),
      );
    },
    [setVariantDraftRows],
  );

  const extrasDraft = variantDraftRows[extrasRow] ?? emptyVariantDraft();

  const batchCount = useMemo(
    () => variantDraftRows.filter((r) => r.variantName.trim()).length,
    [variantDraftRows],
  );

  const coverImageInputRef = useRef<HTMLInputElement>(null);

  return (
    <form id="add-variant-form" className="space-y-3" onSubmit={onSubmit}>
      <div className="flex gap-3 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-background px-3 py-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Layers2 className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/90">
            {parentIsProductGroup ? "Parent group" : "Parent product"}
          </p>
          <p className="text-sm font-semibold leading-tight text-foreground">{parentDisplayName}</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Each row is one variant SKU under this parent. Use{" "}
            <span className="font-medium text-foreground">Add another variant</span> for several at
            once—each row can have its own prices and stock. A variant name is required for every row
            you create.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {variantDraftRows.map((row, index) => (
          <section
            key={index}
            className="space-y-2.5 rounded-lg border border-border/70 bg-card/50 p-3"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/30 pb-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <Sparkles className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                <h3 className="truncate text-xs font-semibold text-foreground">
                  Variant {index + 1}
                </h3>
              </div>
              {index > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 gap-1 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeVariantDraftRow(index)}
                >
                  <Trash2 className="size-3" aria-hidden />
                  Remove
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="flex flex-col gap-1">
                <FieldLabel requiredMark hint="Shown to shoppers; distinguishes this variant from siblings.">
                  Variant name
                </FieldLabel>
                <input
                  className={cn(icComfort, "font-medium")}
                  placeholder="e.g. Red · 500 ml"
                  value={row.variantName}
                  onChange={(event) => patchRow(index, { variantName: event.target.value })}
                  required={index === 0}
                  autoComplete="off"
                  aria-label={`Variant name ${index + 1}`}
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <FieldLabel hint="Auto if empty.">SKU</FieldLabel>
                  <div className="flex gap-1">
                    <input
                      className={cn(icComfort, "min-w-0 flex-1")}
                      placeholder="—"
                      value={row.sku}
                      onChange={(event) => patchRow(index, { sku: event.target.value })}
                      autoComplete="off"
                      aria-label={`SKU ${index + 1}`}
                    />
                    {index === 0 && suggestedNextSku ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-9 shrink-0 px-2 text-[10px]"
                        onClick={() => patchRow(0, { sku: suggestedNextSku })}
                      >
                        {suggestedNextSku}
                      </Button>
                    ) : null}
                  </div>
                </label>
                <label className="flex flex-col gap-1">
                  <FieldLabel hint="Optional.">Barcode</FieldLabel>
                  <div className="relative">
                    <ScanLine
                      className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <input
                      className={cn(icComfort, "pl-8")}
                      placeholder="Scan"
                      value={row.barcode}
                      onChange={(event) => patchRow(index, { barcode: event.target.value })}
                      aria-label={`Barcode ${index + 1}`}
                    />
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <FieldLabel hint="Inherits from parent if empty.">Brand</FieldLabel>
                  <input
                    className={icComfort}
                    placeholder="—"
                    value={row.brand}
                    onChange={(event) => patchRow(index, { brand: event.target.value })}
                    aria-label={`Brand ${index + 1}`}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <FieldLabel hint="Optional.">Size</FieldLabel>
                  <input
                    className={icComfort}
                    placeholder="—"
                    value={row.size}
                    onChange={(event) => patchRow(index, { size: event.target.value })}
                    aria-label={`Size ${index + 1}`}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <FieldLabel hint="Receipts; inherits parent title if empty.">Display name</FieldLabel>
                <input
                  className={icComfort}
                  placeholder="Same as parent if empty"
                  value={row.name}
                  onChange={(event) => patchRow(index, { name: event.target.value })}
                  aria-label={`Display name ${index + 1}`}
                />
              </label>
            </div>

            <DrawerSection
              icon={CircleDollarSign}
              title="Prices & stock"
              subtitle="Optional for this row."
              initiallyOpen={index === 0}
            >
              <VariantEconomicsFields
                draft={row}
                onPatch={(partial) => patchRow(index, partial)}
                currencyCode={currencyCode}
                branches={branches}
                suppliersForLink={suppliersForLink}
                suppliersLoading={suppliersLoading}
                loadSuppliersForLink={loadSuppliersForLink}
                canLinkSupplier={canLinkSupplier}
                canListSuppliers={canListSuppliers}
                canSetSellPrice={canSetSellPrice}
                canInventoryWrite={canInventoryWrite}
                ic={ic}
              />
            </DrawerSection>
          </section>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-3 text-xs"
          onClick={addVariantDraftRow}
        >
          <Plus className="size-3.5" aria-hidden />
          Add another variant
        </Button>
      </div>

      {variantDraftRows.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">Story &amp; reorder for</span>
          <select
            className={cn(ic, "h-8 max-w-[14rem] text-xs py-1")}
            value={extrasRow}
            onChange={(event) => setExtrasRow(Number(event.target.value))}
            aria-label="Which variant row for shared description and reorder fields"
          >
            {variantDraftRows.map((r, i) => (
              <option key={i} value={i}>
                {r.variantName.trim() || `Variant ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <DrawerSection
        icon={BookOpen}
        title="Description & reorder"
        subtitle="Optional text, category, cover, low-stock hints."
      >
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-x-4">
          <div className="space-y-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">Description</span>
              <textarea
                className={cn(ic, "min-h-[4.5rem] resize-y py-1.5 text-sm")}
                placeholder="Same as parent if empty"
                value={extrasDraft.description}
                onChange={(event) => patchRow(extrasRow, { description: event.target.value })}
                aria-label="Description"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-muted-foreground">Category</span>
                <select
                  className={cn(ic, "py-1.5 text-sm")}
                  value={extrasDraft.categoryId}
                  onChange={(event) => patchRow(extrasRow, { categoryId: event.target.value })}
                  aria-label="Category"
                >
                  <option value="">Parent</option>
                  {sortedCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-muted-foreground">Unit</span>
                <input
                  className={cn(ic, "py-1.5 text-sm")}
                  placeholder="each…"
                  value={extrasDraft.unitType}
                  onChange={(event) => patchRow(extrasRow, { unitType: event.target.value })}
                  aria-label="Unit type"
                />
              </label>
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                <ImagePlus className="size-3 shrink-0 opacity-80" aria-hidden />
                Cover photo
              </span>
              {extrasRow !== 0 && variantDraftRows.length > 1 ? (
                <p className="text-[10px] text-muted-foreground">
                  Switch story target to variant 1 to attach cover (one upload per save).
                </p>
              ) : (
                <>
                  <p className="text-[10px] text-muted-foreground">
                    After save{batchCount > 1 ? ", first variant row only." : "."}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <input
                      ref={coverImageInputRef}
                      type="file"
                      accept="image/*"
                      className="text-xs file:mr-2 file:rounded file:border file:bg-background file:px-2 file:py-1 file:text-[10px]"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setPendingVariantImage(file);
                        if (file) {
                          patchRow(0, { imageKey: "" });
                        }
                      }}
                      aria-label="Cover photo file"
                    />
                    {pendingVariantImage ? (
                      <>
                        <span className="max-w-[10rem] truncate text-[10px] text-muted-foreground">
                          {pendingVariantImage.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => {
                            setPendingVariantImage(null);
                            if (coverImageInputRef.current) coverImageInputRef.current.value = "";
                          }}
                        >
                          Clear
                        </Button>
                      </>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2 border-border/40 sm:border-l sm:pl-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Low-stock
            </p>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">Min</span>
                <input
                  className={cn(ic, "py-1.5 text-sm")}
                  inputMode="decimal"
                  placeholder="—"
                  value={extrasDraft.minStockLevel}
                  onChange={(event) => patchRow(extrasRow, { minStockLevel: event.target.value })}
                  aria-label="Min stock"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">Reorder</span>
                <input
                  className={cn(ic, "py-1.5 text-sm")}
                  inputMode="decimal"
                  placeholder="—"
                  value={extrasDraft.reorderLevel}
                  onChange={(event) => patchRow(extrasRow, { reorderLevel: event.target.value })}
                  aria-label="Reorder level"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">Qty</span>
                <input
                  className={cn(ic, "py-1.5 text-sm")}
                  inputMode="decimal"
                  placeholder="—"
                  value={extrasDraft.reorderQty}
                  onChange={(event) => patchRow(extrasRow, { reorderQty: event.target.value })}
                  aria-label="Reorder qty"
                />
              </label>
            </div>
          </div>
        </div>
      </DrawerSection>

      <p className="rounded-md border border-dashed border-border/50 bg-muted/5 px-2 py-1.5 text-center text-[10px] text-muted-foreground">
        Save with names only — edit anything else in the catalog later.
      </p>
    </form>
  );
}
