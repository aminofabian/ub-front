"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronDown, ChevronRight, Plus, Trash2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { FormDrawerFields } from "@/components/form-drawer";
import { cn } from "@/lib/utils";
import type { BranchRecord, CategoryRecord, SupplierRecord } from "@/lib/api";
import { type VariantDraft, emptyVariantDraft } from "./_types";
import { formatAmount, toNumber } from "./_utils";
import { StockIncreaseFields } from "./_components/StockIncreaseFields";
import {
  productFormInputClass,
  productFormLabelClass,
  productFormSectionBodyCompactClass,
  productFormSelectClass,
  productFormTextareaClass,
} from "./_components/product-form-styles";

export type VariantDrawerDraft = VariantDraft;

type Props = {
  variantDraftRows: VariantDraft[];
  setVariantDraftRows: Dispatch<SetStateAction<VariantDraft[]>>;
  addVariantDraftRow: () => void;
  removeVariantDraftRow: (index: number) => void;
  parentIsProductGroup: boolean;
  parentCategoryId?: string;
  parentCategoryName?: string;
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
  suggestedNextSku?: string | null;
};

function icClass(disabled?: boolean) {
  return cn(
    productFormInputClass,
    disabled && "cursor-not-allowed bg-muted/50 text-muted-foreground",
  );
}

