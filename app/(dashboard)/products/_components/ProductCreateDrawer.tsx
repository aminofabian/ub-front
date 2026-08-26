"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  PackagePlus,
  X,
  Upload,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  Camera,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";
import {
  FormDrawer,
  type FormDrawerProps,
} from "@/components/form-drawer";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import type { CatalogListApi } from "../_hooks/useCatalogList";
import type { ProductMutationsApi } from "../_hooks/useProductMutations";
import type { BranchRecord, GlobalProductRecord, ItemTypeRecord } from "@/lib/api";
import {
  productFormHintClass,
  productFormInputClass,
  productFormLabelClass,
  productFormMetaClass,
} from "./product-form-styles";
import { StockIncreaseFields } from "./StockIncreaseFields";
import { ProductCreatePricingSection } from "./ProductCreatePricingSection";
import { PackageVariantsSection } from "./PackageVariantsSection";
import { ProductDescriptionField } from "./ProductDescriptionField";
import { ProductNameSuggestions } from "./ProductNameSuggestions";
import { SearchableSelect } from "./SearchableSelect";
import { categorySelectOptions } from "./category-select-options";
import type { ParentDraft } from "../_types";
import { toNumber } from "../_utils";
import {
  BUTCHER_PRODUCT_TEMPLATES,
  matchItemTypeIdForTemplate,
} from "@/lib/butcher-product-templates";
import { useDashboard } from "@/components/dashboard-provider";
import { isButcheryBusiness } from "@/lib/business-store-type";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Types
/* ═══════════════════════════════════════════════════════════════════════════ */

type Props = {
  open: boolean;
  onClose: () => void;
  banner?: FormDrawerProps["banner"];
  catalog: Pick<CatalogListApi, "itemTypes" | "sortedCategories">;
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
  docked?: boolean;
  dockRoot?: HTMLElement | null;
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


/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Sub-components
/* ═══════════════════════════════════════════════════════════════════════════ */

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
      className="flex w-full items-center gap-2 px-1 py-2 text-left text-foreground/60 transition-colors hover:text-foreground"
    >
      {expanded ? (
        <ChevronDown className="size-3.5 shrink-0 text-foreground/40" aria-hidden />
      ) : (
        <ChevronRight className="size-3.5 shrink-0 text-foreground/40" aria-hidden />
      )}
      <span className="min-w-0 flex-1 text-[13px] font-medium tracking-tight">
        {label}
      </span>
      {badge}
    </button>
  );
}

