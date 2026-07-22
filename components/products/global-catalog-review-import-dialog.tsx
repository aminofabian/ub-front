"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  PackagePlus,
  SkipForward,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GlobalCatalogImportProgress } from "@/components/products/global-catalog-import-progress";
import {
  adoptStatusClassName,
  adoptStatusPresentation,
} from "@/lib/global-catalog-adopt-status";
import {
  isImportableAdoptStatus,
  isSkuConflictStatus,
  isUnresolvedSkuConflict,
} from "@/lib/global-catalog-sku-conflict";
import { cn, formatMoney } from "@/lib/utils";
import type {
  CategoryRecord,
  GlobalCatalogAdoptLine,
  GlobalCatalogAdoptProgress,
  GlobalCatalogAdoptResult,
  GlobalCategoryRecord,
  GlobalProductRecord,
} from "@/lib/api";

type BulkDefaultsDraft = {
  categoryId: string;
  buyingPrice: string;
  sellingPrice: string;
  openingQty: string;
  reorderLevel: string;
  reorderQty: string;
  minStockLevel: string;
};

const EMPTY_BULK_DEFAULTS: BulkDefaultsDraft = {
  categoryId: "",
  buyingPrice: "",
  sellingPrice: "",
  openingQty: "",
  reorderLevel: "",
  reorderQty: "",
  minStockLevel: "",
};

type ListFilter = "all" | "attention" | "ready";

type PreviewLine = GlobalCatalogAdoptResult["lines"][number];

type GlobalCatalogReviewImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: GlobalProductRecord[];
  branchName: string;
  currency?: string;
  tenantCategories: CategoryRecord[];
  metaCategories: GlobalCategoryRecord[];
  lineOverrides: Map<string, GlobalCatalogAdoptLine>;
  skippedProductIds: Set<string>;
  previewResult: GlobalCatalogAdoptResult | null;
  previewLoading: boolean;
  readyImportCount: number;
  createMissingCategories: boolean;
  onCreateMissingCategoriesChange: (value: boolean) => void;
  adopting: boolean;
  importProgress: GlobalCatalogAdoptProgress | null;
  canAdopt: boolean;
  unresolvedConflictCount: number;
  unresolvedConflictLines: PreviewLine[];
  duplicateImportLines: PreviewLine[];
  nonImportableLines: PreviewLine[];
  skippablePreviewLines: PreviewLine[];
  onUpdateOverride: (
    productId: string,
    patch: Partial<GlobalCatalogAdoptLine>,
  ) => void;
  onApplyBulkDefaults: (patch: Partial<GlobalCatalogAdoptLine>) => void;
  onMarkSkuConflictSkip: (productId: string) => void;
  onMarkSkuConflictRename: (productId: string, currentSku: string) => void;
  onMarkSkuConflictMerge: (productId: string) => void;
  onSkipProduct: (productId: string) => void;
  onUnskipProduct: (productId: string) => void;
  onBulkSkipSkuConflicts: () => void;
  onBulkRenameSkuConflicts: () => void;
  onBulkMergeSkuConflicts: () => void;
  onBulkSkipDuplicates: () => void;
  onBulkSkipAllProblems: () => void;
  onBulkClearSkipped: () => void;
  onImport: () => void;
  onViewExisting: (itemId: string) => void;
};

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function suggestedCategoryIdFor(
  product: GlobalProductRecord,
  metaCategories: GlobalCategoryRecord[],
  tenantCategories: CategoryRecord[],
): string {
  const globalCategory = metaCategories.find((c) => c.id === product.globalCategoryId);
  const slugHint = globalCategory?.tenantCategorySlugHint?.trim();
  if (!slugHint) return "";
  return tenantCategories.find((category) => category.slug === slugHint)?.id ?? "";
}

function needsAttention(
  productId: string,
  previewLine: PreviewLine | undefined,
  skipped: boolean,
  onSkuConflict: GlobalCatalogAdoptLine["onSkuConflict"],
): boolean {
  if (skipped) return false;
  if (!previewLine) return false;
  if (isUnresolvedSkuConflict(previewLine.status, onSkuConflict, skipped)) {
    return true;
  }
  return !isImportableAdoptStatus(previewLine.status);
}

function usefulPreviewMessage(message: string | null | undefined): string | null {
  const trimmed = message?.trim();
  if (!trimmed) return null;
  if (trimmed === "Will import") return null;
  return trimmed;
}

