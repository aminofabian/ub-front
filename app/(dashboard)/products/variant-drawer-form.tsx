"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Barcode,
  Boxes,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Hash,
  Layers2,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BranchRecord, CategoryRecord, SupplierRecord } from "@/lib/api";
import { type VariantDraft, emptyVariantDraft } from "./_types";
import { toNumber } from "./_utils";
import { StockIncreaseFields } from "./_components/StockIncreaseFields";
import {
  productFormInputClass,
  productFormLabelClass,
  productFormSelectClass,
  productFormTextareaClass,
} from "./_components/product-form-styles";

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
  suggestedNextSku?: string | null;
};

const cardClass =
  "rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 via-background to-muted/15 p-4 shadow-sm sm:p-5";

function SectionToggle({
  icon: Icon,
  label,
  expanded,
  onToggle,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  expanded: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
        expanded
          ? "border-primary/20 bg-primary/[0.03] ring-1 ring-primary/10"
          : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/30",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
          expanded ? "bg-primary/10" : "bg-muted group-hover:bg-muted/80",
        )}
      >
        <Icon className={cn("size-4", expanded ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {badge}
        </div>
      </div>
      <div className="shrink-0 text-muted-foreground">
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </div>
    </button>
  );
}

function Label({
  children,
  required,
  className,
}: {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1", productFormLabelClass, className)}>
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
      className={cn(productFormInputClass, "w-full")}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      step={step}
    />
  );
}

