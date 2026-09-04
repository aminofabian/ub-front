"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  ImagePlus,
  Layers,
  Minus,
  PackagePlus,
  Plus,
  ScanBarcode,
} from "lucide-react";

import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
import type { GenerateProductDescriptionResponse } from "@/lib/catalog-description-api";
import { resolveGeneratedCatalogIds } from "@/lib/resolve-generated-catalog";

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
import { useInlineItemTypeCreate } from "../_hooks/useInlineItemTypeCreate";
import { useInlineAisleCreate } from "../_hooks/useInlineAisleCreate";
import {
  productFormHintClass,
  productFormInputClass,
  productFormLabelClass,
} from "./product-form-styles";
import styles from "./product-create-modal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  banner?: FormDrawerProps["banner"];
  catalog: Pick<
    CatalogListApi,
    | "itemTypes"
    | "sortedCategories"
    | "aisles"
    | "upsertCategory"
    | "upsertItemType"
    | "upsertAisle"
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
  const modeId = useId();
  const { business } = useDashboard();
  const showButcherTemplates = isButcheryBusiness(business);
  const fileRef = useRef<HTMLInputElement>(null);
  const categorySelectRef = useRef<SearchableSelectHandle>(null);
  const departmentSelectRef = useRef<SearchableSelectHandle>(null);
  const aisleSelectRef = useRef<SearchableSelectHandle>(null);
  const isGroup = m.parentDraft.productStructure === "group";
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [photoOver, setPhotoOver] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [stamp, setStamp] = useState(0);
  const prevArmed = useRef(false);
  const [descGenError, setDescGenError] = useState("");
  const [linkedGlobalLabel, setLinkedGlobalLabel] = useState<string | null>(null);
  const categoryCreate = useInlineCategoryCreate(catalog.upsertCategory);
  const departmentCreate = useInlineItemTypeCreate(catalog.upsertItemType);
  const aisleCreate = useInlineAisleCreate(catalog.upsertAisle);

  useEffect(() => {
    if (!open) return;
    setKeepOpen(false);
    setScannerOpen(false);
    setMoreOpen(false);
    setPhotoOver(false);
    setJustAdded(false);
    setStamp(0);
    prevArmed.current = false;
    setDescGenError("");
    setLinkedGlobalLabel(null);
    categoryCreate.clearError();
    departmentCreate.clearError();
    aisleCreate.clearError();
  }, [open, aisleCreate.clearError, categoryCreate.clearError, departmentCreate.clearError]);

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
      setPhotoOver(false);
    },
    [m],
  );

  const createCategoryName = useMemo(() => {
    const id = m.parentDraft.categoryId.trim();
    if (!id) return undefined;
    return catalog.sortedCategories.find((c) => c.id === id)?.name;
  }, [catalog.sortedCategories, m.parentDraft.categoryId]);

  const createDepartmentName = useMemo(() => {
    const id = m.parentDraft.itemTypeId.trim();
    if (!id) return undefined;
    return catalog.itemTypes.find((t) => t.id === id)?.label;
  }, [catalog.itemTypes, m.parentDraft.itemTypeId]);

  const categoryOptions = useMemo(
    () => categorySelectOptions(catalog.sortedCategories),
    [catalog.sortedCategories],
  );

  const departmentOptions = useMemo(
    () =>
      catalog.itemTypes.map((t) => ({
        value: t.id,
        label: t.label,
      })),
    [catalog.itemTypes],
  );

  const aisleOptions = useMemo(
    () =>
      catalog.aisles
        .filter((a) => a.active)
        .map((a) => ({
          value: a.id,
          label: `${a.name} (${a.code})`,
        })),
    [catalog.aisles],
  );

  const handleCreateCategory = useCallback(
    async (name: string) => {
      const created = await categoryCreate.create(name);
      m.setParentDraft((p) => ({ ...p, categoryId: created.id }));
    },
    [categoryCreate.create, m],
  );

  const handleCreateDepartment = useCallback(
    async (name: string) => {
      const created = await departmentCreate.create(name);
      m.setParentDraft((p) => ({ ...p, itemTypeId: created.id }));
    },
    [departmentCreate.create, m],
  );

  const handleCreateAisle = useCallback(
    async (name: string) => {
      const created = await aisleCreate.create(name);
      m.setParentDraft((p) => ({ ...p, aisleId: created.id }));
    },
    [aisleCreate.create, m],
  );

  const handleGenerated = useCallback(
    async (result: GenerateProductDescriptionResponse) => {
      setMoreOpen(true);
      const ids = await resolveGeneratedCatalogIds(result, {
        canCreateCategory,
        canCreateDepartment: canCreateCategory,
        createCategory: categoryCreate.create,
        createDepartment: departmentCreate.create,
      });
      if (!ids.categoryId && !ids.itemTypeId) return;
      m.setParentDraft((p) => ({
        ...p,
        ...(ids.categoryId ? { categoryId: ids.categoryId } : {}),
        ...(ids.itemTypeId ? { itemTypeId: ids.itemTypeId } : {}),
      }));
    },
    [
      canCreateCategory,
      categoryCreate.create,
      departmentCreate.create,
      m,
    ],
  );

  const currency = currencyCode.trim() || "KES";

  const canArm =
    catalog.itemTypes.length > 0 &&
    m.parentDraft.name.trim().length > 0 &&
    (isGroup ||
      (Number.isFinite(Number(m.parentDraft.bundlePrice)) &&
        Number(m.parentDraft.bundlePrice) > 0));

  useEffect(() => {
    if (canArm && !prevArmed.current) setStamp((s) => s + 1);
    prevArmed.current = canArm;
  }, [canArm]);

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
      setJustAdded(true);
      window.setTimeout(() => {
        document.getElementById("create-product-name")?.focus();
      }, 0);
      window.setTimeout(() => setJustAdded(false), 560);
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
        side="right"
        data-onboarding-target={ONBOARDING_TARGETS.productsDrawer}
        style={PRODUCTS_CATALOG_VARS}
        overlayClassName="bg-black/40 supports-[backdrop-filter]:backdrop-blur-[2px]"
        className={cn(
          styles.root,
          "gap-0 overflow-hidden p-0 sm:rounded-l-2xl",
          "w-[min(100%,60rem)] max-w-[60rem]",
        )}
      >
        <form
          id="create-parent-form"
          className="flex h-full min-h-0 flex-col overflow-hidden"
          onSubmit={handleSubmit}
        >
          <header className={styles.header}>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="flex items-center gap-2 text-lg text-[var(--catalog-ink,#15231f)]">
                <span className={styles.iconMark}>
                  <PackagePlus className="size-3.5" aria-hidden />
                </span>
                Add product
              </DialogTitle>
              <DialogDescription className="text-[13px] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_58%,transparent)]">
                {isGroup
                  ? "Name the family, then add each size or pack after this."
                  : justAdded
                    ? "Added. Name the next one."
                    : "Name and selling price are enough to sell. Photo and barcode can wait."}
              </DialogDescription>
            </DialogHeader>

            <div
              className={styles.modeTrack}
              data-mode={isGroup ? "group" : "single"}
              role="tablist"
              aria-label="Product shape"
            >
              <div className={styles.modeThumb} aria-hidden />
              <button
                type="button"
                role="tab"
                id={`${modeId}-single`}
                aria-selected={!isGroup}
                disabled={m.parentCreateBusy}
                className={styles.modeBtn}
                onClick={() => setFamilyMode(false)}
              >
                <PackagePlus className="size-3.5" aria-hidden />
                Single item
              </button>
              <button
                type="button"
                role="tab"
                id={`${modeId}-group`}
                aria-selected={isGroup}
                disabled={m.parentCreateBusy}
                className={styles.modeBtn}
                onClick={() => setFamilyMode(true)}
              >
                <Layers className="size-3.5" aria-hidden />
                Family + options
              </button>
            </div>
          </header>

          <div className={styles.body}>
            {banner ? <div className="mb-1">{banner}</div> : null}

            {catalog.itemTypes.length === 0 ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
                {canCreateCategory
                  ? "Add a department below, or generate with AI under More details."
                  : "Add a department first (Your shop → Departments), then come back here."}
              </div>
            ) : null}

            {m.parentDraft.globalProductSourceId ? (
              <div className="flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_65%,white)] px-3 py-2 text-[12px] text-[var(--catalog-ink,#15231f)]">
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

            <div className={cn("space-y-4", justAdded && styles.fresh)}>
              <div className={cn(!isGroup && styles.identity)}>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="create-product-name">
                    {isGroup ? "Family name" : "Name"}
                  </FieldLabel>
                  <input
                    id="create-product-name"
                    className={fieldClass}
                    placeholder={
                      isGroup
                        ? "e.g. Fresh milk, Phone cases"
                        : "e.g. Brookside 500ml"
                    }
                    value={m.parentDraft.name}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({ ...p, name: e.target.value }))
                    }
                    required
                    autoFocus
                  />
                </div>
                {!isGroup ? (
                  <div className="space-y-1.5">
                    <span className={labelClass}>Photo</span>
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setPhotoOver(true);
                      }}
                      onDragLeave={() => setPhotoOver(false)}
                      className={styles.photo}
                      data-filled={previewUrl ? "" : undefined}
                      data-over={photoOver ? "" : undefined}
                    >
                      {previewUrl ? (
                        <Image
                          src={previewUrl}
                          alt=""
                          width={76}
                          height={76}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className={styles.photoBtn}
                          aria-label="Add a photo"
                        >
                          <ImagePlus className="size-5" aria-hidden />
                          <span>Add</span>
                        </button>
                      )}
                      {previewUrl ? (
                        <div className={styles.photoBar}>
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => m.setPendingCreateImage(null)}
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

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
                <div className="flex items-baseline justify-between gap-2">
                  <span className={labelClass}>Department</span>
                  {canCreateCategory ? (
                    <button
                      type="button"
                      disabled={m.parentCreateBusy || departmentCreate.busy}
                      onClick={() => departmentSelectRef.current?.openForCreate()}
                      aria-label="New department"
                      className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)] transition-colors hover:text-[var(--catalog-ink,#15231f)] disabled:opacity-50"
                    >
                      <Plus className="size-3" aria-hidden />
                      New
                    </button>
                  ) : null}
                </div>
                <SearchableSelect
                  ref={departmentSelectRef}
                  className={cn(productFormInputClass, "h-11 rounded-xl")}
                  value={m.parentDraft.itemTypeId}
                  onChange={(itemTypeId) =>
                    m.setParentDraft((p) => ({ ...p, itemTypeId }))
                  }
                  options={departmentOptions}
                  placeholder={
                    canCreateCategory ? "Find or create…" : "Pick one"
                  }
                  required
                  disabled={m.parentCreateBusy}
                  aria-label="Department"
                  onCreate={
                    canCreateCategory ? handleCreateDepartment : undefined
                  }
                  createBusy={departmentCreate.busy}
                  createError={departmentCreate.error}
                  createNoun="department"
                />
                {isGroup ? (
                  <span className="text-[11px] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)]">
                    Options inherit this department.
                  </span>
                ) : null}
              </div>

              {isGroup ? (
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={labelClass}>Category</span>
                    {canCreateCategory ? (
                      <button
                        type="button"
                        disabled={m.parentCreateBusy || categoryCreate.busy}
                        onClick={() => categorySelectRef.current?.openForCreate()}
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
                    className={cn(productFormInputClass, "h-11 rounded-xl")}
                    value={m.parentDraft.categoryId}
                    onChange={(categoryId) =>
                      m.setParentDraft((p) => ({ ...p, categoryId }))
                    }
                    options={categoryOptions}
                    noneLabel="Pick one"
                    placeholder={
                      canCreateCategory ? "Find or create…" : "Type to find…"
                    }
                    required
                    disabled={m.parentCreateBusy}
                    aria-label="Category"
                    onCreate={
                      canCreateCategory ? handleCreateCategory : undefined
                    }
                    createBusy={categoryCreate.busy}
                    createError={categoryCreate.error}
                  />
                </div>
              ) : null}

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
                      <FieldLabel htmlFor="create-selling-price">
                        Selling price
                      </FieldLabel>
                      <div className={styles.priceWrap}>
                        <input
                          id="create-selling-price"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          className={cn(
                            fieldClass,
                            styles.priceInput,
                            styles.priceSell,
                            "tabular-nums",
                          )}
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
                        <span className={styles.priceCur}>{currency}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="create-buying-price">
                        Buying price
                      </FieldLabel>
                      <div className={styles.priceWrap}>
                        <input
                          id="create-buying-price"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          className={cn(
                            fieldClass,
                            styles.priceInput,
                            "tabular-nums",
                          )}
                          placeholder="0"
                          value={m.parentDraft.buyingPrice}
                          onChange={(e) =>
                            m.setParentDraft((p) =>
                              syncCostsFromBuyingPrice(e.target.value, p),
                            )
                          }
                        />
                        <span className={styles.priceCur}>{currency}</span>
                      </div>
                    </div>
                  </div>
                  <p
                    className={styles.margin}
                    data-show={marginInfo ? "" : undefined}
                    aria-live="polite"
                  >
                    {marginInfo
                      ? `${marginInfo.margin.toFixed(0)}% margin${
                          marginInfo.profit >= 0
                            ? ` · ${formatAmount(marginInfo.profit)} ${currency} profit`
                            : " · selling below cost"
                        }`
                      : "\u00a0"}
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  </div>
                </>
              ) : (
                <p className={cn(styles.hintCard, styles.enter)}>
                  After you create the family, you&apos;ll add each size, pack,
                  or flavour as its own option — same flow as on the till.
                </p>
              )}

              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className={styles.moreToggle}
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
                <div className={cn(styles.morePanel, "space-y-3 rounded-2xl border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_45%,white)] p-3")}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {!isGroup ? (
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
                          noneLabel="None"
                          placeholder={
                            canCreateCategory ? "Find or create…" : "Type to find…"
                          }
                          disabled={m.parentCreateBusy}
                          aria-label="Category"
                          onCreate={
                            canCreateCategory ? handleCreateCategory : undefined
                          }
                          createBusy={categoryCreate.busy}
                          createError={categoryCreate.error}
                        />
                      </div>
                    ) : null}
                    <div className={cn("space-y-1.5", !isGroup && "sm:col-span-1", isGroup && "sm:col-span-2")}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={labelClass}>Shelf zone</span>
                        {canCreateCategory ? (
                          <button
                            type="button"
                            disabled={m.parentCreateBusy || aisleCreate.busy}
                            onClick={() => {
                              setMoreOpen(true);
                              aisleSelectRef.current?.openForCreate();
                            }}
                            aria-label="New shelf zone"
                            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)] transition-colors hover:text-[var(--catalog-ink,#15231f)] disabled:opacity-50"
                          >
                            <Plus className="size-3" aria-hidden />
                            New
                          </button>
                        ) : null}
                      </div>
                      <SearchableSelect
                        ref={aisleSelectRef}
                        className={cn(productFormInputClass, "h-10 rounded-lg")}
                        value={m.parentDraft.aisleId}
                        onChange={(aisleId) =>
                          m.setParentDraft((p) => ({ ...p, aisleId }))
                        }
                        options={aisleOptions}
                        noneLabel="None"
                        placeholder={
                          canCreateCategory ? "Find or create…" : "Type to find…"
                        }
                        disabled={m.parentCreateBusy}
                        aria-label="Shelf zone"
                        onCreate={
                          canCreateCategory ? handleCreateAisle : undefined
                        }
                        createBusy={aisleCreate.busy}
                        createError={aisleCreate.error}
                        createNoun="shelf zone"
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
                    onGenerated={handleGenerated}
                    rows={2}
                    textareaClassName="min-h-[2.5rem] rounded-lg"
                    context={{
                      name: m.parentDraft.name,
                      categoryName: createCategoryName,
                      itemTypeName: createDepartmentName,
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

          <DialogFooter className="shrink-0 gap-2 border-t border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_8%,transparent)] bg-white px-4 py-3 sm:justify-between">
            <button
              type="button"
              role="switch"
              aria-checked={keepOpen}
              aria-label="Keep adding after save"
              disabled={isGroup || m.parentCreateBusy}
              onClick={() => setKeepOpen((v) => !v)}
              className={styles.keep}
            >
              <span className={styles.keepDot} aria-hidden />
              Keep adding
            </button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-3 text-[13px]"
                onClick={onClose}
                disabled={m.parentCreateBusy}
              >
                Cancel
              </Button>
              <button
                type="submit"
                disabled={catalog.itemTypes.length === 0 || m.parentCreateBusy}
                data-armed={canArm ? "true" : "false"}
                data-busy={m.parentCreateBusy ? "true" : undefined}
                data-stamp={canArm && stamp > 0 ? stamp : undefined}
                className={styles.create}
              >
                {m.parentCreateBusy
                  ? "Saving…"
                  : isGroup
                    ? "Create family"
                    : keepOpen
                      ? "Add & next"
                      : "Add product"}
              </button>
            </div>
          </DialogFooter>
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
