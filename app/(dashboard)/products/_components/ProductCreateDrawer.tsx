"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  PackagePlus,
  X,
  Upload,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { FormDrawer, FormDrawerFields, type FormDrawerProps } from "@/components/form-drawer";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import type { CatalogListApi } from "../_hooks/useCatalogList";
import type { ProductMutationsApi } from "../_hooks/useProductMutations";
import type { BranchRecord } from "@/lib/api";
import {
  productFormInputClass,
  productFormLabelClass,
  productFormSectionBodyCompactClass,
} from "./product-form-styles";
import { StockIncreaseFields } from "./StockIncreaseFields";
import { ProductCreatePricingSection } from "./ProductCreatePricingSection";
import { PackageVariantsSection } from "./PackageVariantsSection";
import { ProductDescriptionField } from "./ProductDescriptionField";
import type { ParentDraft } from "../_types";
import { toNumber } from "../_utils";
import {
  BUTCHER_PRODUCT_TEMPLATES,
  matchItemTypeIdForTemplate,
} from "@/lib/butcher-product-templates";
import {
  lookupGlobalCatalogProducts,
  type GlobalProductRecord,
} from "@/lib/api";
import { useDashboard } from "@/components/dashboard-provider";
import { isButcheryBusiness } from "@/lib/business-store-type";
import { APP_ROUTES } from "@/lib/config";

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
};


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
      <span className={cn(productFormLabelClass, "w-11 shrink-0 normal-case")}>{label}</span>
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
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition",
        checked
          ? "border-primary/30 bg-primary/[0.08] text-primary ring-1 ring-primary/10"
          : "border-border/60 bg-background text-muted-foreground hover:bg-muted/30",
      )}
    >
      {Icon && <Icon className="size-3" />}
      <span
        className={cn(
          "flex h-3 w-3 items-center justify-center rounded-sm border transition",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
        )}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
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
}: Props) {
  const { business } = useDashboard();
  const showButcherTemplates = isButcheryBusiness(business);
  const fileRef = useRef<HTMLInputElement>(null);
  const isGroup = m.parentDraft.productStructure === "group";
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [descGenError, setDescGenError] = useState("");
  const [globalMatch, setGlobalMatch] = useState<GlobalProductRecord | null>(null);
  const [globalLookupBusy, setGlobalLookupBusy] = useState(false);
  const lookupTimerRef = useRef<number | null>(null);

  const runGlobalLookup = useCallback(
    async (barcode?: string, q?: string) => {
      if (!canGlobalCatalog || isGroup) {
        setGlobalMatch(null);
        return;
      }
      const trimmedBarcode = barcode?.trim();
      const trimmedQ = q?.trim();
      if (!trimmedBarcode && (!trimmedQ || trimmedQ.length < 3)) {
        setGlobalMatch(null);
        return;
      }
      setGlobalLookupBusy(true);
      try {
        const results = await lookupGlobalCatalogProducts({
          barcode: trimmedBarcode || undefined,
          q: trimmedQ || undefined,
        });
        const match = results.find((row) => !row.alreadyImported) ?? null;
        setGlobalMatch(match);
      } catch {
        setGlobalMatch(null);
      } finally {
        setGlobalLookupBusy(false);
      }
    },
    [canGlobalCatalog, isGroup],
  );

  const scheduleGlobalLookup = useCallback(
    (barcode?: string, q?: string) => {
      if (lookupTimerRef.current) {
        window.clearTimeout(lookupTimerRef.current);
      }
      lookupTimerRef.current = window.setTimeout(() => {
        void runGlobalLookup(barcode, q);
      }, 400);
    },
    [runGlobalLookup],
  );

  /* ── Reset expanded state when drawer opens ── */
  useEffect(() => {
    if (open) {
      setMoreExpanded(false);
      setKeepOpen(false);
      setScannerOpen(false);
      setDescGenError("");
      setGlobalMatch(null);
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
      m.setParentDraft((prev) => {
        const next = {
          ...prev,
          name: match.name,
          barcode: match.barcode ?? prev.barcode,
          sku: match.skuTemplate ?? prev.sku,
          brand: match.brand ?? prev.brand,
          size: match.size ?? prev.size,
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
          minStockLevel:
            match.defaultMinStockLevel != null
              ? String(match.defaultMinStockLevel)
              : prev.minStockLevel,
        };
        return syncCostsFromBuyingPrice(next.buyingPrice, next);
      });
      setGlobalMatch(null);
    },
    [m, syncCostsFromBuyingPrice],
  );

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
      m.parentDraft.categoryId ||
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

  /* ── Submit wrapper that optionally keeps drawer open ── */
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      /* Keep the drawer open: call the original handler with keepOpen flag,
         then clear only the user-entered fields after success. */
      const savedType = m.parentDraft.itemTypeId;
      const savedBranch = m.parentDraft.openingBranchId;
      const savedStructure = m.parentDraft.productStructure;
      const savedStocked = m.parentDraft.isStocked;
      const savedSellable = m.parentDraft.isSellable;

      await m.onCreateParent(e, { keepOpen });

      if (!keepOpen) return;

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
      title={isGroup ? "New product group" : "New product"}
      contextLabel="Catalog"
      width="wide"
      headerDensity="compact"
      icon={<PackagePlus className="size-3.5 text-primary" aria-hidden />}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={keepOpen}
              onChange={(e) => setKeepOpen(e.target.checked)}
              className="size-3.5 rounded border-border text-primary"
            />
            Keep open
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
                "Create group"
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
      <form id="create-parent-form" className="space-y-2" onSubmit={handleSubmit}>
        {catalog.itemTypes.length === 0 && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive">
            Add departments first (Catalog → Departments).
          </div>
        )}

        {!isGroup && canGlobalCatalog && (globalMatch || globalLookupBusy) ? (
          <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
            {globalLookupBusy && !globalMatch ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Checking global catalog…
              </p>
            ) : globalMatch ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">
                  Found in catalog library
                </p>
                <p className="text-xs text-muted-foreground">
                  {globalMatch.name}
                  {globalMatch.brand ? ` · ${globalMatch.brand}` : ""}
                  {globalMatch.size ? ` · ${globalMatch.size}` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => applyGlobalMatch(globalMatch)}
                  >
                    Pre-fill from template
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    asChild
                  >
                    <Link href={APP_ROUTES.productsCatalog}>Import from catalog</Link>
                  </Button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    onClick={() => setGlobalMatch(null)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <FormDrawerFields legend="Essentials" compact>
          <div className="inline-flex rounded-md border border-border/60 p-0.5">
            <button
              type="button"
              onClick={() =>
                m.setParentDraft((p) => ({
                  ...p,
                  productStructure: "standalone",
                  isSellable: true,
                }))
              }
              className={cn(
                "rounded px-2.5 py-1 text-[11px] font-medium transition",
                !isGroup
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Single product
            </button>
            <button
              type="button"
              onClick={() =>
                m.setParentDraft((p) => ({
                  ...p,
                  productStructure: "group",
                  isSellable: false,
                }))
              }
              className={cn(
                "rounded px-2.5 py-1 text-[11px] font-medium transition",
                isGroup
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Group
            </button>
          </div>

          <div className="flex items-start gap-2">
            {!isGroup ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={cn(
                  "relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background transition hover:border-primary/40",
                  previewUrl ? "border-border/50" : "border-dashed border-border/50",
                )}
                aria-label="Upload photo"
              >
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Upload className="size-3.5 text-muted-foreground/50" aria-hidden />
                )}
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              <Label required className="gap-0.5" label={isGroup ? "Group name" : "Product name"}>
                <input
                  className={icClass()}
                  placeholder={isGroup ? "Group name" : "Product name"}
                  value={m.parentDraft.name}
                  onChange={(e) => {
                    m.setParentDraft((p) => ({ ...p, name: e.target.value }));
                    scheduleGlobalLookup(m.parentDraft.barcode, e.target.value);
                  }}
                  onBlur={() => scheduleGlobalLookup(m.parentDraft.barcode, m.parentDraft.name)}
                  required
                  autoFocus
                />
              </Label>
            </div>
            {!isGroup && m.pendingCreateImage ? (
              <button
                type="button"
                onClick={() => m.setPendingCreateImage(null)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50"
                aria-label="Remove image"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>

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

          {isGroup ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Label required className="gap-0.5" label="Department">
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
              <Label required className="gap-0.5" label="Category">
                <select
                  className={icClass()}
                  value={m.parentDraft.categoryId}
                  onChange={(e) =>
                    m.setParentDraft((p) => ({ ...p, categoryId: e.target.value }))
                  }
                  required
                >
                  <option value="">— Select category —</option>
                  {catalog.sortedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {!c.active ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </Label>
            </div>
          ) : (
            <Label required className="gap-0.5" label="Department">
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
          )}
          {isGroup ? (
            <p className="text-[10px] leading-snug text-muted-foreground">
              Variants added under this group inherit its category.
            </p>
          ) : null}
        </FormDrawerFields>

        {!isGroup && showButcherTemplates ? (
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Meat template
            </span>
            {BUTCHER_PRODUCT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-[11px] font-medium text-foreground/90 transition hover:border-primary/40 hover:bg-primary/5"
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
          <>
            <FormDrawerFields legend="Pricing" compact>
              <ProductCreatePricingSection
                draft={m.parentDraft}
                setDraft={m.setParentDraft}
                syncCostsFromBuyingPrice={syncCostsFromBuyingPrice}
                currencyCode={currencyCode}
                marginInfo={marginInfo}
                isWeighed={m.parentDraft.isWeighed}
              />
            </FormDrawerFields>

            <FormDrawerFields legend="Barcode & SKU" compact>
              <div className="grid gap-2 sm:grid-cols-2">
                <Label className="gap-0.5" label="Barcode">
                  <div className="flex gap-1.5">
                    <input
                      className={cn(icClass(), "min-w-0 flex-1 font-mono text-xs")}
                      placeholder="Scan or type"
                      value={m.parentDraft.barcode}
                      onChange={(e) => {
                        m.setParentDraft((p) => ({ ...p, barcode: e.target.value }));
                        scheduleGlobalLookup(e.target.value, m.parentDraft.name);
                      }}
                      onBlur={() =>
                        scheduleGlobalLookup(m.parentDraft.barcode, m.parentDraft.name)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-md border border-input/80 bg-background text-muted-foreground shadow-sm hover:bg-muted"
                      aria-label="Scan barcode with camera"
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
                      placeholder="Auto-generated"
                      value={m.parentDraft.sku}
                      onChange={(e) => m.setParentDraft((p) => ({ ...p, sku: e.target.value }))}
                    />
                    {m.nextAutoSkuHint && !m.parentDraft.sku ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 px-2 text-[10px]"
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
              </div>
              {m.parentDraft.isWeighed ? (
                <label className={cn("flex flex-col gap-1", productFormLabelClass)}>
                  <span className="normal-case">Scale PLU</span>
                  <span className="text-[10px] font-normal normal-case leading-snug text-muted-foreground">
                    5-digit code on variable-weight labels (e.g. 01234)
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
            </FormDrawerFields>

            <FormDrawerFields legend="Stock" compact>
              <StockIncreaseFields
                minimal
                mode="opening"
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
                unitCostLabel="Unit cost (optional)"
                unitCostHint="Defaults from buy price — exact cost from Supplies"
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
                  label="Sellable"
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
            </FormDrawerFields>

            <FormDrawerFields legend="Selling units" compact>
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
            </FormDrawerFields>
          </>
        ) : null}

        <CompactSectionToggle
          label="More options"
          expanded={moreExpanded}
          onToggle={toggleMore}
          badge={
            hasMoreData ? (
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            ) : undefined
          }
        />
        {moreExpanded ? (
          <div className={cn(productFormSectionBodyCompactClass, "space-y-3")}>
            <div className="grid gap-2 sm:grid-cols-2">
              {!isGroup ? (
                <Label className="gap-0.5" label="Category">
                  <select
                    className={icClass()}
                    value={m.parentDraft.categoryId}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({ ...p, categoryId: e.target.value }))
                    }
                  >
                    <option value="">— None —</option>
                    {catalog.sortedCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {!c.active ? " (inactive)" : ""}
                      </option>
                    ))}
                  </select>
                </Label>
              ) : null}
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
            </div>

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
                        className="h-7 text-xs"
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
              scheduleGlobalLookup(barcode, m.parentDraft.name);
              setScannerOpen(false);
            }}
            onClose={() => setScannerOpen(false)}
          />
        ) : null}
      </form>
    </FormDrawer>
  );
}

