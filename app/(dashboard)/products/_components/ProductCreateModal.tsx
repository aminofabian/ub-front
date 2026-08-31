"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  ImagePlus,
  Loader2,
  Minus,
  Plus,
  ScanBarcode,
  X,
} from "lucide-react";

import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FormDrawerProps } from "@/components/form-drawer";
import { useDashboard } from "@/components/dashboard-provider";
import { isButcheryBusiness } from "@/lib/business-store-type";
import {
  BUTCHER_PRODUCT_TEMPLATES,
  matchItemTypeIdForTemplate,
} from "@/lib/butcher-product-templates";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import { cn } from "@/lib/utils";
import type { BranchRecord, GlobalProductRecord, ItemTypeRecord } from "@/lib/api";

import type { CatalogListApi } from "../_hooks/useCatalogList";
import type { ProductMutationsApi } from "../_hooks/useProductMutations";
import type { ParentDraft } from "../_types";
import { formatAmount, toNumber } from "../_utils";
import { categorySelectOptions } from "./category-select-options";
import { PackageVariantsSection } from "./PackageVariantsSection";
import { ProductDescriptionField } from "./ProductDescriptionField";
import { ProductNameSuggestions } from "./ProductNameSuggestions";
import { PRODUCTS_CATALOG_VARS } from "./products-page-layout";
import {
  SearchableSelect,
  type SearchableSelectHandle,
} from "./SearchableSelect";
import { useInlineCategoryCreate } from "../_hooks/useInlineCategoryCreate";
import {
  productFormHintClass,
  productFormInputClass,
  productFormLabelClass,
} from "./product-form-styles";

type Props = {
  open: boolean;
  onClose: () => void;
  banner?: FormDrawerProps["banner"];
  catalog: Pick<
    CatalogListApi,
    "itemTypes" | "sortedCategories" | "upsertCategory"
  >;
  canCreateCategory?: boolean;
  m: Pick<
    ProductMutationsApi,
    | "parentDraft"
    | "setParentDraft"
    | "nextAutoSkuHint"
    | "suppliersForLink"
    | "suppliersLoading"
    | "loadSuppliersForLink"
    | "onCreateParent"
    | "pendingCreateImage"
    | "setPendingCreateImage"
    | "parentCreateBusy"
  >;
  canLinkSupplier: boolean;
  canListSuppliers: boolean;
  currencyCode: string;
  branches: BranchRecord[];
  canGlobalCatalog?: boolean;
  onOpenExistingProduct?: (itemId: string) => void;
};

function matchItemTypeFromHint(
  itemTypes: ItemTypeRecord[],
  hint: string | null | undefined,
): string | null {
  const key = hint?.trim().toLowerCase();
  if (!key) return null;
  const byKey = itemTypes.find((t) => t.key.trim().toLowerCase() === key);
  if (byKey) return byKey.id;
  return matchItemTypeIdForTemplate(itemTypes, key);
}

function matchCategoryIdByName(
  categories: { id: string; name: string }[],
  name: string | null | undefined,
): string | null {
  const needle = name?.trim().toLowerCase();
  if (!needle) return null;
  const exact = categories.find((c) => c.name.trim().toLowerCase() === needle);
  if (exact) return exact.id;
  const partial = categories.find((c) =>
    c.name.trim().toLowerCase().includes(needle),
  );
  return partial?.id ?? null;
}

const fieldClass = cn(
  "h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)] bg-white px-3 text-[15px] text-[var(--catalog-ink,#15231f)] shadow-none",
  "placeholder:text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_38%,transparent)]",
  "focus-visible:border-[var(--catalog-ink,#15231f)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_28%,transparent)]",
  "disabled:cursor-not-allowed disabled:bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_80%,transparent)]",
);

const labelClass =
  "text-[12px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_62%,transparent)]";

