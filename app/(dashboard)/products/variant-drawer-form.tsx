"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronDown, ChevronRight, Plus, Trash2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { FormDrawerFields, FormDrawerSheet } from "@/components/form-drawer";
import { cn } from "@/lib/utils";
import type { BranchRecord, CategoryRecord, SupplierRecord } from "@/lib/api";
import { type VariantDraft, emptyVariantDraft } from "./_types";
import { formatAmount, toNumber } from "./_utils";
import { StockIncreaseFields } from "./_components/StockIncreaseFields";
import {
  productFormHintClass,
  productFormInputClass,
  productFormLabelClass,
  productFormMetaClass,
  productFormRequiredClass,
  productFormSectionTitleClass,
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
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className={cn(productFormLabelClass, "flex items-center gap-1")}>
        {label}
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
      className="flex w-full items-center gap-2 border-y border-border bg-muted/15 px-3 py-2 text-left transition-colors hover:bg-muted/25"
    >
      {expanded ? (
        <ChevronDown className="size-3.5 shrink-0 text-foreground/40" aria-hidden />
      ) : (
        <ChevronRight className="size-3.5 shrink-0 text-foreground/40" aria-hidden />
      )}
      <span className="min-w-0 flex-1 text-[11px] font-semibold tracking-tight text-foreground/70">
        {label}
      </span>
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
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition",
        checked
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground/55 hover:border-foreground/40 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex size-3 items-center justify-center border transition",
          checked
            ? "border-background/40 bg-transparent text-background"
            : "border-muted-foreground/45 bg-background",
        )}
      >
        {checked ? (
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden>
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
  if (buy == null) {
    return { ...prev, defaultCostPrice: buyRaw, openingUnitCost: "" };
  }
  const packQty = Math.max(1, toNumber(prev.bundleQty) ?? 1);
  const perUnit = buy / packQty;
  const perUnitStr = Number.isFinite(perUnit) ? String(perUnit) : "";
  return {
    ...prev,
    defaultCostPrice: buyRaw,
    // Stock unit cost mirrors buy price — no separate field in the drawer.
    openingUnitCost: perUnitStr,
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
          : "text-foreground/35";

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
        className="flex min-w-[4.5rem] flex-col items-center justify-end gap-1 rounded-none border border-border bg-muted/15 px-2 py-1.5 sm:min-h-[4.25rem]"
        aria-live="polite"
      >
        <span className={productFormSectionTitleClass}>Margin</span>
        <span className={cn("text-base font-semibold tabular-nums leading-none", tone)}>
          {marginInfo ? `${marginInfo.margin.toFixed(0)}%` : "—"}
        </span>
        {marginInfo ? (
          <span className={cn(productFormHintClass, "tabular-nums")}>
            +{currencyCode || "KES"} {formatAmount(marginInfo.profit)}
          </span>
        ) : (
          <span className={productFormHintClass}>per sale</span>
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
  parentCategoryId,
  sortedCategories,
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
  parentCategoryId?: string;
  sortedCategories: CategoryRecord[];
  onScanBarcode: () => void;
}) {
  const costPerUnit = useMemo(() => {
    const buy = toNumber(row.defaultCostPrice);
    const pack = Math.max(1, toNumber(row.bundleQty) ?? 1);
    if (buy != null) return buy / pack;
    return null;
  }, [row.defaultCostPrice, row.bundleQty]);

  const categorySelectValue =
    row.categoryId.trim() || parentCategoryId?.trim() || "";

  const categoryField = (
    <Label className="gap-0.5" label="Category">
      <select
        className={productFormSelectClass}
        value={categorySelectValue}
        onChange={(e) => onPatch({ categoryId: e.target.value })}
      >
        {!parentCategoryId ? (
          <option value="">— None —</option>
        ) : null}
        {sortedCategories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {!c.active ? " (inactive)" : ""}
          </option>
        ))}
      </select>
    </Label>
  );

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

      <FormDrawerSheet>
      <FormDrawerFields appearance="sharp" embedded>
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

      <FormDrawerFields legend="Codes" appearance="sharp" embedded>
        <div className="grid gap-2 sm:grid-cols-2">
          <Label label="Barcode">
            <div className="flex gap-px overflow-hidden rounded-none border border-border bg-border">
              <input
                className={cn(
                  icClass(),
                  "min-w-0 flex-1 border-0 font-mono text-xs focus-visible:ring-inset",
                )}
                placeholder="Scan or type"
                value={row.barcode}
                onChange={(e) => onPatch({ barcode: e.target.value })}
              />
              <button
                type="button"
                onClick={onScanBarcode}
                className="flex size-8 shrink-0 items-center justify-center bg-background text-foreground/50 hover:bg-muted/50 hover:text-foreground"
                aria-label="Scan barcode"
              >
                <Camera className="size-3.5" aria-hidden />
              </button>
            </div>
          </Label>
          <div className="flex min-w-0 flex-col gap-1.5">
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
                  className="h-8 shrink-0 rounded-none px-2 font-mono text-[10px] tracking-tight shadow-none"
                  onClick={() => onPatch({ sku: suggestedNextSku })}
                >
                  {suggestedNextSku}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </FormDrawerFields>

      {canInventoryWrite && !row.isPackageVariant ? (
        <FormDrawerFields legend="Stock" appearance="sharp" embedded>
          <StockIncreaseFields
            mode="opening"
            minimal
            hideUnitCostInput
            branches={branches}
            branchId={row.openingBranchId}
            onBranchIdChange={(id) => onPatch({ openingBranchId: id })}
            quantity={row.openingQty}
            onQuantityChange={(v) => onPatch({ openingQty: v })}
            unitCost={row.openingUnitCost}
            onUnitCostChange={(v) => onPatch({ openingUnitCost: v })}
            currentUnitCost={costPerUnit}
            quantityAside={categoryField}
            className="space-y-2 border-0 bg-transparent p-0 shadow-none ring-0"
          />
        </FormDrawerFields>
      ) : (
        <FormDrawerFields legend="Category" appearance="sharp" embedded>
          {categoryField}
        </FormDrawerFields>
      )}
      </FormDrawerSheet>
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
  parentCategoryName: _parentCategoryName,
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

  useEffect(() => {
    const parentCat = parentCategoryId?.trim();
    if (!parentCat) return;
    setVariantDraftRows((rows) => {
      let changed = false;
      const next = rows.map((r) => {
        if (r.categoryId.trim()) return r;
        changed = true;
        return { ...r, categoryId: parentCat };
      });
      return changed ? next : rows;
    });
  }, [parentCategoryId, setVariantDraftRows]);

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
          parentCategoryId={parentCategoryId}
          sortedCategories={sortedCategories}
          onScanBarcode={() => setScannerRow(index)}
        />
      ))}

      <div className="flex justify-center pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs shadow-none"
          onClick={addVariantDraftRow}
        >
          <Plus className="size-3.5" aria-hidden />
          Add another variant
        </Button>
      </div>

      {variantDraftRows.length > 1 ? (
        <div className={cn("flex flex-wrap items-center gap-2", productFormMetaClass)}>
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
            <span className="inline-flex size-1.5 rounded-none bg-foreground" />
          ) : undefined
        }
      />

      {moreExpanded ? (
        <div className="space-y-3 border border-t-0 border-border bg-background p-3 shadow-none">
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
                    className="size-3.5 rounded-none border-border"
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

          <Label label="Unit">
            <input
              className={icClass()}
              placeholder="each, kg…"
              value={extrasDraft.unitType}
              onChange={(e) => patchRow(extrasRow, { unitType: e.target.value })}
            />
          </Label>

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