function Label({
  label,
  children,
  className,
  required,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={cn("flex flex-col gap-1", productFormLabelClass, className)}>
      <span className="flex items-center gap-1 normal-case">
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function InlineField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={cn(productFormLabelClass, "w-11 shrink-0 normal-case")}>{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function CompactSectionToggle({
  label,
  expanded,
  onToggle,
  badge,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-1.5 rounded-md py-1 text-left text-xs font-medium text-muted-foreground transition hover:bg-muted/30 hover:text-foreground"
    >
      {expanded ? (
        <ChevronDown className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <ChevronRight className="size-3.5 shrink-0" aria-hidden />
      )}
      <span className="min-w-0 flex-1">{label}</span>
      {badge}
    </button>
  );
}

function ToggleChip({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition",
        checked
          ? "border-primary/30 bg-primary/[0.08] text-primary ring-1 ring-primary/10"
          : "border-border/60 bg-background text-muted-foreground hover:bg-muted/30",
      )}
    >
      <span
        className={cn(
          "flex h-3 w-3 items-center justify-center rounded-sm border transition",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
        )}
      >
        {checked ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path
              d="M2 5L4 7L8 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      {label}
    </button>
  );
}

function syncCostsFromBuy(buyRaw: string, prev: VariantDraft): VariantDraft {
  const buy = toNumber(buyRaw);
  if (buy == null) return { ...prev, defaultCostPrice: buyRaw };
  const packQty = Math.max(1, toNumber(prev.bundleQty) ?? 1);
  const perUnit = buy / packQty;
  const perUnitStr = Number.isFinite(perUnit) ? String(perUnit) : "";
  return {
    ...prev,
    defaultCostPrice: buyRaw,
    openingUnitCost: prev.openingUnitCost.trim() ? prev.openingUnitCost : perUnitStr,
  };
}

function VariantPricingRow({
  draft,
  onPatch,
  currencyCode,
}: {
  draft: VariantDraft;
  onPatch: (partial: Partial<VariantDraft>) => void;
  currencyCode: string;
}) {
  const cur = currencyCode ? ` (${currencyCode})` : "";
  const buy = toNumber(draft.defaultCostPrice);
  const sell = toNumber(draft.bundlePrice);
  const packQty = Math.max(1, toNumber(draft.bundleQty) ?? 1);
  const marginInfo = useMemo(() => {
    if (buy == null || sell == null || sell <= 0) return null;
    const profit = sell - buy / packQty;
    const margin = (profit / sell) * 100;
    return { profit, margin, valid: true as const };
  }, [buy, sell, packQty]);

  const tone =
    marginInfo && marginInfo.margin >= 20
      ? "text-emerald-700 dark:text-emerald-400"
      : marginInfo && marginInfo.margin >= 10
        ? "text-amber-700 dark:text-amber-400"
        : marginInfo
          ? "text-red-700 dark:text-red-400"
          : "text-muted-foreground";

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
      <Label required label={`Sell price${cur}`}>
        <input
          type="number"
          inputMode="decimal"
          className={icClass()}
          placeholder="0.00"
          value={draft.bundlePrice}
          onChange={(e) => onPatch({ bundlePrice: e.target.value })}
        />
      </Label>
      <div
        className="flex min-w-[4.5rem] flex-col items-center justify-end gap-0.5 rounded-md border border-border/50 bg-muted/15 px-2 py-1.5 sm:min-h-[4.25rem]"
        aria-live="polite"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Margin
        </span>
        <span className={cn("text-base font-bold tabular-nums leading-none", tone)}>
          {marginInfo ? `${marginInfo.margin.toFixed(0)}%` : "—"}
        </span>
        {marginInfo ? (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            +{currencyCode || "KES"} {formatAmount(marginInfo.profit)}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/80">per sale</span>
        )}
      </div>
      <Label label={`Buy price${cur}`}>
        <input
          type="number"
          inputMode="decimal"
          className={icClass()}
          placeholder="0.00"
          value={draft.defaultCostPrice}
          onChange={(e) => onPatch(syncCostsFromBuy(e.target.value, draft))}
        />
      </Label>
    </div>
  );
}

function variantLegend(index: number, variantName: string): string {
  const name = variantName.trim();
  return name || `Variant ${index + 1}`;
}

function VariantRowFields({
  row,
  index,
  canRemove,
  onRemove,
  onPatch,
  suggestedNextSku,
  currencyCode,
  branches,
  canInventoryWrite,
  parentIsProductGroup,
  onScanBarcode,
}: {
  row: VariantDraft;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  onPatch: (partial: Partial<VariantDraft>) => void;
  suggestedNextSku?: string | null;
  currencyCode: string;
  branches: BranchRecord[];
  canInventoryWrite: boolean;
  parentIsProductGroup: boolean;
  onScanBarcode: () => void;
}) {
  const costPerUnit = useMemo(() => {
    const buy = toNumber(row.defaultCostPrice);
    const pack = Math.max(1, toNumber(row.bundleQty) ?? 1);
    if (buy != null) return buy / pack;
    return null;
  }, [row.defaultCostPrice, row.bundleQty]);

  return (
    <div className="space-y-2">
      {canRemove ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-1.5 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="size-3" aria-hidden />
            Remove
          </Button>
        </div>
      ) : null}

      <FormDrawerFields legend={variantLegend(index, row.variantName)} compact>
        {!parentIsProductGroup ? (
          <ToggleChip
            checked={row.isPackageVariant}
            onChange={(v) =>
              onPatch({
                isPackageVariant: v,
                openingQty: v ? "" : row.openingQty,
              })
            }
            label="Package SKU (deducts parent stock)"
          />
        ) : null}

        <Label
          required
          label={row.isPackageVariant ? "Package name" : "Variant name"}
        >
          <input
            className={icClass()}
            placeholder={row.isPackageVariant ? "Tray of 30" : "500 g · Blue"}
            value={row.variantName}
            onChange={(e) => onPatch({ variantName: e.target.value })}
            required={index === 0}
            autoComplete="off"
          />
        </Label>

        {row.isPackageVariant ? (
          <>
            <Label required label="Units per package">
              <input
                type="number"
                inputMode="numeric"
                className={icClass()}
                placeholder="30"
                min={1}
                value={row.unitsPerPackage}
                onChange={(e) => onPatch({ unitsPerPackage: e.target.value })}
              />
            </Label>
            <Label label={`Price per package${currencyCode ? ` (${currencyCode})` : ""}`}>
              <input
                type="number"
                inputMode="decimal"
                className={icClass()}
                placeholder="0.00"
                value={row.bundlePrice}
                onChange={(e) => onPatch({ bundlePrice: e.target.value })}
              />
            </Label>
          </>
        ) : (
          <VariantPricingRow draft={row} onPatch={onPatch} currencyCode={currencyCode} />
        )}
      </FormDrawerFields>

      <FormDrawerFields legend="Barcode & SKU" compact>
        <div className="grid gap-2 sm:grid-cols-2">
          <Label label="Barcode">
            <div className="flex gap-1.5">
              <input
                className={cn(icClass(), "min-w-0 flex-1 font-mono text-xs")}
                placeholder="Scan or type"
                value={row.barcode}
                onChange={(e) => onPatch({ barcode: e.target.value })}
              />
              <button
                type="button"
                onClick={onScanBarcode}
                className="flex size-8 shrink-0 items-center justify-center rounded-md border border-input/80 bg-background text-muted-foreground shadow-sm hover:bg-muted"
                aria-label="Scan barcode"
              >
                <Camera className="size-3.5" aria-hidden />
              </button>
            </div>
          </Label>
          <div className="flex min-w-0 flex-col gap-1">
            <span className={productFormLabelClass}>SKU</span>
            <div className="flex gap-1.5">
              <input
                className={cn(icClass(), "min-w-0 flex-1 font-mono text-xs")}
                placeholder="Auto"
                value={row.sku}
                onChange={(e) => onPatch({ sku: e.target.value })}
              />
              {index === 0 && suggestedNextSku ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 px-2 text-[10px]"
                  onClick={() => onPatch({ sku: suggestedNextSku })}
                >
                  {suggestedNextSku}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <InlineField label="Brand">
            <input
              className={icClass()}
              placeholder="Optional"
              value={row.brand}
              onChange={(e) => onPatch({ brand: e.target.value })}
            />
          </InlineField>
          <InlineField label="Size">
            <input
              className={icClass()}
              placeholder="Optional"
              value={row.size}
              onChange={(e) => onPatch({ size: e.target.value })}
            />
          </InlineField>
        </div>
      </FormDrawerFields>

      {canInventoryWrite && !row.isPackageVariant ? (
        <FormDrawerFields legend="Stock" compact>
          <StockIncreaseFields
            mode="opening"
            minimal
            branches={branches}
            branchId={row.openingBranchId}
            onBranchIdChange={(id) => onPatch({ openingBranchId: id })}
            quantity={row.openingQty}
            onQuantityChange={(v) => onPatch({ openingQty: v })}
            unitCost={row.openingUnitCost}
            onUnitCostChange={(v) => onPatch({ openingUnitCost: v })}
            currentUnitCost={costPerUnit}
            unitCostLabel="Unit cost (optional)"
            unitCostHint="Defaults from buy price"
            className="space-y-2 border-0 bg-transparent p-0 shadow-none ring-0"
          />
        </FormDrawerFields>
      ) : null}
    </div>
  );
}

export function VariantDrawerForm({
  variantDraftRows,
  setVariantDraftRows,
  addVariantDraftRow,
  removeVariantDraftRow,
  parentIsProductGroup,
  parentCategoryId,
  parentCategoryName,
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
  suggestedNextSku,
}: Props) {
  const [extrasRow, setExtrasRow] = useState(0);
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [scannerRow, setScannerRow] = useState<number | null>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

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

  const hasMoreData = Boolean(
    extrasDraft.description ||
      extrasDraft.categoryId ||
      extrasDraft.unitType ||
      extrasDraft.minStockLevel ||
      extrasDraft.reorderLevel ||
      extrasDraft.reorderQty ||
      extrasDraft.supplierId ||
      extrasDraft.supplierSku ||
      extrasDraft.sellingPrice ||
      extrasDraft.sellBranchId ||
      pendingVariantImage,
  );

  return (
    <form id="add-variant-form" className="space-y-2" onSubmit={onSubmit}>
      {parentIsProductGroup && parentCategoryId ? (
        <div className="rounded-md border border-border/50 bg-muted/15 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          Category:{" "}
          <span className="font-medium text-foreground">
            {parentCategoryName || "Group category"}
          </span>
          <span className="text-muted-foreground/80"> — applied to new variants</span>
        </div>
      ) : null}

      {variantDraftRows.map((row, index) => (
        <VariantRowFields
          key={index}
          row={row}
          index={index}
          canRemove={index > 0}
          onRemove={() => removeVariantDraftRow(index)}
          onPatch={(partial) => patchRow(index, partial)}
          suggestedNextSku={suggestedNextSku}
          currencyCode={currencyCode}
          branches={branches}
          canInventoryWrite={canInventoryWrite}
          parentIsProductGroup={parentIsProductGroup}
          onScanBarcode={() => setScannerRow(index)}
        />
      ))}

      <div className="flex justify-center pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={addVariantDraftRow}
        >
          <Plus className="size-3.5" aria-hidden />
          Add another variant
        </Button>
      </div>

      {variantDraftRows.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>More options for</span>
          <select
            className={cn(productFormSelectClass, "h-8 max-w-[12rem] text-xs")}
            value={extrasRow}
            onChange={(e) => setExtrasRow(Number(e.target.value))}
          >
            {variantDraftRows.map((r, i) => (
              <option key={i} value={i}>
                {r.variantName.trim() || `Variant ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <CompactSectionToggle
        label="More options"
        expanded={moreExpanded}
        onToggle={() => setMoreExpanded((o) => !o)}
        badge={
          hasMoreData ? (
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          ) : undefined
        }
      />

      {moreExpanded ? (
        <div className={cn(productFormSectionBodyCompactClass, "space-y-3")}>
          {canLinkSupplier ? (
            <div className="space-y-2">
              {canListSuppliers && suppliersForLink.length === 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={suppliersLoading}
                  onClick={() => void loadSuppliersForLink()}
                >
                  {suppliersLoading ? "Loading…" : "Load suppliers"}
                </Button>
              ) : null}
              <Label label="Supplier">
                <select
                  className={productFormSelectClass}
                  value={
                    suppliersForLink.some((s) => s.id === extrasDraft.supplierId)
                      ? extrasDraft.supplierId
                      : ""
                  }
                  onChange={(e) => patchRow(extrasRow, { supplierId: e.target.value })}
                >
                  <option value="">— None —</option>
                  {suppliersForLink.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Label label="Supplier SKU">
                  <input
                    className={icClass()}
                    value={extrasDraft.supplierSku}
                    onChange={(e) => patchRow(extrasRow, { supplierSku: e.target.value })}
                  />
                </Label>
                <label className="flex items-center gap-2 pt-5 text-xs">
                  <input
                    type="checkbox"
                    checked={extrasDraft.setPrimarySupplier}
                    onChange={(e) =>
                      patchRow(extrasRow, { setPrimarySupplier: e.target.checked })
                    }
                    className="size-3.5 rounded border-border"
                  />
                  Primary supplier
                </label>
              </div>
            </div>
          ) : null}

          {canSetSellPrice ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Label label={`Branch sell price${currencyCode ? ` (${currencyCode})` : ""}`}>
                <input
                  type="number"
                  inputMode="decimal"
                  className={icClass()}
                  placeholder="0.00"
                  value={extrasDraft.sellingPrice}
                  onChange={(e) => patchRow(extrasRow, { sellingPrice: e.target.value })}
                />
              </Label>
              <Label label="Effective from">
                <input
                  type="date"
                  className={icClass()}
                  value={extrasDraft.sellEffectiveFrom}
                  onChange={(e) =>
                    patchRow(extrasRow, { sellEffectiveFrom: e.target.value })
                  }
                />
              </Label>
              <Label className="sm:col-span-2" label="Branch">
                <select
                  className={productFormSelectClass}
                  value={extrasDraft.sellBranchId}
                  onChange={(e) => patchRow(extrasRow, { sellBranchId: e.target.value })}
                >
                  <option value="">All locations</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Label>
            </div>
          ) : null}

          <Label label="Description">
            <textarea
              className={productFormTextareaClass}
              placeholder="Optional"
              rows={2}
              value={extrasDraft.description}
              onChange={(e) => patchRow(extrasRow, { description: e.target.value })}
            />
          </Label>

          <div className="grid gap-2 sm:grid-cols-2">
            {!parentIsProductGroup || !parentCategoryId ? (
              <Label label="Category">
                <select
                  className={productFormSelectClass}
                  value={extrasDraft.categoryId}
                  onChange={(e) => patchRow(extrasRow, { categoryId: e.target.value })}
                >
                  <option value="">Same as parent</option>
                  {sortedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {!c.active ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </Label>
            ) : (
              <Label label="Category override">
                <select
                  className={productFormSelectClass}
                  value={extrasDraft.categoryId}
                  onChange={(e) => patchRow(extrasRow, { categoryId: e.target.value })}
                >
                  {sortedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {!c.active ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </Label>
            )}
            <Label label="Unit">
              <input
                className={icClass()}
                placeholder="each, kg…"
                value={extrasDraft.unitType}
                onChange={(e) => patchRow(extrasRow, { unitType: e.target.value })}
              />
            </Label>
          </div>

          <div className="space-y-1.5">
            <span className={productFormLabelClass}>Cover photo</span>
            {extrasRow === 0 || variantDraftRows.length === 1 ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={coverImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setPendingVariantImage(file);
                    if (file) patchRow(0, { imageKey: "" });
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => coverImageInputRef.current?.click()}
                >
                  <Upload className="size-3.5" aria-hidden />
                  {pendingVariantImage ? "Change" : "Upload"}
                </Button>
                {pendingVariantImage ? (
                  <>
                    <span className="max-w-[10rem] truncate text-xs text-muted-foreground">
                      {pendingVariantImage.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-1.5"
                      onClick={() => {
                        setPendingVariantImage(null);
                        if (coverImageInputRef.current) {
                          coverImageInputRef.current.value = "";
                        }
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Applies to variant 1 only.</p>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Label label="Min stock">
              <input
                type="number"
                inputMode="decimal"
                className={icClass()}
                placeholder="—"
                value={extrasDraft.minStockLevel}
                onChange={(e) => patchRow(extrasRow, { minStockLevel: e.target.value })}
              />
            </Label>
            <Label label="Reorder at">
              <input
                type="number"
                inputMode="decimal"
                className={icClass()}
                placeholder="—"
                value={extrasDraft.reorderLevel}
                onChange={(e) => patchRow(extrasRow, { reorderLevel: e.target.value })}
              />
            </Label>
            <Label label="Reorder qty">
              <input
                type="number"
                inputMode="decimal"
                className={icClass()}
                placeholder="—"
                value={extrasDraft.reorderQty}
                onChange={(e) => patchRow(extrasRow, { reorderQty: e.target.value })}
              />
            </Label>
          </div>
        </div>
      ) : null}

      {scannerRow != null ? (
        <BarcodeScanner
          onScan={(barcode) => {
            patchRow(scannerRow, { barcode });
            setScannerRow(null);
          }}
          onClose={() => setScannerRow(null)}
        />
      ) : null}
    </form>
  );
}