function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className={labelClass}>
        {children}
      </label>
      {hint ? (
        <span className="text-[11px] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_42%,transparent)]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function QtyStepper({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const qty = value.trim() === "" ? 0 : Number(value);
  const safe = Number.isFinite(qty) && qty >= 0 ? qty : 0;

  return (
    <div className="flex h-11 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)] bg-white">
      <button
        type="button"
        disabled={disabled || safe <= 0}
        onClick={() => onChange(safe <= 1 ? "" : String(safe - 1))}
        className="flex w-11 shrink-0 items-center justify-center text-[var(--catalog-ink,#15231f)] transition-transform duration-150 ease-out enabled:active:scale-[0.97] disabled:opacity-30"
        aria-label="Fewer items"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        id={id}
        inputMode="numeric"
        className="min-w-0 flex-1 border-x border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_10%,transparent)] bg-transparent text-center text-[15px] tabular-nums text-[var(--catalog-ink,#15231f)] outline-none placeholder:text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_38%,transparent)]"
        placeholder="0"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d.]/g, "");
          onChange(next);
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(String(safe + 1))}
        className="flex w-11 shrink-0 items-center justify-center text-[var(--catalog-ink,#15231f)] transition-transform duration-150 ease-out enabled:active:scale-[0.97] disabled:opacity-30"
        aria-label="More items"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function FamilyModeSwitch({
  checked,
  onCheckedChange,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Product family. One name, several sizes or packs."
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-2.5",
        "transition-[background-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_40%,transparent)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "bg-[var(--catalog-ink,#15231f)] text-white shadow-[0_1px_0_color-mix(in_srgb,#fff_12%,transparent)]"
          : "bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_88%,white)] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_68%,transparent)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-[1.375rem] w-[2.25rem] items-center rounded-full p-0.5 transition-colors duration-200",
          checked
            ? "bg-white/20"
            : "bg-[color-mix(in_srgb,var(--catalog-ink,#15231f)_16%,transparent)]",
        )}
      >
        <span
          className={cn(
            "size-4 rounded-full shadow-[0_1px_2px_rgba(21,35,31,0.28)] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
            checked
              ? "translate-x-[0.875rem] bg-white"
              : "translate-x-0 bg-white",
          )}
        />
      </span>
      <span className="pr-0.5 text-[12px] font-semibold tracking-[-0.01em]">
        Family
      </span>
    </button>
  );
}