function syncCostsFromBuy(
  buyRaw: string,
  prev: VariantDraft,
): VariantDraft {
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

function VariantRowPricing({
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
  const margin =
    buy != null && sell != null && sell > 0
      ? (((sell - buy / packQty) / sell) * 100).toFixed(1)
      : null;

  return (
    <div className={cn(cardClass, "p-3 sm:p-4")}>
      <div className="mb-3 flex items-center gap-2 border-b border-border/35 pb-2">
        <Tag className="size-4 text-primary" aria-hidden />
        <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Pricing
        </span>
        {margin != null ? (
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-foreground">
            {margin}%
          </span>
        ) : null}
      </div>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Label>
            Pack qty
            <NumberInput
              value={draft.bundleQty}
              onChange={(v) => onPatch({ bundleQty: v })}
              placeholder="1"
              min="1"
              step="1"
            />
          </Label>
          <Label>
            Pack label
            <input
              className={productFormInputClass}
              placeholder="6-pack"
              value={draft.bundleName}
              onChange={(e) => onPatch({ bundleName: e.target.value })}
            />
          </Label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Label>
            Sell price{cur}
            <NumberInput
              value={draft.bundlePrice}
              onChange={(v) => onPatch({ bundlePrice: v })}
              placeholder="0.00"
            />
          </Label>
          <Label>
            Buy price{cur}
            <NumberInput
              value={draft.defaultCostPrice}
              onChange={(v) => onPatch(syncCostsFromBuy(v, draft))}
              placeholder="0.00"
            />
          </Label>
        </div>
      </div>
    </div>
  );
}

type RowSectionKey = "stock" | "supplier" | "branchPrice";

function VariantRowCard({
  row,
  index,
  canRemove,
  onRemove,
  onPatch,
  suggestedNextSku,
  currencyCode,
  branches,
  suppliersForLink,
  suppliersLoading,
  loadSuppliersForLink,
  canLinkSupplier,
  canListSuppliers,
  canSetSellPrice,
  canInventoryWrite,
}: {
  row: VariantDraft;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  onPatch: (partial: Partial<VariantDraft>) => void;
  suggestedNextSku?: string | null;
  currencyCode: string;
  branches: BranchRecord[];
  suppliersForLink: SupplierRecord[];
  suppliersLoading: boolean;
  loadSuppliersForLink: () => void | Promise<void>;
  canLinkSupplier: boolean;
  canListSuppliers: boolean;
  canSetSellPrice: boolean;
  canInventoryWrite: boolean;
}) {
  const [expanded, setExpanded] = useState<Record<RowSectionKey, boolean>>({
    stock: index === 0,
    supplier: false,
    branchPrice: false,
  });

  const costPerUnit = useMemo(() => {
    const buy = toNumber(row.defaultCostPrice);
    const pack = Math.max(1, toNumber(row.bundleQty) ?? 1);
    if (buy != null) return buy / pack;
    return null;
  }, [row.defaultCostPrice, row.bundleQty]);

  const toggle = (key: RowSectionKey) =>
    setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const hasSupplier = Boolean(
    row.supplierId || row.supplierSku || row.defaultCostPrice,
  );

  return (
    <section className={cn(cardClass, "space-y-4")}>
      <div className="flex items-center justify-between gap-2 border-b border-border/35 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">Variant {index + 1}</h3>
        </div>
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Remove
          </Button>
        ) : null}
      </div>

      <Label required>
        Variant name
        <input
          className={cn(productFormInputClass, "text-sm font-medium")}
          placeholder="Red · 500 ml"
          value={row.variantName}
          onChange={(e) => onPatch({ variantName: e.target.value })}
          required={index === 0}
          autoComplete="off"
        />
      </Label>

      <div className="grid gap-3 sm:grid-cols-2">
        <Label>
          <span className="flex items-center gap-1">
            <Hash className="size-3" aria-hidden />
            SKU
          </span>
          <div className="flex gap-2">
            <input
              className={cn(productFormInputClass, "min-w-0 flex-1 font-mono text-xs")}
              placeholder="Auto"
              value={row.sku}
              onChange={(e) => onPatch({ sku: e.target.value })}
            />
            {index === 0 && suggestedNextSku ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 px-2 text-xs"
                onClick={() => onPatch({ sku: suggestedNextSku })}
              >
                {suggestedNextSku}
              </Button>
            ) : null}
          </div>
        </Label>
        <Label>
          <span className="flex items-center gap-1">
            <Barcode className="size-3" aria-hidden />
            Barcode
          </span>
          <input
            className={productFormInputClass}
            placeholder="Scan or type"
            value={row.barcode}
            onChange={(e) => onPatch({ barcode: e.target.value })}
          />
        </Label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Label>
          Brand
          <input
            className={productFormInputClass}
            value={row.brand}
            onChange={(e) => onPatch({ brand: e.target.value })}
          />
        </Label>
        <Label>
          Size
          <input
            className={productFormInputClass}
            value={row.size}
            onChange={(e) => onPatch({ size: e.target.value })}
          />
        </Label>
      </div>

      <Label>
        Display name
        <input
          className={productFormInputClass}
          placeholder="Optional"
          value={row.name}
          onChange={(e) => onPatch({ name: e.target.value })}
        />
      </Label>

      <VariantRowPricing draft={row} onPatch={onPatch} currencyCode={currencyCode} />

      {canInventoryWrite ? (
        <div className="space-y-3">
          <SectionToggle
            icon={Boxes}
            label="Opening stock"
            expanded={expanded.stock}
            onToggle={() => toggle("stock")}
          />
          {expanded.stock ? (
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
              className="border-0 bg-transparent p-0 shadow-none ring-0"
            />
          ) : null}
        </div>
      ) : null}

      {canLinkSupplier ? (
        <div className="space-y-3">
          <SectionToggle
            icon={Truck}
            label="Supplier"
            expanded={expanded.supplier}
            onToggle={() => toggle("supplier")}
            badge={
              hasSupplier ? (
                <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
              ) : undefined
            }
          />
          {expanded.supplier ? (
            <div className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-3">
              {canListSuppliers && suppliersForLink.length === 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={suppliersLoading}
                  onClick={() => void loadSuppliersForLink()}
                >
                  {suppliersLoading ? "Loading…" : "Load suppliers"}
                </Button>
              ) : null}
              <Label>
                Supplier
                <select
                  className={productFormSelectClass}
                  value={
                    suppliersForLink.some((s) => s.id === row.supplierId)
                      ? row.supplierId
                      : ""
                  }
                  onChange={(e) => onPatch({ supplierId: e.target.value })}
                >
                  <option value="">— None —</option>
                  {suppliersForLink.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Label>
                  Supplier SKU
                  <input
                    className={productFormInputClass}
                    value={row.supplierSku}
                    onChange={(e) => onPatch({ supplierSku: e.target.value })}
                  />
                </Label>
                <label className="flex items-center gap-2 pt-5 text-xs">
                  <input
                    type="checkbox"
                    checked={row.setPrimarySupplier}
                    onChange={(e) => onPatch({ setPrimarySupplier: e.target.checked })}
                    className="size-4 rounded border-border"
                  />
                  Primary supplier
                </label>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {canSetSellPrice ? (
        <div className="space-y-3">
          <SectionToggle
            icon={CircleDollarSign}
            label="Branch sell price"
            expanded={expanded.branchPrice}
            onToggle={() => toggle("branchPrice")}
          />
          {expanded.branchPrice ? (
            <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-border/50 bg-muted/10 p-3">
              <Label>
                Price{currencyCode ? ` (${currencyCode})` : ""}
                <NumberInput
                  value={row.sellingPrice}
                  onChange={(v) => onPatch({ sellingPrice: v })}
                  placeholder="0.00"
                />
              </Label>
              <Label>
                Effective from
                <input
                  type="date"
                  className={productFormInputClass}
                  value={row.sellEffectiveFrom}
                  onChange={(e) => onPatch({ sellEffectiveFrom: e.target.value })}
                />
              </Label>
              <Label className="sm:col-span-2">
                Branch
                <select
                  className={productFormSelectClass}
                  value={row.sellBranchId}
                  onChange={(e) => onPatch({ sellBranchId: e.target.value })}
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
        </div>
      ) : null}
    </section>
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
  suggestedNextSku,
}: Props) {
  const [extrasRow, setExtrasRow] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
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

  const hasDetailData = Boolean(
    extrasDraft.description ||
      extrasDraft.categoryId ||
      extrasDraft.unitType ||
      extrasDraft.minStockLevel ||
      extrasDraft.reorderLevel ||
      extrasDraft.reorderQty ||
      pendingVariantImage,
  );

  return (
    <form id="add-variant-form" className="space-y-5" onSubmit={onSubmit}>
      <div className="flex gap-3 rounded-xl border border-border/60 bg-gradient-to-br from-muted/30 to-background p-3 shadow-sm">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Layers2 className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {parentIsProductGroup ? "Parent group" : "Parent product"}
          </p>
          <p className="truncate text-sm font-semibold text-foreground">{parentDisplayName}</p>
        </div>
      </div>

      <div className="space-y-4">
        {variantDraftRows.map((row, index) => (
          <VariantRowCard
            key={index}
            row={row}
            index={index}
            canRemove={index > 0}
            onRemove={() => removeVariantDraftRow(index)}
            onPatch={(partial) => patchRow(index, partial)}
            suggestedNextSku={suggestedNextSku}
            currencyCode={currencyCode}
            branches={branches}
            suppliersForLink={suppliersForLink}
            suppliersLoading={suppliersLoading}
            loadSuppliersForLink={loadSuppliersForLink}
            canLinkSupplier={canLinkSupplier}
            canListSuppliers={canListSuppliers}
            canSetSellPrice={canSetSellPrice}
            canInventoryWrite={canInventoryWrite}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={addVariantDraftRow}
        >
          <Plus className="size-4" aria-hidden />
          Add another variant
        </Button>
      </div>

      {variantDraftRows.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
          <span className="text-xs text-muted-foreground">Shared fields for</span>
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

      <div className="space-y-3">
        <SectionToggle
          icon={FileText}
          label="Details & reorder"
          expanded={detailsOpen}
          onToggle={() => setDetailsOpen((o) => !o)}
          badge={
            hasDetailData ? (
              <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
            ) : undefined
          }
        />
        {detailsOpen ? (
          <div className={cn(cardClass, "space-y-4")}>
            <Label>
              Description
              <textarea
                className={productFormTextareaClass}
                placeholder="Optional"
                value={extrasDraft.description}
                onChange={(e) => patchRow(extrasRow, { description: e.target.value })}
              />
            </Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Label>
                Category
                <select
                  className={productFormSelectClass}
                  value={extrasDraft.categoryId}
                  onChange={(e) => patchRow(extrasRow, { categoryId: e.target.value })}
                >
                  <option value="">Parent</option>
                  {sortedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Label>
              <Label>
                Unit
                <input
                  className={productFormInputClass}
                  placeholder="each"
                  value={extrasDraft.unitType}
                  onChange={(e) => patchRow(extrasRow, { unitType: e.target.value })}
                />
              </Label>
            </div>

            <div className="space-y-2">
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
                    className="gap-1.5"
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
                        className="h-8 px-2"
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
                <p className="text-xs text-muted-foreground">Use variant 1 for cover photo.</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Label>
                Min stock
                <NumberInput
                  value={extrasDraft.minStockLevel}
                  onChange={(v) => patchRow(extrasRow, { minStockLevel: v })}
                />
              </Label>
              <Label>
                Reorder at
                <NumberInput
                  value={extrasDraft.reorderLevel}
                  onChange={(v) => patchRow(extrasRow, { reorderLevel: v })}
                />
              </Label>
              <Label>
                Reorder qty
                <NumberInput
                  value={extrasDraft.reorderQty}
                  onChange={(v) => patchRow(extrasRow, { reorderQty: v })}
                />
              </Label>
            </div>
          </div>
        ) : null}
      </div>
    </form>
  );
}