export function GlobalCatalogReviewImportDialog({
  open,
  onOpenChange,
  products,
  branchName,
  currency,
  tenantCategories,
  metaCategories,
  lineOverrides,
  skippedProductIds,
  previewResult,
  previewLoading,
  readyImportCount,
  createMissingCategories,
  onCreateMissingCategoriesChange,
  adopting,
  importProgress,
  canAdopt,
  unresolvedConflictCount,
  unresolvedConflictLines,
  duplicateImportLines,
  nonImportableLines,
  skippablePreviewLines,
  onUpdateOverride,
  onApplyBulkDefaults,
  onMarkSkuConflictSkip,
  onMarkSkuConflictRename,
  onMarkSkuConflictMerge,
  onSkipProduct,
  onUnskipProduct,
  onBulkSkipSkuConflicts,
  onBulkRenameSkuConflicts,
  onBulkMergeSkuConflicts,
  onBulkSkipDuplicates,
  onBulkSkipAllProblems,
  onBulkClearSkipped,
  onImport,
  onViewExisting,
}: GlobalCatalogReviewImportDialogProps) {
  const [bulkDefaults, setBulkDefaults] = useState<BulkDefaultsDraft>(EMPTY_BULK_DEFAULTS);
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const previewByProductId = useMemo(() => {
    const map = new Map<string, PreviewLine>();
    for (const line of previewResult?.lines ?? []) {
      map.set(line.globalProductId, line);
    }
    return map;
  }, [previewResult]);

  const attentionCount = useMemo(() => {
    let count = 0;
    for (const product of products) {
      if (
        needsAttention(
          product.id,
          previewByProductId.get(product.id),
          skippedProductIds.has(product.id),
          lineOverrides.get(product.id)?.onSkuConflict,
        )
      ) {
        count += 1;
      }
    }
    return count;
  }, [products, previewByProductId, skippedProductIds, lineOverrides]);

  useEffect(() => {
    if (!open) {
      setBulkDefaults(EMPTY_BULK_DEFAULTS);
      setListFilter("all");
      setExpandedIds(new Set());
    }
  }, [open]);

  useEffect(() => {
    if (!open || attentionCount === 0) return;
    setListFilter((current) => (current === "all" ? "attention" : current));
  }, [open, attentionCount]);

  useEffect(() => {
    if (!open || !previewResult) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const product of products) {
        const previewLine = previewByProductId.get(product.id);
        if (
          needsAttention(
            product.id,
            previewLine,
            skippedProductIds.has(product.id),
            lineOverrides.get(product.id)?.onSkuConflict,
          )
        ) {
          next.add(product.id);
        }
      }
      return next;
    });
  }, [
    open,
    previewResult,
    products,
    previewByProductId,
    skippedProductIds,
    lineOverrides,
  ]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const aAttention = needsAttention(
        a.id,
        previewByProductId.get(a.id),
        skippedProductIds.has(a.id),
        lineOverrides.get(a.id)?.onSkuConflict,
      )
        ? 0
        : 1;
      const bAttention = needsAttention(
        b.id,
        previewByProductId.get(b.id),
        skippedProductIds.has(b.id),
        lineOverrides.get(b.id)?.onSkuConflict,
      )
        ? 0
        : 1;
      if (aAttention !== bAttention) return aAttention - bAttention;
      return a.name.localeCompare(b.name);
    });
  }, [products, previewByProductId, skippedProductIds, lineOverrides]);

  const visibleProducts = useMemo(() => {
    if (listFilter === "all") return sortedProducts;
    return sortedProducts.filter((product) => {
      const attention = needsAttention(
        product.id,
        previewByProductId.get(product.id),
        skippedProductIds.has(product.id),
        lineOverrides.get(product.id)?.onSkuConflict,
      );
      if (listFilter === "attention") return attention;
      return !attention && !skippedProductIds.has(product.id);
    });
  }, [
    listFilter,
    sortedProducts,
    previewByProductId,
    skippedProductIds,
    lineOverrides,
  ]);

  const bulkHasValues =
    Boolean(bulkDefaults.categoryId) ||
    Boolean(bulkDefaults.buyingPrice.trim()) ||
    Boolean(bulkDefaults.sellingPrice.trim()) ||
    Boolean(bulkDefaults.openingQty.trim()) ||
    Boolean(bulkDefaults.reorderLevel.trim()) ||
    Boolean(bulkDefaults.reorderQty.trim()) ||
    Boolean(bulkDefaults.minStockLevel.trim());

  const applyBulkDefaults = () => {
    const patch: Partial<GlobalCatalogAdoptLine> = {};
    if (bulkDefaults.categoryId === "__uncategorized__") {
      patch.categoryId = "";
    } else if (bulkDefaults.categoryId) {
      patch.categoryId = bulkDefaults.categoryId;
    }
    const buyingPrice = parseOptionalNumber(bulkDefaults.buyingPrice);
    if (buyingPrice !== undefined) patch.buyingPrice = buyingPrice;
    const sellingPrice = parseOptionalNumber(bulkDefaults.sellingPrice);
    if (sellingPrice !== undefined) patch.sellingPrice = sellingPrice;
    const openingQty = parseOptionalNumber(bulkDefaults.openingQty);
    if (openingQty !== undefined) patch.openingQty = openingQty;
    const reorderLevel = parseOptionalNumber(bulkDefaults.reorderLevel);
    if (reorderLevel !== undefined) patch.reorderLevel = reorderLevel;
    const reorderQty = parseOptionalNumber(bulkDefaults.reorderQty);
    if (reorderQty !== undefined) patch.reorderQty = reorderQty;
    const minStockLevel = parseOptionalNumber(bulkDefaults.minStockLevel);
    if (minStockLevel !== undefined) patch.minStockLevel = minStockLevel;
    if (Object.keys(patch).length === 0) return;
    onApplyBulkDefaults(patch);
  };

  const toggleExpanded = (productId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const importDisabled =
    adopting ||
    previewLoading ||
    !canAdopt ||
    readyImportCount === 0 ||
    unresolvedConflictCount > 0;

  const showBulkActions =
    Boolean(previewResult) &&
    !previewLoading &&
    !adopting &&
    (unresolvedConflictLines.length > 0 ||
      duplicateImportLines.length > 0 ||
      nonImportableLines.length > 0 ||
      skippedProductIds.size > 0);

  const productNames = useMemo(
    () => products.map((product) => product.name).filter(Boolean),
    [products],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (adopting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0"
        showCloseButton={!adopting}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border/70 px-4 py-3 pr-12">
          <DialogTitle>Review & import</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {products.length} selected · into {branchName}
            {previewLoading ? (
              <span className="ml-2 inline-flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                Checking…
              </span>
            ) : previewResult ? (
              <span className="ml-1 tabular-nums">
                · {readyImportCount} ready
                {previewResult.skippedCount > 0
                  ? ` · ${previewResult.skippedCount} will skip`
                  : ""}
                {attentionCount > 0 ? ` · ${attentionCount} need attention` : ""}
              </span>
            ) : null}
          </p>
        </DialogHeader>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            adopting && "pointer-events-none opacity-50",
          )}
        >
          <section className="border-b border-border/70 bg-muted/25 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Apply defaults to all
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Fill only what you want to set once, then apply. Leave blank to
                  keep each product&apos;s catalog value.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 text-xs"
                disabled={!bulkHasValues}
                onClick={applyBulkDefaults}
              >
                Apply to {products.length}
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Field label="Category">
                <select
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  value={bulkDefaults.categoryId}
                  onChange={(e) =>
                    setBulkDefaults((prev) => ({
                      ...prev,
                      categoryId: e.target.value,
                    }))
                  }
                >
                  <option value="">Keep each</option>
                  <option value="__uncategorized__">Uncategorized</option>
                  {tenantCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sell price">
                <Input
                  type="number"
                  className="h-8 text-xs"
                  placeholder="Keep each"
                  value={bulkDefaults.sellingPrice}
                  onChange={(e) =>
                    setBulkDefaults((prev) => ({
                      ...prev,
                      sellingPrice: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Buy price">
                <Input
                  type="number"
                  className="h-8 text-xs"
                  placeholder="Keep each"
                  value={bulkDefaults.buyingPrice}
                  onChange={(e) =>
                    setBulkDefaults((prev) => ({
                      ...prev,
                      buyingPrice: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Open stock">
                <Input
                  type="number"
                  className="h-8 text-xs"
                  placeholder="Keep each"
                  value={bulkDefaults.openingQty}
                  onChange={(e) =>
                    setBulkDefaults((prev) => ({
                      ...prev,
                      openingQty: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Reorder level">
                <Input
                  type="number"
                  className="h-8 text-xs"
                  placeholder="Keep each"
                  value={bulkDefaults.reorderLevel}
                  onChange={(e) =>
                    setBulkDefaults((prev) => ({
                      ...prev,
                      reorderLevel: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Reorder qty">
                <Input
                  type="number"
                  className="h-8 text-xs"
                  placeholder="Keep each"
                  value={bulkDefaults.reorderQty}
                  onChange={(e) =>
                    setBulkDefaults((prev) => ({
                      ...prev,
                      reorderQty: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Min stock">
                <Input
                  type="number"
                  className="h-8 text-xs"
                  placeholder="Keep each"
                  value={bulkDefaults.minStockLevel}
                  onChange={(e) =>
                    setBulkDefaults((prev) => ({
                      ...prev,
                      minStockLevel: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border"
                checked={createMissingCategories}
                onChange={(e) => onCreateMissingCategoriesChange(e.target.checked)}
              />
              <span>
                Create missing categories from catalog hints when your shop has no
                matching category
              </span>
            </label>
          </section>

          {showBulkActions ? (
            <section className="space-y-2 border-b border-border/70 px-4 py-3">
              <p className="text-[11px] font-medium text-foreground">
                Resolve problems
              </p>
              <div className="flex flex-wrap gap-2">
                {unresolvedConflictLines.length > 0 ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={onBulkSkipSkuConflicts}
                    >
                      Skip {unresolvedConflictLines.length} conflicts
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={onBulkRenameSkuConflicts}
                    >
                      Rename all conflicts
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={onBulkMergeSkuConflicts}
                    >
                      Merge all conflicts
                    </Button>
                  </>
                ) : null}
                {duplicateImportLines.length > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={onBulkSkipDuplicates}
                  >
                    Skip {duplicateImportLines.length} duplicates
                  </Button>
                ) : null}
                {nonImportableLines.length > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={onBulkSkipAllProblems}
                  >
                    Skip all problems ({nonImportableLines.length})
                  </Button>
                ) : null}
                {skippedProductIds.size > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={onBulkClearSkipped}
                  >
                    Undo skips ({skippedProductIds.size})
                  </Button>
                ) : null}
              </div>
              {unresolvedConflictLines.length > 0 ? (
                <p className="text-[10px] text-muted-foreground">
                  Conflicts need a choice: skip, rename (new SKU), or merge (link
                  to existing product).
                </p>
              ) : skippablePreviewLines.length > 0 ? (
                <p className="text-[10px] text-muted-foreground">
                  Some rows cannot be imported as-is — skip them or fix
                  individually below.
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-foreground">
                Products
                <span className="ml-1 font-normal text-muted-foreground">
                  ({visibleProducts.length}
                  {listFilter !== "all" ? ` of ${products.length}` : ""})
                </span>
              </p>
              {attentionCount > 0 || listFilter !== "all" ? (
                <div className="flex flex-wrap gap-1">
                  <FilterChip
                    active={listFilter === "all"}
                    onClick={() => setListFilter("all")}
                    label="All"
                  />
                  <FilterChip
                    active={listFilter === "attention"}
                    onClick={() => setListFilter("attention")}
                    label={`Needs attention${attentionCount > 0 ? ` (${attentionCount})` : ""}`}
                    tone="warn"
                  />
                  <FilterChip
                    active={listFilter === "ready"}
                    onClick={() => setListFilter("ready")}
                    label="Ready"
                    tone="ready"
                  />
                </div>
              ) : null}
            </div>

            {visibleProducts.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/80 px-3 py-6 text-center text-xs text-muted-foreground">
                {listFilter === "attention"
                  ? "No products need attention."
                  : "No products in this view."}
              </p>
            ) : (
              <ul className="space-y-2">
                {visibleProducts.map((product) => {
                  const override = lineOverrides.get(product.id);
                  const previewLine = previewByProductId.get(product.id);
                  const isSkipped = skippedProductIds.has(product.id);
                  const expanded = expandedIds.has(product.id);
                  return (
                    <ProductReviewRow
                      key={product.id}
                      product={product}
                      currency={currency}
                      tenantCategories={tenantCategories}
                      metaCategories={metaCategories}
                      override={override}
                      previewLine={previewLine}
                      isSkipped={isSkipped}
                      expanded={expanded}
                      onToggleExpanded={() => toggleExpanded(product.id)}
                      onUpdateOverride={onUpdateOverride}
                      onMarkSkuConflictSkip={onMarkSkuConflictSkip}
                      onMarkSkuConflictRename={onMarkSkuConflictRename}
                      onMarkSkuConflictMerge={onMarkSkuConflictMerge}
                      onSkipProduct={onSkipProduct}
                      onUnskipProduct={onUnskipProduct}
                      onViewExisting={onViewExisting}
                    />
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="shrink-0 border-t border-border/70 bg-background px-4 py-3">
          {importProgress ? (
            <GlobalCatalogImportProgress
              progress={importProgress}
              productNames={productNames}
            />
          ) : (
            <>
              {unresolvedConflictCount > 0 ? (
                <p className="mb-2 flex items-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  Resolve {unresolvedConflictCount} SKU conflict
                  {unresolvedConflictCount === 1 ? "" : "s"} before importing.
                </p>
              ) : null}
              <Button
                className="w-full"
                disabled={importDisabled}
                onClick={onImport}
              >
                {adopting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <PackagePlus className="mr-2 size-4" />
                )}
                Import {readyImportCount > 0 ? readyImportCount : products.length}{" "}
                products
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: "warn" | "ready";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
        active
          ? tone === "warn"
            ? "border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-100"
            : tone === "ready"
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100"
              : "border-foreground/20 bg-foreground/10 text-foreground"
          : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

function ProductReviewRow({
  product,
  currency,
  tenantCategories,
  metaCategories,
  override,
  previewLine,
  isSkipped,
  expanded,
  onToggleExpanded,
  onUpdateOverride,
  onMarkSkuConflictSkip,
  onMarkSkuConflictRename,
  onMarkSkuConflictMerge,
  onSkipProduct,
  onUnskipProduct,
  onViewExisting,
}: {
  product: GlobalProductRecord;
  currency?: string;
  tenantCategories: CategoryRecord[];
  metaCategories: GlobalCategoryRecord[];
  override: GlobalCatalogAdoptLine | undefined;
  previewLine: PreviewLine | undefined;
  isSkipped: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onUpdateOverride: (
    productId: string,
    patch: Partial<GlobalCatalogAdoptLine>,
  ) => void;
  onMarkSkuConflictSkip: (productId: string) => void;
  onMarkSkuConflictRename: (productId: string, currentSku: string) => void;
  onMarkSkuConflictMerge: (productId: string) => void;
  onSkipProduct: (productId: string) => void;
  onUnskipProduct: (productId: string) => void;
  onViewExisting: (itemId: string) => void;
}) {
  const status = previewLine
    ? adoptStatusPresentation(previewLine.status)
    : isSkipped
      ? { label: "Skipped", tone: "skip" as const }
      : null;
  const conflictSku =
    previewLine?.sku ?? override?.sku ?? product.skuTemplate ?? "";
  const showConflictActions =
    isSkuConflictStatus(previewLine?.status) && !isSkipped;
  const suggestedCategoryId = suggestedCategoryIdFor(
    product,
    metaCategories,
    tenantCategories,
  );
  const categoryId = override?.categoryId ?? suggestedCategoryId;
  const categoryName =
    tenantCategories.find((category) => category.id === categoryId)?.name ??
    "Uncategorized";
  const sellPrice =
    override?.sellingPrice ?? product.recommendedSellingPrice ?? null;
  const message = usefulPreviewMessage(previewLine?.message);
  const attention = needsAttention(
    product.id,
    previewLine,
    isSkipped,
    override?.onSkuConflict,
  );
  const showReadyCheck = status?.tone === "ready" && !attention && !isSkipped;

  return (
    <li
      className={cn(
        "rounded-lg border border-border/80 bg-background",
        (status?.tone === "skip" || isSkipped) && "opacity-70",
        status?.tone === "error" && "border-destructive/40",
        attention && "border-amber-500/35",
      )}
    >
      <div className="flex items-stretch gap-1 p-2 sm:gap-2 sm:p-2.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 rounded-md px-1 py-0.5 text-left hover:bg-muted/50"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
        >
          <span className="mt-0.5 text-muted-foreground">
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {product.name || "Untitled product"}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              <span className="tabular-nums">
                {sellPrice != null
                  ? formatMoney(sellPrice, currency)
                  : "No sell price"}
              </span>
              <span aria-hidden>·</span>
              <span className="truncate">{categoryName}</span>
              {message ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="truncate">{message}</span>
                </>
              ) : null}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          {showReadyCheck ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-200"
              title="Ready to import"
            >
              <Check className="size-3" />
              Ready
            </span>
          ) : status ? (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                adoptStatusClassName(status.tone),
              )}
            >
              {status.label}
            </span>
          ) : null}
          {isSkipped ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={() => onUnskipProduct(product.id)}
            >
              Undo
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] text-muted-foreground"
              onClick={() => onSkipProduct(product.id)}
              title="Skip this product"
            >
              <SkipForward className="size-3.5" />
              <span className="sr-only sm:not-sr-only sm:ml-1">Skip</span>
            </Button>
          )}
        </div>
      </div>

      {expanded ? (
        <div className="space-y-2 border-t border-border/60 px-3 pb-3 pt-2">
          {showConflictActions ? (
            <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5">
              <p className="text-[11px] font-medium text-amber-900 dark:text-amber-100">
                SKU <span className="font-mono">{conflictSku}</span> is already in
                your catalog. Choose what to do:
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => onMarkSkuConflictSkip(product.id)}
                >
                  Skip
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() =>
                    onMarkSkuConflictRename(product.id, conflictSku)
                  }
                >
                  Rename
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => onMarkSkuConflictMerge(product.id)}
                >
                  Merge
                </Button>
                {previewLine?.itemId ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => onViewExisting(previewLine.itemId!)}
                  >
                    View existing
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {override?.onSkuConflict === "merge" && !isSkipped ? (
            <p className="text-[11px] text-muted-foreground">
              Will link this catalog item to your existing product
              {previewLine?.itemId ? (
                <>
                  {" "}
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    onClick={() => onViewExisting(previewLine.itemId!)}
                  >
                    (view)
                  </button>
                </>
              ) : null}
              .
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Field label="SKU">
              <Input
                className="h-8 text-xs"
                value={override?.sku ?? product.skuTemplate ?? ""}
                onChange={(e) =>
                  onUpdateOverride(product.id, { sku: e.target.value })
                }
              />
            </Field>
            <Field label="Category">
              <select
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                value={categoryId}
                onChange={(e) =>
                  onUpdateOverride(product.id, {
                    categoryId: e.target.value || undefined,
                  })
                }
              >
                <option value="">Uncategorized</option>
                {tenantCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Buy price">
              <Input
                type="number"
                className="h-8 text-xs"
                value={
                  override?.buyingPrice ?? product.recommendedBuyingPrice ?? ""
                }
                onChange={(e) =>
                  onUpdateOverride(product.id, {
                    buyingPrice: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Sell price">
              <Input
                type="number"
                className="h-8 text-xs"
                value={
                  override?.sellingPrice ??
                  product.recommendedSellingPrice ??
                  ""
                }
                onChange={(e) =>
                  onUpdateOverride(product.id, {
                    sellingPrice: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Open stock">
              <Input
                type="number"
                className="h-8 text-xs"
                value={override?.openingQty ?? ""}
                onChange={(e) =>
                  onUpdateOverride(product.id, {
                    openingQty: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Reorder level">
              <Input
                type="number"
                className="h-8 text-xs"
                value={
                  override?.reorderLevel ?? product.defaultReorderLevel ?? ""
                }
                onChange={(e) =>
                  onUpdateOverride(product.id, {
                    reorderLevel: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Reorder qty">
              <Input
                type="number"
                className="h-8 text-xs"
                value={override?.reorderQty ?? product.defaultReorderQty ?? ""}
                onChange={(e) =>
                  onUpdateOverride(product.id, {
                    reorderQty: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Min stock">
              <Input
                type="number"
                className="h-8 text-xs"
                value={
                  override?.minStockLevel ?? product.defaultMinStockLevel ?? ""
                }
                onChange={(e) =>
                  onUpdateOverride(product.id, {
                    minStockLevel: Number(e.target.value),
                  })
                }
              />
            </Field>
          </div>
        </div>
      ) : null}
    </li>
  );
}