export function ProductCreateModal({
  open,
  onClose,
  banner,
  catalog,
  m,
  canLinkSupplier,
  canListSuppliers,
  currencyCode,
  branches,
  canGlobalCatalog = false,
  canCreateCategory = false,
  onOpenExistingProduct,
}: Props) {
  const { business } = useDashboard();
  const showButcherTemplates = isButcheryBusiness(business);
  const fileRef = useRef<HTMLInputElement>(null);
  const categorySelectRef = useRef<SearchableSelectHandle>(null);
  const isGroup = m.parentDraft.productStructure === "group";
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [descGenError, setDescGenError] = useState("");
  const [linkedGlobalLabel, setLinkedGlobalLabel] = useState<string | null>(null);
  const categoryCreate = useInlineCategoryCreate(catalog.upsertCategory);

  useEffect(() => {
    if (!open) return;
    setKeepOpen(false);
    setScannerOpen(false);
    setMoreOpen(false);
    setDescGenError("");
    setLinkedGlobalLabel(null);
    categoryCreate.clearError();
  }, [open, categoryCreate.clearError]);

  const setFamilyMode = useCallback(
    (next: boolean) => {
      if (next) {
        m.setParentDraft((p) => ({
          ...p,
          productStructure: "group",
          isSellable: false,
          globalProductSourceId: null,
        }));
        setLinkedGlobalLabel(null);
        setMoreOpen(true);
        return;
      }
      m.setParentDraft((p) => ({
        ...p,
        productStructure: "standalone",
        isSellable: true,
      }));
    },
    [m],
  );

  const applyDerivedOpeningUnitCost = useCallback((prev: ParentDraft) => {
    const buy = toNumber(prev.buyingPrice);
    if (buy == null) return prev;
    const packQty = Math.max(1, toNumber(prev.bundleQty) ?? 1);
    const perUnit = buy / packQty;
    const perUnitStr = Number.isFinite(perUnit) ? String(perUnit) : "";
    return { ...prev, openingUnitCost: perUnitStr };
  }, []);

  const syncCostsFromBuyingPrice = useCallback(
    (buyingPrice: string, prev: ParentDraft) => {
      return applyDerivedOpeningUnitCost({ ...prev, buyingPrice });
    },
    [applyDerivedOpeningUnitCost],
  );

  const applyGlobalMatch = useCallback(
    (match: GlobalProductRecord) => {
      const matchedTypeId = matchItemTypeFromHint(
        catalog.itemTypes,
        match.itemTypeKeyHint,
      );
      const matchedCategoryId = matchCategoryIdByName(
        catalog.sortedCategories,
        match.categoryName,
      );
      m.setParentDraft((prev) => {
        const next: ParentDraft = {
          ...prev,
          productStructure: "standalone",
          isSellable: match.sellable,
          isStocked: match.stocked,
          isWeighed: match.weighed,
          name: match.name,
          barcode: match.barcode?.trim() || prev.barcode,
          sku: match.skuTemplate?.trim() || prev.sku,
          brand: match.brand?.trim() || prev.brand,
          size: match.size?.trim() || prev.size,
          description: match.description?.trim() || prev.description,
          unitType: match.unitType?.trim() || prev.unitType,
          itemTypeId: matchedTypeId || prev.itemTypeId,
          categoryId: matchedCategoryId || prev.categoryId,
          buyingPrice:
            match.recommendedBuyingPrice != null
              ? String(match.recommendedBuyingPrice)
              : prev.buyingPrice,
          bundlePrice:
            match.recommendedSellingPrice != null
              ? String(match.recommendedSellingPrice)
              : prev.bundlePrice,
          reorderLevel:
            match.defaultReorderLevel != null
              ? String(match.defaultReorderLevel)
              : prev.reorderLevel,
          reorderQty:
            match.defaultReorderQty != null
              ? String(match.defaultReorderQty)
              : prev.reorderQty,
          minStockLevel:
            match.defaultMinStockLevel != null
              ? String(match.defaultMinStockLevel)
              : prev.minStockLevel,
          globalProductSourceId: match.id,
        };
        return syncCostsFromBuyingPrice(next.buyingPrice, next);
      });
      setLinkedGlobalLabel(match.name);
    },
    [catalog.itemTypes, catalog.sortedCategories, m, syncCostsFromBuyingPrice],
  );

  const marginInfo = useMemo(() => {
    const buy = Number(m.parentDraft.buyingPrice);
    const sell = Number(m.parentDraft.bundlePrice);
    if (!Number.isFinite(buy) || !Number.isFinite(sell) || sell <= 0) return null;
    const profit = sell - buy;
    const margin = (profit / sell) * 100;
    return { profit, margin };
  }, [m.parentDraft.buyingPrice, m.parentDraft.bundlePrice]);

  useEffect(() => {
    if (!m.pendingCreateImage) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(m.pendingCreateImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [m.pendingCreateImage]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        m.setPendingCreateImage(file);
      }
    },
    [m],
  );

  const createCategoryName = useMemo(() => {
    const id = m.parentDraft.categoryId.trim();
    if (!id) return undefined;
    return catalog.sortedCategories.find((c) => c.id === id)?.name;
  }, [catalog.sortedCategories, m.parentDraft.categoryId]);

  const categoryOptions = useMemo(
    () => categorySelectOptions(catalog.sortedCategories),
    [catalog.sortedCategories],
  );

  const handleCreateCategory = useCallback(
    async (name: string) => {
      const created = await categoryCreate.create(name);
      m.setParentDraft((p) => ({ ...p, categoryId: created.id }));
    },
    [categoryCreate.create, m],
  );

  const currency = currencyCode.trim() || "KES";

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const creatingGroup = m.parentDraft.productStructure === "group";
      const savedType = m.parentDraft.itemTypeId;
      const savedBranch = m.parentDraft.openingBranchId;
      const savedStructure = m.parentDraft.productStructure;
      const savedStocked = m.parentDraft.isStocked;
      const savedSellable = m.parentDraft.isSellable;

      await m.onCreateParent(e, {
        keepOpen: creatingGroup ? false : keepOpen,
      });

      if (creatingGroup || !keepOpen) return;

      m.setParentDraft({
        ...m.parentDraft,
        name: "",
        sku: "",
        barcode: "",
        pluCode: "",
        brand: "",
        size: "",
        description: "",
        unitType: "",
        buyingPrice: "",
        bundleQty: "",
        bundlePrice: "",
        bundleName: "",
        minStockLevel: "",
        reorderLevel: "",
        reorderQty: "",
        supplierId: "",
        supplierSku: "",
        defaultCostPrice: "",
        openingQty: "",
        openingUnitCost: "",
        globalProductSourceId: null,
        productStructure: savedStructure,
        itemTypeId: savedType,
        openingBranchId: savedBranch,
        isStocked: savedStocked,
        isSellable: savedSellable,
        isWeighed: false,
        setPrimarySupplier: true,
      });
      m.setPendingCreateImage(null);
      setLinkedGlobalLabel(null);
    },
    [keepOpen, m],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        side="center"
        data-onboarding-target={ONBOARDING_TARGETS.productsDrawer}
        style={PRODUCTS_CATALOG_VARS}
        className="max-h-[min(92dvh,48rem)] w-[calc(100vw-1.25rem)] max-w-[34rem] gap-0 overflow-hidden p-0 shadow-[0_24px_80px_-28px_rgba(21,35,31,0.45)]"
      >
        <form
          id="create-parent-form"
          className="flex max-h-[min(92dvh,46rem)] min-h-0 flex-col overflow-hidden"
          onSubmit={handleSubmit}
        >
          <header className="shrink-0 border-b border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_8%,transparent)] px-5 pb-3 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 pr-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <DialogTitle className="font-heading text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--catalog-ink,#15231f)]">
                    {isGroup ? "New family" : "Add a product"}
                  </DialogTitle>
                  <FamilyModeSwitch
                    checked={isGroup}
                    disabled={m.parentCreateBusy}
                    onCheckedChange={setFamilyMode}
                  />
                </div>
                <DialogDescription className="mt-1.5 text-[13px] leading-snug text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_58%,transparent)]">
                  {isGroup
                    ? "One name, then add sizes or packs after you save."
                    : "Name, buying price, selling price, barcode, how many you have, and a photo."}
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={m.parentCreateBusy}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_55%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_80%,white)] hover:text-[var(--catalog-ink,#15231f)]"
                aria-label="Close"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {banner ? <div className="mb-3">{banner}</div> : null}

            {catalog.itemTypes.length === 0 ? (
              <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
                Add a department first (Your shop → Departments), then come back
                here.
              </div>
            ) : null}

            {m.parentDraft.globalProductSourceId ? (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_65%,white)] px-3 py-2 text-[12px] text-[var(--catalog-ink,#15231f)]">
                <span className="min-w-0 flex-1">
                  Filled from shared catalog
                  {linkedGlobalLabel ? ` (${linkedGlobalLabel})` : ""}
                </span>
                <button
                  type="button"
                  className="shrink-0 font-medium underline-offset-2 hover:underline"
                  onClick={() => {
                    m.setParentDraft((p) => ({
                      ...p,
                      globalProductSourceId: null,
                    }));
                    setLinkedGlobalLabel(null);
                  }}
                >
                  Unlink
                </button>
              </div>
            ) : null}

            <div className="space-y-4">
              {!isGroup ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className={cn(
                    "relative flex h-[8.5rem] w-full overflow-hidden rounded-2xl border border-dashed",
                    previewUrl
                      ? "border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_14%,transparent)]"
                      : "border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_18%,transparent)] bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_70%,white)]",
                  )}
                >
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt=""
                      width={544}
                      height={136}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex h-full w-full flex-col items-center justify-center hover:bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_40%,white)]"
                      aria-label="Add a photo"
                    >
                      <ImagePlus
                        className="size-6 text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_42%,transparent)]"
                        aria-hidden
                      />
                      <span className="mt-1.5 text-[13px] font-medium text-[var(--catalog-ink,#15231f)]">
                        Add a photo
                      </span>
                      <span className="mt-0.5 text-[11px] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)]">
                        Optional. Drop one here or click to choose.
                      </span>
                    </button>
                  )}
                  {previewUrl ? (
                    <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-1 bg-[color-mix(in_srgb,var(--catalog-ink,#15231f)_62%,transparent)] py-1">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="px-2 py-0.5 text-[11px] font-medium text-white"
                      >
                        Change
                      </button>
                      <span className="text-white/50" aria-hidden>
                        ·
                      </span>
                      <button
                        type="button"
                        onClick={() => m.setPendingCreateImage(null)}
                        className="px-2 py-0.5 text-[11px] font-medium text-white"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file) m.setPendingCreateImage(file);
                }}
              />

              <div className="space-y-1.5">
                <FieldLabel htmlFor="create-product-name">
                  {isGroup ? "Family name" : "Product name"}
                </FieldLabel>
                <input
                  id="create-product-name"
                  className={fieldClass}
                  placeholder={isGroup ? "e.g. Fresh milk" : "e.g. Brookside 500ml"}
                  value={m.parentDraft.name}
                  onChange={(e) =>
                    m.setParentDraft((p) => ({ ...p, name: e.target.value }))
                  }
                  required
                  autoFocus
                />
              </div>

              {!isGroup && !m.parentDraft.globalProductSourceId ? (
                <ProductNameSuggestions
                  name={m.parentDraft.name}
                  barcode={m.parentDraft.barcode}
                  canGlobalCatalog={canGlobalCatalog}
                  onOpenExisting={(itemId) => {
                    onOpenExistingProduct?.(itemId);
                    onClose();
                  }}
                  onUseGlobal={applyGlobalMatch}
                />
              ) : null}

              {!isGroup ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="create-buying-price" hint={currency}>
                        Buying price
                      </FieldLabel>
                      <input
                        id="create-buying-price"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        className={cn(fieldClass, "tabular-nums")}
                        placeholder="0"
                        value={m.parentDraft.buyingPrice}
                        onChange={(e) =>
                          m.setParentDraft((p) =>
                            syncCostsFromBuyingPrice(e.target.value, p),
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="create-selling-price" hint={currency}>
                        Selling price
                      </FieldLabel>
                      <input
                        id="create-selling-price"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        className={cn(fieldClass, "tabular-nums")}
                        placeholder="0"
                        value={m.parentDraft.bundlePrice}
                        onChange={(e) =>
                          m.setParentDraft((p) => ({
                            ...p,
                            bundlePrice: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                  </div>
                  {marginInfo ? (
                    <p
                      className="text-[12px] tabular-nums text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_52%,transparent)]"
                      aria-live="polite"
                    >
                      {marginInfo.margin.toFixed(0)}% margin
                      {marginInfo.profit >= 0
                        ? ` · ${formatAmount(marginInfo.profit)} ${currency} profit`
                        : ` · selling below cost`}
                    </p>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="create-barcode" hint="Optional">
                        Barcode
                      </FieldLabel>
                      <div className="flex overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)] bg-white">
                        <input
                          id="create-barcode"
                          className="h-11 min-w-0 flex-1 border-0 bg-transparent px-3 font-mono text-[13px] text-[var(--catalog-ink,#15231f)] outline-none placeholder:text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_38%,transparent)]"
                          placeholder="Type or scan"
                          value={m.parentDraft.barcode}
                          onChange={(e) =>
                            m.setParentDraft((p) => ({
                              ...p,
                              barcode: e.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setScannerOpen(true)}
                          className="flex w-11 shrink-0 items-center justify-center border-l border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_10%,transparent)] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_55%,transparent)] hover:text-[var(--catalog-ink,#15231f)]"
                          aria-label="Scan barcode with camera"
                        >
                          <ScanBarcode className="size-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="create-opening-qty" hint="On the shelf">
                        Number of items
                      </FieldLabel>
                      <QtyStepper
                        id="create-opening-qty"
                        value={m.parentDraft.openingQty}
                        onChange={(openingQty) =>
                          m.setParentDraft((p) => ({ ...p, openingQty }))
                        }
                      />
                    </div>
                  </div>
                </>
              ) : null}

              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className="flex w-full items-center gap-2 py-1 text-left text-[13px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_58%,transparent)] hover:text-[var(--catalog-ink,#15231f)]"
                aria-expanded={moreOpen}
              >
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    moreOpen ? "rotate-0" : "-rotate-90",
                  )}
                  aria-hidden
                />
                More details
              </button>

              {moreOpen ? (
                <div className="space-y-3 rounded-2xl border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_45%,white)] p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <span className={labelClass}>Department</span>
                      <select
                        className={cn(productFormInputClass, "h-10 rounded-lg")}
                        value={m.parentDraft.itemTypeId}
                        onChange={(e) =>
                          m.setParentDraft((p) => ({
                            ...p,
                            itemTypeId: e.target.value,
                          }))
                        }
                        required
                      >
                        {catalog.itemTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={labelClass}>Category</span>
                        {canCreateCategory ? (
                          <button
                            type="button"
                            disabled={m.parentCreateBusy || categoryCreate.busy}
                            onClick={() => {
                              setMoreOpen(true);
                              categorySelectRef.current?.openForCreate();
                            }}
                            aria-label="New category"
                            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)] transition-colors hover:text-[var(--catalog-ink,#15231f)] disabled:opacity-50"
                          >
                            <Plus className="size-3" aria-hidden />
                            New
                          </button>
                        ) : null}
                      </div>
                      <SearchableSelect
                        ref={categorySelectRef}
                        className={cn(productFormInputClass, "h-10 rounded-lg")}
                        value={m.parentDraft.categoryId}
                        onChange={(categoryId) =>
                          m.setParentDraft((p) => ({ ...p, categoryId }))
                        }
                        options={categoryOptions}
                        noneLabel={isGroup ? "Pick one" : "None"}
                        placeholder={
                          canCreateCategory ? "Find or create…" : "Type to find…"
                        }
                        required={isGroup}
                        disabled={m.parentCreateBusy}
                        aria-label="Category"
                        onCreate={
                          canCreateCategory ? handleCreateCategory : undefined
                        }
                        createBusy={categoryCreate.busy}
                        createError={categoryCreate.error}
                      />
                    </div>
                  </div>

                  {!isGroup && showButcherTemplates ? (
                    <div className="flex flex-wrap gap-1.5">
                      {BUTCHER_PRODUCT_TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          className="rounded-lg border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)] bg-white px-2 py-1 text-[11px] font-medium text-[var(--catalog-ink,#15231f)] hover:border-[var(--catalog-ink,#15231f)]"
                          onClick={() => {
                            const itemTypeId =
                              matchItemTypeIdForTemplate(
                                catalog.itemTypes,
                                template.itemTypeKeyword,
                              ) ?? m.parentDraft.itemTypeId;
                            m.setParentDraft((p) => ({
                              ...p,
                              name: p.name.trim() || template.label,
                              itemTypeId,
                              isWeighed: template.isWeighed,
                              unitType: template.unitType,
                            }));
                          }}
                        >
                          {template.label}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {!isGroup ? (
                    <>
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={labelClass}>SKU</span>
                          <span className={productFormHintClass}>Auto if empty</span>
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            className={cn(
                              productFormInputClass,
                              "h-10 min-w-0 flex-1 rounded-lg font-mono text-xs",
                            )}
                            placeholder="Auto"
                            value={m.parentDraft.sku}
                            onChange={(e) =>
                              m.setParentDraft((p) => ({
                                ...p,
                                sku: e.target.value,
                              }))
                            }
                          />
                          {m.nextAutoSkuHint && !m.parentDraft.sku ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10 shrink-0 rounded-lg px-2 font-mono text-[10px]"
                              onClick={() =>
                                m.setParentDraft((p) => ({
                                  ...p,
                                  sku: m.nextAutoSkuHint!,
                                }))
                              }
                            >
                              {m.nextAutoSkuHint}
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {branches.length > 1 ? (
                        <div className="space-y-1.5">
                          <span className={labelClass}>Stock at branch</span>
                          <select
                            className={cn(productFormInputClass, "h-10 rounded-lg")}
                            value={m.parentDraft.openingBranchId}
                            onChange={(e) =>
                              m.setParentDraft((p) => ({
                                ...p,
                                openingBranchId: e.target.value,
                              }))
                            }
                          >
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      <PackageVariantsSection
                        compact
                        showEnableToggle
                        enabled={m.parentDraft.sellAsPackages}
                        onEnabledChange={(sellAsPackages) =>
                          m.setParentDraft((p) => ({ ...p, sellAsPackages }))
                        }
                        rows={m.parentDraft.packageRows}
                        onRowsChange={(packageRows) =>
                          m.setParentDraft((p) => ({ ...p, packageRows }))
                        }
                        baseUnitHint={m.parentDraft.name.trim() || "piece"}
                        currencyCode={currencyCode}
                        className="border-0 bg-transparent p-0 shadow-none ring-0"
                      />

                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="space-y-1">
                          <span className={productFormLabelClass}>Brand</span>
                          <input
                            className={cn(productFormInputClass, "h-10 rounded-lg")}
                            value={m.parentDraft.brand}
                            onChange={(e) =>
                              m.setParentDraft((p) => ({
                                ...p,
                                brand: e.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="space-y-1">
                          <span className={productFormLabelClass}>Size</span>
                          <input
                            className={cn(productFormInputClass, "h-10 rounded-lg")}
                            value={m.parentDraft.size}
                            onChange={(e) =>
                              m.setParentDraft((p) => ({
                                ...p,
                                size: e.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>

                      {canLinkSupplier ? (
                        <div className="space-y-2">
                          {canListSuppliers && m.suppliersForLink.length === 0 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg text-xs"
                              disabled={m.suppliersLoading}
                              onClick={() => void m.loadSuppliersForLink()}
                            >
                              {m.suppliersLoading ? "Loading…" : "Load suppliers"}
                            </Button>
                          ) : null}
                          <label className="space-y-1">
                            <span className={productFormLabelClass}>Supplier</span>
                            <select
                              className={cn(productFormInputClass, "h-10 rounded-lg")}
                              value={
                                m.suppliersForLink.some(
                                  (s) => s.id === m.parentDraft.supplierId,
                                )
                                  ? m.parentDraft.supplierId
                                  : ""
                              }
                              onChange={(e) =>
                                m.setParentDraft((p) => ({
                                  ...p,
                                  supplierId: e.target.value,
                                }))
                              }
                            >
                              <option value="">None</option>
                              {m.suppliersForLink.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  <ProductDescriptionField
                    value={m.parentDraft.description}
                    onChange={(description) =>
                      m.setParentDraft((p) => ({ ...p, description }))
                    }
                    onError={setDescGenError}
                    rows={2}
                    textareaClassName="min-h-[2.5rem] rounded-lg"
                    context={{
                      name: m.parentDraft.name,
                      categoryName: createCategoryName,
                      brand: m.parentDraft.brand,
                      size: m.parentDraft.size,
                      unitType: m.parentDraft.unitType,
                      sku: m.parentDraft.sku,
                      barcode: m.parentDraft.barcode,
                    }}
                  />
                  {descGenError ? (
                    <p className="text-xs text-destructive">{descGenError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <footer className="shrink-0 border-t border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_8%,transparent)] bg-white px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_55%,transparent)]">
                <input
                  type="checkbox"
                  checked={keepOpen}
                  onChange={(e) => setKeepOpen(e.target.checked)}
                  className="size-3.5 rounded border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_25%,transparent)]"
                />
                Keep adding
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl px-3 text-[13px]"
                  onClick={onClose}
                  disabled={m.parentCreateBusy}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={catalog.itemTypes.length === 0 || m.parentCreateBusy}
                  className="h-10 gap-1.5 rounded-xl bg-[var(--catalog-ink,#15231f)] px-4 text-[13px] text-white shadow-none hover:bg-[color-mix(in_srgb,var(--catalog-ink,#15231f)_88%,#000)]"
                >
                  {m.parentCreateBusy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Saving…
                    </>
                  ) : isGroup ? (
                    "Create family"
                  ) : (
                    "Add product"
                  )}
                </Button>
              </div>
            </div>
          </footer>
        </form>

        {scannerOpen ? (
          <BarcodeScanner
            onScan={(barcode) => {
              m.setParentDraft((p) => ({ ...p, barcode }));
              setScannerOpen(false);
            }}
            onClose={() => setScannerOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