function Label({
  label,
  children,
  className,
  required: _required,
  hint,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="flex min-w-0 items-baseline justify-between gap-2">
        <span className={productFormLabelClass}>{label}</span>
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

function icClass(disabled?: boolean) {
  return cn(
    productFormInputClass,
    disabled && "bg-muted/50 text-muted-foreground cursor-not-allowed",
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  min,
  step,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: string;
  step?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={cn(icClass(disabled), "w-full", className)}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      min={min}
      step={step}
    />
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
      <span className={cn(productFormLabelClass, "w-12 shrink-0")}>{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function ToggleChip({
  checked,
  onChange,
  label,
  icon: Icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon?: React.ElementType;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-none border px-2 py-0.5 text-[11px] font-medium tracking-tight transition",
        checked
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground/55 hover:border-foreground/40 hover:text-foreground",
      )}
    >
      {Icon && <Icon className="size-3" />}
      <span
        className={cn(
          "flex size-3 items-center justify-center border transition",
          checked
            ? "border-background/40 bg-transparent text-background"
            : "border-muted-foreground/45 bg-background",
        )}
        aria-hidden
      >
        {checked ? (
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
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

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Main component
/* ═══════════════════════════════════════════════════════════════════════════ */

export function ProductCreateDrawer({
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
  onOpenExistingProduct,
  docked = false,
  dockRoot = null,
}: Props) {
  const { business } = useDashboard();
  const showButcherTemplates = isButcheryBusiness(business);
  const fileRef = useRef<HTMLInputElement>(null);
  const isGroup = m.parentDraft.productStructure === "group";
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [codesOpen, setCodesOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [packsOpen, setPacksOpen] = useState(false);
  const [descGenError, setDescGenError] = useState("");
  const [linkedGlobalLabel, setLinkedGlobalLabel] = useState<string | null>(null);

  /* ── Reset when drawer opens ── */
  useEffect(() => {
    if (open) {
      setMoreExpanded(false);
      setCodesOpen(false);
      setStockOpen(false);
      setPacksOpen(false);
      setKeepOpen(false);
      setScannerOpen(false);
      setDescGenError("");
      setLinkedGlobalLabel(null);
    }
  }, [open]);

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
      const next = { ...prev, buyingPrice };
      return applyDerivedOpeningUnitCost(next);
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

  const unlinkSharedCatalog = useCallback(() => {
    m.setParentDraft((prev) => ({ ...prev, globalProductSourceId: null }));
    setLinkedGlobalLabel(null);
  }, [m]);

  const marginInfo = useMemo(() => {
    const buy = Number(m.parentDraft.buyingPrice);
    const sell = Number(m.parentDraft.bundlePrice);
    if (!Number.isFinite(buy) || !Number.isFinite(sell) || sell <= 0) return null;
    const profit = sell - buy;
    const margin = (profit / sell) * 100;
    return { profit, margin, valid: true as const };
  }, [m.parentDraft.buyingPrice, m.parentDraft.bundlePrice]);

  /* ── Image preview ── */
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const toggleMore = () => setMoreExpanded((v) => !v);

  const hasSupplierData = Boolean(
    m.parentDraft.supplierId || m.parentDraft.supplierSku || m.parentDraft.defaultCostPrice,
  );
  const hasDetailData = Boolean(
    m.parentDraft.description ||
      m.parentDraft.unitType ||
      m.parentDraft.brand ||
      m.parentDraft.size,
  );
  const hasMoreData = Boolean(
    hasSupplierData ||
      hasDetailData ||
      m.parentDraft.minStockLevel ||
      m.parentDraft.reorderLevel ||
      m.parentDraft.reorderQty,
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

  /* ── Submit wrapper that optionally keeps drawer open ── */
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const creatingGroup = m.parentDraft.productStructure === "group";
      /* Keep the drawer open: call the original handler with keepOpen flag,
         then clear only the user-entered fields after success. */
      const savedType = m.parentDraft.itemTypeId;
      const savedBranch = m.parentDraft.openingBranchId;
      const savedStructure = m.parentDraft.productStructure;
      const savedStocked = m.parentDraft.isStocked;
      const savedSellable = m.parentDraft.isSellable;

      await m.onCreateParent(e, {
        /* Groups hand off to the variant drawer — never keep create open. */
        keepOpen: creatingGroup ? false : keepOpen,
      });

      if (creatingGroup || !keepOpen) return;

      /* Reset draft but preserve structural defaults for rapid entry */
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
        /* preserved: */
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
    <FormDrawer
      open={open}
      onboardingTarget={ONBOARDING_TARGETS.productsDrawer}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      banner={banner}
      title={isGroup ? "New family" : "Add product"}
      width={docked ? "default" : "wide"}
      docked={docked}
      dockRoot={dockRoot}
      appearance="sharp"
      headerDensity="compact"
      icon={<PackagePlus className="size-3.5 text-primary" aria-hidden />}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className={cn("inline-flex cursor-pointer items-center gap-1.5", productFormMetaClass)}>
            <input
              type="checkbox"
              checked={keepOpen}
              onChange={(e) => setKeepOpen(e.target.checked)}
              className="size-3.5 rounded-none border-border text-primary"
            />
            Keep adding
          </label>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={onClose}
              disabled={m.parentCreateBusy}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-parent-form"
              size="sm"
              disabled={catalog.itemTypes.length === 0 || m.parentCreateBusy}
              className="h-8 gap-1.5 px-2.5 text-xs"
            >
              {m.parentCreateBusy ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : isGroup ? (
                "Create family"
              ) : (
                <>
                  <Plus className="size-3.5" />
                  Create
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <form id="create-parent-form" className="space-y-5" onSubmit={handleSubmit}>
        {m.parentDraft.globalProductSourceId ? (
          <div className="flex flex-wrap items-center gap-2 rounded-none border border-border bg-muted/20 px-2.5 py-1.5 text-[11px] text-foreground">
            <Globe2 className="size-3 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
              Linked to shared catalog
              {linkedGlobalLabel ? ` · ${linkedGlobalLabel}` : ""}
            </span>
            <button
              type="button"
              onClick={unlinkSharedCatalog}
              className="shrink-0 rounded-md font-medium underline-offset-2 hover:underline"
            >
              Unlink
            </button>
          </div>
        ) : null}

        {catalog.itemTypes.length === 0 && (
          <div className="rounded-none border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
            Add departments first (Your shop → Departments).
          </div>
        )}

        <div className="space-y-4 px-0.5">
          <Label label={isGroup ? "Family name" : "Product name"}>
            <div className="flex items-start gap-2">
              {!isGroup ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className={cn(
                    "relative flex size-12 shrink-0 items-center justify-center overflow-hidden border bg-muted/20 transition hover:border-foreground/30",
                    previewUrl ? "border-border" : "border-dashed border-border",
                  )}
                  aria-label="Add a photo"
                >
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Upload className="size-4 text-foreground/35" aria-hidden />
                  )}
                </button>
              ) : null}
              <input
                className={icClass()}
                placeholder={isGroup ? "e.g. Fresh milk" : "e.g. Brookside 500ml"}
                value={m.parentDraft.name}
                onChange={(e) => {
                  m.setParentDraft((p) => ({ ...p, name: e.target.value }));
                }}
                required
                autoFocus
              />
              {!isGroup && m.pendingCreateImage ? (
                <button
                  type="button"
                  onClick={() => m.setPendingCreateImage(null)}
                  className="flex size-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="Remove photo"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              ) : null}
            </div>
          </Label>
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

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (file) m.setPendingCreateImage(file);
            }}
          />

          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-foreground/75">
            <input
              type="checkbox"
              className="mt-0.5 size-3.5 rounded-none border-border"
              checked={isGroup}
              onChange={(e) => {
                const next = e.target.checked;
                if (next) {
                  m.setParentDraft((p) => ({
                    ...p,
                    productStructure: "group",
                    isSellable: false,
                    globalProductSourceId: null,
                  }));
                  setLinkedGlobalLabel(null);
                } else {
                  m.setParentDraft((p) => ({
                    ...p,
                    productStructure: "standalone",
                    isSellable: true,
                  }));
                }
              }}
            />
            <span>
              Product family
              <span className="mt-0.5 block text-[12px] text-foreground/45">
                One name, several sizes or packs
              </span>
            </span>
          </label>

          <Label label="Department">
            <select
              className={icClass()}
              value={m.parentDraft.itemTypeId}
              onChange={(e) =>
                m.setParentDraft((p) => ({ ...p, itemTypeId: e.target.value }))
              }
              required
            >
              {catalog.itemTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Label>
          <Label label="Category" hint={isGroup ? undefined : "Optional"}>
            <SearchableSelect
              className={icClass()}
              value={m.parentDraft.categoryId}
              onChange={(categoryId) =>
                m.setParentDraft((p) => ({ ...p, categoryId }))
              }
              options={categoryOptions}
              noneLabel={isGroup ? "Pick one" : "None"}
              placeholder="Type to find…"
              required={isGroup}
              aria-label="Category"
            />
          </Label>
        </div>

        {!isGroup && showButcherTemplates ? (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border bg-muted/10 px-2.5 py-1.5">
            <span className={productFormHintClass}>Quick fill</span>
            {BUTCHER_PRODUCT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/90 transition hover:border-foreground/40 hover:bg-muted/40"
                onClick={() => {
                  const itemTypeId =
                    matchItemTypeIdForTemplate(catalog.itemTypes, template.itemTypeKeyword) ??
                    m.parentDraft.itemTypeId;
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
          <div className="space-y-4 px-0.5">
            <ProductCreatePricingSection
              draft={m.parentDraft}
              setDraft={m.setParentDraft}
              syncCostsFromBuyingPrice={syncCostsFromBuyingPrice}
              currencyCode={currencyCode}
              marginInfo={marginInfo}
              isWeighed={m.parentDraft.isWeighed}
            />
            <Label label="Barcode" hint="Optional">
              <div className="flex gap-px overflow-hidden border border-border bg-border">
                <input
                  className={cn(
                    icClass(),
                    "min-w-0 flex-1 border-0 font-mono text-xs focus-visible:ring-inset",
                  )}
                  placeholder="Optional"
                  value={m.parentDraft.barcode}
                  onChange={(e) => {
                    m.setParentDraft((p) => ({ ...p, barcode: e.target.value }));
                  }}
                />
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="flex size-8 shrink-0 items-center justify-center bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  aria-label="Scan barcode with camera"
                >
                  <Camera className="size-3.5" aria-hidden />
                </button>
              </div>
            </Label>
          </div>
        ) : null}

        {!isGroup ? (
          <>
            <CompactSectionToggle
              label="SKU"
              expanded={codesOpen}
              onToggle={() => setCodesOpen((v) => !v)}
              badge={
                m.parentDraft.sku.trim() ? (
                  <span className="inline-flex size-1.5 rounded-none bg-foreground" />
                ) : undefined
              }
            />
            {codesOpen ? (
              <div className="space-y-3 border border-t-0 border-border bg-background p-3 shadow-none">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={productFormLabelClass}>SKU</span>
                    <span className={cn(productFormHintClass, "truncate")}>
                      Auto if empty
                    </span>
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      className={cn(icClass(), "min-w-0 flex-1 font-mono text-xs")}
                      placeholder="Auto"
                      value={m.parentDraft.sku}
                      onChange={(e) => m.setParentDraft((p) => ({ ...p, sku: e.target.value }))}
                    />
                    {m.nextAutoSkuHint && !m.parentDraft.sku ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 rounded-none px-2 font-mono text-[10px] tracking-tight shadow-none"
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
                {m.parentDraft.isWeighed ? (
                  <label className="flex flex-col gap-1">
                    <span className={productFormLabelClass}>Scale PLU</span>
                    <span className={productFormHintClass}>
                      5-digit code on weight labels
                    </span>
                    <input
                      className={cn(icClass(), "font-mono text-xs")}
                      placeholder="01234"
                      inputMode="numeric"
                      maxLength={5}
                      value={m.parentDraft.pluCode}
                      onChange={(e) =>
                        m.setParentDraft((p) => ({
                          ...p,
                          pluCode: e.target.value.replace(/\D/g, "").slice(0, 5),
                        }))
                      }
                    />
                  </label>
                ) : null}
              </div>
            ) : null}

            <CompactSectionToggle
              label="Opening stock"
              expanded={stockOpen}
              onToggle={() => setStockOpen((v) => !v)}
              badge={
                m.parentDraft.openingQty.trim() ? (
                  <span className="inline-flex size-1.5 rounded-none bg-foreground" />
                ) : undefined
              }
            />
            {stockOpen ? (
              <div className="space-y-3 border border-t-0 border-border bg-background p-3 shadow-none">
                <StockIncreaseFields
                  minimal
                  mode="opening"
                  hideUnitCostInput
                  branches={branches}
                  branchId={m.parentDraft.openingBranchId}
                  onBranchIdChange={(id) =>
                    m.setParentDraft((p) => ({ ...p, openingBranchId: id }))
                  }
                  quantity={m.parentDraft.openingQty}
                  onQuantityChange={(v) =>
                    m.setParentDraft((p) => ({ ...p, openingQty: v }))
                  }
                  unitCost={m.parentDraft.openingUnitCost}
                  onUnitCostChange={(v) =>
                    m.setParentDraft((p) => ({ ...p, openingUnitCost: v }))
                  }
                  className="space-y-2 border-0 bg-transparent p-0 shadow-none ring-0"
                />
                <div className="flex flex-wrap gap-1">
                  <ToggleChip
                    checked={m.parentDraft.isStocked}
                    onChange={(v) => m.setParentDraft((p) => ({ ...p, isStocked: v }))}
                    label="Track stock"
                  />
                  <ToggleChip
                    checked={m.parentDraft.isSellable}
                    onChange={(v) => m.setParentDraft((p) => ({ ...p, isSellable: v }))}
                    label="Can sell"
                  />
                  <ToggleChip
                    checked={m.parentDraft.isWeighed}
                    onChange={(v) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        isWeighed: v,
                        unitType: v ? p.unitType?.trim() || "kg" : p.unitType,
                        pluCode: v ? p.pluCode : "",
                      }))
                    }
                    label="Sell by weight"
                  />
                </div>
              </div>
            ) : null}

            <CompactSectionToggle
              label="Pack sizes"
              expanded={packsOpen}
              onToggle={() => setPacksOpen((v) => !v)}
              badge={
                m.parentDraft.sellAsPackages ? (
                  <span className="inline-flex size-1.5 rounded-none bg-foreground" />
                ) : undefined
              }
            />
            {packsOpen ? (
              <div className="border border-t-0 border-border bg-background p-3 shadow-none">
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
              </div>
            ) : null}
          </>
        ) : null}

        <CompactSectionToggle
          label="Brand, supplier & notes"
          expanded={moreExpanded}
          onToggle={toggleMore}
          badge={
            hasMoreData ? (
              <span className="inline-flex size-1.5 rounded-none bg-foreground" />
            ) : undefined
          }
        />
        {moreExpanded ? (
          <div className="space-y-3 border border-t-0 border-border bg-background p-3 shadow-none">
            {!isGroup ? (
              <Label className="gap-0.5" label="Unit">
                <input
                  className={icClass()}
                  placeholder="each, kg…"
                  value={m.parentDraft.unitType}
                  onChange={(e) =>
                    m.setParentDraft((p) => ({ ...p, unitType: e.target.value }))
                  }
                />
              </Label>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <InlineField label="Brand">
                <input
                  className={icClass()}
                  placeholder="Optional"
                  value={m.parentDraft.brand}
                  onChange={(e) => m.setParentDraft((p) => ({ ...p, brand: e.target.value }))}
                />
              </InlineField>
              <InlineField label="Size">
                <input
                  className={icClass()}
                  placeholder="Optional"
                  value={m.parentDraft.size}
                  onChange={(e) => m.setParentDraft((p) => ({ ...p, size: e.target.value }))}
                />
              </InlineField>
            </div>

            {!isGroup ? (
              <>
                {canLinkSupplier ? (
                  <div className="space-y-2">
                    {canListSuppliers && m.suppliersForLink.length === 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-none text-xs shadow-none"
                        disabled={m.suppliersLoading}
                        onClick={() => void m.loadSuppliersForLink()}
                      >
                        {m.suppliersLoading ? "Loading…" : "Load suppliers"}
                      </Button>
                    ) : null}
                    <Label className="gap-0.5" label="Supplier">
                      <select
                        className={icClass()}
                        value={
                          m.suppliersForLink.some((s) => s.id === m.parentDraft.supplierId)
                            ? m.parentDraft.supplierId
                            : ""
                        }
                        onChange={(e) =>
                          m.setParentDraft((p) => ({ ...p, supplierId: e.target.value }))
                        }
                      >
                        <option value="">— None —</option>
                        {m.suppliersForLink.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </Label>
                  </div>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-3">
                  <Label className="gap-0.5" label="Min stock">
                    <NumberInput
                      value={m.parentDraft.minStockLevel}
                      onChange={(v) => m.setParentDraft((p) => ({ ...p, minStockLevel: v }))}
                      placeholder="—"
                    />
                  </Label>
                  <Label className="gap-0.5" label="Reorder at">
                    <NumberInput
                      value={m.parentDraft.reorderLevel}
                      onChange={(v) => m.setParentDraft((p) => ({ ...p, reorderLevel: v }))}
                      placeholder="—"
                    />
                  </Label>
                  <Label className="gap-0.5" label="Reorder qty">
                    <NumberInput
                      value={m.parentDraft.reorderQty}
                      onChange={(v) => m.setParentDraft((p) => ({ ...p, reorderQty: v }))}
                      placeholder="—"
                    />
                  </Label>
                </div>
              </>
            ) : null}

            <div className={cn(!isGroup && "border-t border-border/40 pt-2")}>
              <ProductDescriptionField
                value={m.parentDraft.description}
                onChange={(description) =>
                  m.setParentDraft((p) => ({ ...p, description }))
                }
                onError={setDescGenError}
                rows={2}
                textareaClassName="min-h-[2.5rem]"
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
                <p className="mt-1 text-xs text-destructive">{descGenError}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {scannerOpen ? (
          <BarcodeScanner
            onScan={(barcode) => {
              m.setParentDraft((p) => ({ ...p, barcode }));
              setScannerOpen(false);
            }}
            onClose={() => setScannerOpen(false)}
          />
        ) : null}

        <p className="px-0.5 pt-1 text-center text-[11px] text-muted-foreground/70">
          Adding many at once? Use Import on the products page.
        </p>
      </form>
    </FormDrawer>
  );
}

