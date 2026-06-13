"use client";

import Image from "next/image";
import { Fragment, useState } from "react";
import {
  Boxes,
  Building2,
  Camera,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Layers,
  Loader2,
  Package,
  PackagePlus,
  Pencil,
  PencilLine,
  Save,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";
import {
  itemListThumbnailUrl,
  type ItemDetailRecord,
  type ItemSummaryRecord,
  type ItemSupplierLinkRecord,
} from "@/lib/api";
import { type ProductEditDraft, type QuickEditKey } from "../_types";
import {
  coverImageUrl,
  effectiveSupplierUnitCost,
  effectiveOnHand,
  formatAmount,
  formatStockLabel,
  packageUnitsPerSaleFromRow,
  toNumber,
  usesSharedPackageStock,
} from "../_utils";
import { quickInputClass } from "../_types";
import {
  productFormFieldClass,
  productFormGrid2Class,
  productFormInputClass,
  productFormInputMonoClass,
  productFormLabelClass,
  productFormSelectClass,
} from "./product-form-styles";
import {
  detailCollapsibleTriggerClass,
  detailFieldRowClass,
  detailHeroClass,
  detailInlineEditClass,
  detailMetricCellWrapClass,
  detailMetricGridClass,
  detailPackageCardClass,
  detailPanelKind,
  detailPanelTone,
  detailQuickActionGridClass,
  detailSectionClass,
  detailSectionHeadClass,
  detailSectionLabelClass,
  detailShellClass,
  detailStatCellClass,
  detailFieldLabelClass,
  detailFieldValueClass,
  detailStickyBarClass,
  detailStatValueClass,
} from "./product-detail-styles";

type Props = {
  detail: ItemDetailRecord;
  patchDraft: ProductEditDraft;
  supplierLinks: ItemSupplierLinkRecord[];
  variantRows: ItemSummaryRecord[];
  variantParentDisplayName: string | null;
  parentVariants: ItemSummaryRecord[] | null;
  selectedId: string | null;
  sellPrice: number | null;
  primaryCost: number | null;
  marginPct: number | null;
  canCatalogWrite: boolean;
  canInventoryWrite: boolean;
  canLinkSupplier: boolean;
  branches: { id: string; name: string }[];
  // quick-edit
  quickEdit: QuickEditKey;
  quickProductName: string;
  setQuickProductName: (v: string) => void;
  quickSku: string;
  setQuickSku: (v: string) => void;
  quickBarcode: string;
  setQuickBarcode: (v: string) => void;
  quickBundleQty: string;
  setQuickBundleQty: (v: string) => void;
  quickBundlePrice: string;
  setQuickBundlePrice: (v: string) => void;
  quickBuyingPrice: string;
  setQuickBuyingPrice: (v: string) => void;
  quickMargin: string;
  setQuickMargin: (v: string) => void;
  quickMinStock: string;
  setQuickMinStock: (v: string) => void;
  quickReorderLevel: string;
  setQuickReorderLevel: (v: string) => void;
  quickReorderQty: string;
  setQuickReorderQty: (v: string) => void;
  // stock quantity quick-edit
  quickStock: string;
  setQuickStock: (v: string) => void;
  saveQuickStock: () => void;
  quickStockBranchId: string;
  setQuickStockBranchId: (v: string) => void;
  quickStockUnitCost: string;
  setQuickStockUnitCost: (v: string) => void;
  quickStockBaseline: number | null;
  quickStockBaselineLoading: boolean;
  quickSaving: boolean;
  openQuickEdit: (k: Exclude<QuickEditKey, null>) => void;
  cancelQuickEdit: () => void;
  saveQuickProductName: () => void;
  saveQuickBarcode: () => void;
  saveQuickSku: () => void;
  saveQuickBundleQty: () => void;
  saveQuickBundlePrice: () => void;
  saveQuickBuyingPrice: () => void;
  saveQuickMargin: () => void;
  saveQuickMinStock: () => void;
  saveQuickReorder: () => void;
  openQuickEditAll: () => void;
  // variant inline edit
  variantInlineEditId: string | null;
  variantEditName: string;
  setVariantEditName: (v: string) => void;
  quickSavingVariant: boolean;
  startVariantRowEdit: (v: ItemSummaryRecord, e?: React.MouseEvent) => void;
  cancelVariantInlineEdit: () => void;
  saveVariantInline: () => Promise<void>;
  // drawer toggles
  setActiveDrawer: (d: string | null) => void;
  selectProduct: (id: string | null) => void;
  onOpenPackageSales?: () => void;
  onOpenBaseStock?: () => void;
  /** When provided, the panel shows a "Change department" quick action. */
  onOpenChangeItemType?: () => void;
  /** Human-friendly label of the product's current department (item type). */
  itemTypeLabel?: string;
  isStorefrontFeatured?: boolean;
  canManageFeatured?: boolean;
  featuredBusy?: boolean;
  featuredAtCapacity?: boolean;
  onToggleFeatured?: () => void;
};

export function ProductDetailPanel(props: Props) {
  const {
    detail,
    supplierLinks,
    variantRows,
    variantParentDisplayName,
    selectedId,
    sellPrice,
    primaryCost,
    marginPct,
    canCatalogWrite,
    canInventoryWrite,
    branches,
    quickEdit,
    quickProductName,
    setQuickProductName,
    quickSku,
    setQuickSku,
    quickBarcode,
    setQuickBarcode,
    quickBundleQty,
    setQuickBundleQty,
    quickBundlePrice,
    setQuickBundlePrice,
    quickBuyingPrice,
    setQuickBuyingPrice,
    quickMargin,
    setQuickMargin,
    quickMinStock,
    setQuickMinStock,
    quickReorderLevel,
    setQuickReorderLevel,
    quickReorderQty,
    setQuickReorderQty,
    quickStock,
    setQuickStock,
    saveQuickStock,
    quickStockBranchId,
    setQuickStockBranchId,
    quickStockUnitCost,
    setQuickStockUnitCost,
    quickStockBaseline,
    quickStockBaselineLoading,
    quickSaving,
    openQuickEdit,
    cancelQuickEdit,
    saveQuickProductName,
    saveQuickBarcode,
    saveQuickSku,
    saveQuickBundleQty,
    saveQuickBundlePrice,
    saveQuickBuyingPrice,
    saveQuickMargin,
    saveQuickMinStock,
    saveQuickReorder,
    openQuickEditAll,
    variantInlineEditId,
    variantEditName,
    setVariantEditName,
    quickSavingVariant,
    startVariantRowEdit,
    cancelVariantInlineEdit,
    saveVariantInline,
    setActiveDrawer,
    selectProduct,
    onOpenPackageSales,
    onOpenBaseStock,
    onOpenChangeItemType,
    itemTypeLabel,
    isStorefrontFeatured = false,
    canManageFeatured = false,
    featuredBusy = false,
    featuredAtCapacity = false,
    onToggleFeatured,
  } = props;

  const [scannerOpen, setScannerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [suppliersOpen, setSuppliersOpen] = useState(
    supplierLinks.length > 0 && supplierLinks.length <= 3,
  );
  const [variantsOpen, setVariantsOpen] = useState(true);

  const panelKind = detailPanelKind(detail, variantRows.length);
  const canToggleFeatured =
    canManageFeatured &&
    !!onToggleFeatured &&
    (panelKind === "standalone" || panelKind === "variant");
  const canAddPackageSales =
    canCatalogWrite && panelKind !== "group" && !!onOpenPackageSales;
  const panelTone = detailPanelTone(panelKind);
  const isParentish = panelKind === "group" || panelKind === "parent";

  const saveCancelBtns = (onSave: () => void) => (
    <div className="flex shrink-0 gap-1.5">
      <Button
        type="button"
        size="sm"
        className="h-7 gap-1 rounded-md px-2 text-[10px]"
        disabled={quickSaving}
        onClick={onSave}
      >
        <Save className="size-3" />
        Save
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 rounded-md px-2 text-[10px]"
        disabled={quickSaving}
        onClick={cancelQuickEdit}
      >
        Cancel
      </Button>
    </div>
  );

  const onInlineEnter =
    (onSave: () => void) => (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "TEXTAREA") return;
      e.preventDefault();
      onSave();
    };

  const inlineEdit = (
    label: string,
    onSave: () => void,
    input: React.ReactNode,
    trailing?: React.ReactNode,
  ) => (
    <div
      className={detailInlineEditClass}
      onKeyDown={onInlineEnter(onSave)}
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className={cn(productFormLabelClass, "mb-1 block")}>
            {label}
          </span>
          {input}
        </label>
        {trailing}
        {saveCancelBtns(onSave)}
      </div>
    </div>
  );

  const fieldBtn = (
    label: string,
    value: string,
    key: Exclude<QuickEditKey, null>,
    mono = false,
  ) => (
    <button
      type="button"
      className={detailFieldRowClass}
      onClick={() => openQuickEdit(key)}
    >
      <div className="min-w-0">
        <p className={detailFieldLabelClass}>{label}</p>
        <p
          className={cn(
            detailFieldValueClass,
            mono && "font-mono",
            key === "bundlePrice" && "font-bold tabular-nums",
          )}
        >
          {value}
        </p>
      </div>
      <Pencil
        className="size-3 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-primary"
        aria-hidden
      />
    </button>
  );

  const sharedStock = usesSharedPackageStock(detail);
  const stockLevel = effectiveOnHand(detail);
  const stockLabel = formatStockLabel(detail);
  const minStock = toNumber(detail.minStockLevel);
  const stockLow =
    !sharedStock &&
    stockLevel != null &&
    minStock != null &&
    stockLevel <= minStock;
  const packageVariants = variantRows.filter((v) => v.packageVariant);
  const optionVariants = variantRows.filter((v) => !v.packageVariant);
  const unitsPerPackage = packageUnitsPerSaleFromRow(detail);
  const siblingWithOwnStock = variantRows.filter(
    (v: ItemSummaryRecord) =>
      v.id !== detail.id &&
      !v.packageVariant &&
      (toNumber(v.stockQty) ?? 0) > 0,
  );
  const packagePoolEmpty =
    sharedStock &&
    (toNumber(detail.baseStockQty) ?? stockLevel ?? 0) <= 0 &&
    siblingWithOwnStock.length > 0;

  const statInputClass = cn(
    productFormInputClass,
    "h-8 w-full px-2 text-xs font-bold tabular-nums",
  );

  const statMiniActions = (onSave: () => void) => (
    <div className="mt-1.5 flex gap-1">
      <Button
        type="button"
        size="sm"
        className="h-6 flex-1 rounded px-1.5 text-[9px]"
        disabled={quickSaving}
        onClick={onSave}
      >
        Save
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-6 flex-1 rounded px-1.5 text-[9px]"
        disabled={quickSaving}
        onClick={cancelQuickEdit}
      >
        Cancel
      </Button>
    </div>
  );

  const renderPricingStatCell = (
    label: string,
    display: string,
    editKey: Exclude<QuickEditKey, null>,
    onSave: () => void,
    opts: {
      canEdit: boolean;
      highlight?: "success" | "danger" | "default";
      valueClass?: string;
      onActivate?: () => void;
      editContent?: React.ReactNode;
    },
  ) => {
    const isEditing = quickEdit === editKey;
    const highlight = opts.highlight ?? "default";
    return (
      <div
        key={label}
        className={cn(
          detailStatCellClass(highlight),
          detailMetricCellWrapClass,
          isEditing && "bg-muted/50 ring-1 ring-inset ring-primary/25",
        )}
      >
        <p className={detailFieldLabelClass}>{label}</p>
        {isEditing && opts.editContent ? (
          <div className="mt-1" onKeyDown={onInlineEnter(onSave)}>
            {opts.editContent}
          </div>
        ) : isEditing ? (
          <p className={cn(detailStatValueClass, "text-sm font-medium text-primary")}>
            Editing…
          </p>
        ) : (
          <button
            type="button"
            disabled={!opts.canEdit}
            onClick={() => {
              if (opts.onActivate) {
                opts.onActivate();
              } else {
                openQuickEdit(editKey);
              }
            }}
            className={cn(
              "group/stat mt-0.5 w-full text-left",
              opts.canEdit &&
                "cursor-pointer rounded-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              !opts.canEdit && "cursor-default",
            )}
          >
            <p
              className={cn(
                detailStatValueClass,
                "text-sm font-semibold",
                opts.valueClass,
              )}
            >
              {display}
            </p>
            {opts.canEdit ? (
              <span className="mt-0.5 flex items-center gap-0.5 text-[9px] font-medium text-primary/80 opacity-0 transition-opacity group-hover/stat:opacity-100 group-focus-visible/stat:opacity-100">
                <Pencil className="size-2.5" aria-hidden />
                Tap to edit
              </span>
            ) : null}
          </button>
        )}
      </div>
    );
  };

  const thumbUrl = coverImageUrl(detail);
  const titleInitial = (detail.name?.trim() || "?").charAt(0).toUpperCase();
  const heroTitle =
    isParentish && variantRows.length > 0
      ? `${detail.name} (${variantRows.length})`
      : detail.name;

  const KindIcon = panelKind === "variant" ? Layers : Package;
  const kindLabel =
    panelKind === "variant"
      ? "Variant"
      : panelKind === "group"
        ? "Group"
        : panelKind === "parent"
          ? `Parent · ${variantRows.length} variant${variantRows.length === 1 ? "" : "s"}`
          : "Standalone";

  const variantCountLabel =
    variantRows.length > 0
      ? `${variantRows.length} SKU${variantRows.length === 1 ? "" : "s"}`
      : null;

  return (
    <div className={detailShellClass}>
      {/* Hero */}
      <div
        className={cn(
          detailHeroClass,
          panelTone.heroGradient,
          panelTone.heroRing,
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full",
            panelTone.accent,
          )}
          aria-hidden
        />
        <div className="flex items-start gap-3 pl-2">
          {isParentish && !thumbUrl ? (
            <span
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-xl border border-dashed text-base font-bold tracking-tight shadow-sm ring-1 ring-black/[0.04] sm:size-14",
                panelTone.accentLight,
              )}
            >
              {titleInitial}
            </span>
          ) : (
            <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted shadow-sm ring-1 ring-black/[0.04] sm:size-14">
              {thumbUrl ? (
                <Image
                  src={thumbUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package
                    className="size-6 text-muted-foreground/40"
                    aria-hidden
                  />
                </div>
              )}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap gap-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  panelTone.badge,
                )}
              >
                <KindIcon className="size-2.5" aria-hidden />
                {kindLabel}
              </span>
              {detail.active === false && (
                <span className="inline-flex items-center rounded-full border border-destructive/25 bg-destructive/5 px-2 py-0.5 text-[10px] font-medium text-destructive">
                  Inactive
                </span>
              )}
              {detail.webPublished && (
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
                  Online
                </span>
              )}
              {isStorefrontFeatured && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
                  <Star className="size-2.5 fill-current" aria-hidden />
                  Featured
                </span>
              )}
              {sharedStock && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Boxes className="size-2.5" aria-hidden />
                  Package SKU
                </span>
              )}
            </div>
            <h3
              className={cn(
                "text-base font-semibold leading-snug tracking-tight text-foreground sm:text-[15px]",
                isParentish && "capitalize",
              )}
            >
              {heroTitle}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              {detail.sku && (
                <span className="font-mono font-medium text-foreground/90">
                  {detail.sku}
                </span>
              )}
              {detail.barcode && (
                <span className="font-mono opacity-75">{detail.barcode}</span>
              )}
              {detail.brand && (
                <span className="rounded-md border border-border/40 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-foreground/85">
                  {detail.brand}
                </span>
              )}
              {detail.size && (
                <span className="rounded-md border border-border/40 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-foreground/85">
                  {detail.size}
                </span>
              )}
              {detail.variantName && (
                <span className="font-medium text-violet-700 dark:text-violet-300">
                  {detail.variantName}
                </span>
              )}
            </div>
            {detail.variantOfItemId && variantParentDisplayName ? (
              <p className="text-[11px] leading-snug text-muted-foreground">
                Variant of{" "}
                <span className="font-medium text-foreground">
                  {variantParentDisplayName}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className={detailQuickActionGridClass}>
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-1.5 rounded-xl text-xs font-medium shadow-sm"
          onClick={() => setActiveDrawer("edit-product")}
        >
          <PencilLine className="size-3.5" aria-hidden />
          Edit product
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-1.5 rounded-xl text-xs font-medium shadow-sm"
          onClick={() => setActiveDrawer("photos")}
        >
          <Camera className="size-3.5" aria-hidden />
          Photos
        </Button>
        {canCatalogWrite && onOpenChangeItemType ? (
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-1.5 rounded-xl text-xs font-medium shadow-sm"
            onClick={onOpenChangeItemType}
            title={
              itemTypeLabel
                ? `Current department: ${itemTypeLabel}`
                : "Change department"
            }
          >
            <Layers className="size-3.5" aria-hidden />
            <span className="truncate">
              {itemTypeLabel ? `Dept: ${itemTypeLabel}` : "Department"}
            </span>
          </Button>
        ) : null}
        {canToggleFeatured ? (
          <Button
            type="button"
            variant={isStorefrontFeatured ? "secondary" : "outline"}
            className="h-9 gap-1.5 rounded-xl text-xs font-medium shadow-sm"
            disabled={
              featuredBusy || (!isStorefrontFeatured && featuredAtCapacity)
            }
            onClick={onToggleFeatured}
            title={
              isStorefrontFeatured
                ? "Remove from storefront featured list"
                : featuredAtCapacity
                  ? "Featured list is full (max 12)"
                  : "Pin on your public storefront home"
            }
          >
            {featuredBusy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Star
                className={cn(
                  "size-3.5",
                  isStorefrontFeatured && "fill-current text-amber-600",
                )}
                aria-hidden
              />
            )}
            {isStorefrontFeatured ? "Remove featured" : "Add to featured"}
          </Button>
        ) : null}
        {!detail.variantOfItemId && canCatalogWrite ? (
          <Button
            type="button"
            variant="outline"
            className="col-span-2 h-9 gap-1.5 rounded-xl text-xs font-medium shadow-sm sm:col-span-1"
            onClick={() => setActiveDrawer("add-variant")}
          >
            <Layers className="size-3.5" aria-hidden />
            Add variant
          </Button>
        ) : null}
      </div>

      {/* Package workflow — primary CTA or active package context */}
      {sharedStock ? (
        <div className={cn(detailPackageCardClass, "border-violet-500/25 ring-violet-500/15")}>
          <div className="flex gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
              <Boxes className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-tight">
                Selling as package
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {unitsPerPackage != null ? (
                  <>
                    <span className="font-semibold tabular-nums text-foreground">
                      {unitsPerPackage}
                    </span>{" "}
                    base units per sale from{" "}
                    <span className="font-medium text-foreground">
                      {variantParentDisplayName ?? "parent stock"}
                    </span>
                    .
                  </>
                ) : (
                  "Set units per package in full edit."
                )}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-9 flex-1 rounded-lg text-xs"
              onClick={() => setActiveDrawer("edit-product")}
            >
              Edit package
            </Button>
            {onOpenBaseStock ? (
              <Button
                type="button"
                className="h-9 flex-1 rounded-lg text-xs"
                onClick={onOpenBaseStock}
              >
                <PackagePlus className="size-3.5" aria-hidden />
                Base stock
              </Button>
            ) : null}
          </div>
        </div>
      ) : canAddPackageSales ? (
        <div className={detailPackageCardClass}>
          <div className="flex gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Boxes className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-tight">
                Packages &amp; bundles
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Sell trays, packs, or custom sizes from this product without
                duplicating stock.
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="mt-3 h-10 w-full gap-2 rounded-xl text-sm font-medium shadow-sm"
            onClick={onOpenPackageSales}
          >
            <PackagePlus className="size-4" aria-hidden />
            Add package size
          </Button>
          {packageVariants.length > 0 ? (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              {packageVariants.length} package size
              {packageVariants.length === 1 ? "" : "s"} already configured
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Commerce metrics */}
      <section className={detailSectionClass}>
        <header className={detailSectionHeadClass}>
          <CircleDollarSign
            className="size-3.5 text-muted-foreground/70"
            aria-hidden
          />
          <span className={detailSectionLabelClass}>Commerce</span>
          {stockLow ? (
            <span className="ml-auto rounded-full border border-destructive/30 bg-destructive/8 px-2 py-0.5 text-[10px] font-semibold text-destructive">
              Low stock
            </span>
          ) : null}
        </header>
        <div className={detailMetricGridClass}>
          {renderPricingStatCell(
            "Shelf",
            formatAmount(sellPrice),
            "bundlePrice",
            saveQuickBundlePrice,
            {
              canEdit: canCatalogWrite,
              valueClass: "font-bold",
              editContent: (
                <>
                  <input
                    autoFocus
                    className={statInputClass}
                    inputMode="decimal"
                    value={quickBundlePrice}
                    onChange={(e) => setQuickBundlePrice(e.target.value)}
                    placeholder="0.00"
                    aria-label="Shelf price"
                  />
                  {statMiniActions(saveQuickBundlePrice)}
                </>
              ),
            },
          )}
          {renderPricingStatCell(
            "Cost",
            formatAmount(primaryCost),
            "buyingPrice",
            saveQuickBuyingPrice,
            {
              canEdit: canCatalogWrite,
              editContent: (
                <>
                  <input
                    autoFocus
                    className={statInputClass}
                    inputMode="decimal"
                    value={quickBuyingPrice}
                    onChange={(e) => setQuickBuyingPrice(e.target.value)}
                    placeholder="0.00"
                    aria-label="Cost price"
                  />
                  {statMiniActions(saveQuickBuyingPrice)}
                </>
              ),
            },
          )}
          {renderPricingStatCell(
            "Margin",
            marginPct != null ? `${marginPct.toFixed(1)}%` : "—",
            "margin",
            saveQuickMargin,
            {
              canEdit: canCatalogWrite,
              highlight:
                marginPct != null && marginPct > 0
                  ? "success"
                  : "default",
              valueClass:
                marginPct != null && marginPct > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : undefined,
              editContent: (
                <>
                  <input
                    autoFocus
                    className={statInputClass}
                    inputMode="decimal"
                    value={quickMargin}
                    onChange={(e) => setQuickMargin(e.target.value)}
                    placeholder="%"
                    aria-label="Margin percent"
                  />
                  <p className="mt-1 text-[9px] leading-snug text-muted-foreground">
                    Updates shelf from cost
                  </p>
                  {statMiniActions(saveQuickMargin)}
                </>
              ),
            },
          )}
          {renderPricingStatCell(
            sharedStock ? "Available" : "Stock",
            stockLabel,
            "stock",
            () => void saveQuickStock(),
            {
              canEdit:
                sharedStock && canInventoryWrite && !!onOpenBaseStock
                  ? true
                  : canInventoryWrite && !sharedStock,
              highlight: stockLow ? "danger" : "default",
              valueClass: stockLow
                ? "text-destructive font-semibold"
                : "font-semibold",
              onActivate:
                sharedStock && onOpenBaseStock
                  ? onOpenBaseStock
                  : undefined,
            },
          )}
        </div>
        {quickEdit === "stock" && !sharedStock && canInventoryWrite ? (
          <div
            className="border-t border-border/40 bg-muted/20 px-2.5 py-2.5"
            onKeyDown={onInlineEnter(() => void saveQuickStock())}
          >
            <p className={cn(productFormLabelClass, "mb-2")}>Set on-hand stock</p>
            <div className="space-y-2">
              <label className={productFormFieldClass}>
                <span className={productFormLabelClass}>Branch</span>
                <select
                  className={productFormSelectClass}
                  value={quickStockBranchId}
                  onChange={(e) => setQuickStockBranchId(e.target.value)}
                >
                  <option value="">— Select branch —</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={productFormFieldClass}>
                <span className={productFormLabelClass}>On hand</span>
                <input
                  autoFocus
                  className={productFormInputClass}
                  inputMode="decimal"
                  value={quickStock}
                  onChange={(e) => setQuickStock(e.target.value)}
                  placeholder="e.g. 12"
                  aria-label="On-hand quantity"
                />
              </label>
              {quickStockBaselineLoading ? (
                <p className="text-[10px] text-muted-foreground">
                  Loading current stock…
                </p>
              ) : quickStockBaseline != null ? (
                <p className="text-[10px] tabular-nums text-muted-foreground">
                  Current at branch:{" "}
                  <span className="font-medium text-foreground">
                    {formatAmount(quickStockBaseline)}
                  </span>
                  {(() => {
                    const next = Number(quickStock.trim());
                    if (!Number.isFinite(next) || quickStock.trim() === "") {
                      return null;
                    }
                    const d = Math.round((next - quickStockBaseline) * 10000) / 10000;
                    if (Math.abs(d) < 0.0001) return null;
                    return (
                      <span>
                        {" "}
                        → after save:{" "}
                        <span className="font-medium text-foreground">
                          {formatAmount(next)}
                        </span>
                        {d > 0 ? ` (+${formatAmount(d)})` : ` (${formatAmount(d)})`}
                      </span>
                    );
                  })()}
                </p>
              ) : null}
              {(() => {
                const next = Number(quickStock.trim());
                const base = quickStockBaseline ?? 0;
                const needsCost =
                  Number.isFinite(next) && next > base + 0.0001;
                if (!needsCost) return null;
                return (
                  <label className={productFormFieldClass}>
                    <span className={productFormLabelClass}>
                      Unit cost (increase only)
                    </span>
                    <input
                      className={productFormInputClass}
                      inputMode="decimal"
                      value={quickStockUnitCost}
                      onChange={(e) => setQuickStockUnitCost(e.target.value)}
                      placeholder="0.00"
                    />
                  </label>
                );
              })()}
            </div>
            <div className="mt-2 flex justify-end">
              {saveCancelBtns(() => void saveQuickStock())}
            </div>
          </div>
        ) : null}
        {supplierLinks.length === 0 && canCatalogWrite ? (
          <p className="border-t border-border/40 px-3 py-2 text-[11px] text-muted-foreground">
            <button
              type="button"
              className="font-medium text-primary transition-colors hover:text-primary/80"
              onClick={() => setActiveDrawer("edit-product")}
            >
              Link a supplier
            </button>{" "}
            for cost tracking and margin accuracy.
          </p>
        ) : null}
      </section>

      {/* Compact alerts */}
      {packagePoolEmpty ? (
        <div
          className={cn(
            "rounded-xl border px-3 py-2.5 text-xs leading-relaxed",
            "border-amber-500/25 bg-amber-500/[0.06] text-muted-foreground",
          )}
          role="status"
        >
          <span className="font-medium text-foreground">Stock mismatch:</span>{" "}
          base pool is empty while{" "}
          {siblingWithOwnStock
            .map((v: ItemSummaryRecord) => v.variantName?.trim() || v.name)
            .join(", ")}{" "}
          hold separate stock. Move quantity to{" "}
          <span className="font-medium text-foreground">
            {variantParentDisplayName ?? "the parent"}
          </span>{" "}
          or convert those SKUs to packages.
        </div>
      ) : null}

      {/* Product details — identity & inventory alerts (no duplicate pricing) */}
      {canCatalogWrite ? (
        <section className={detailSectionClass}>
          <button
            type="button"
            className={detailCollapsibleTriggerClass}
            onClick={() => setDetailsOpen((o) => !o)}
            aria-expanded={detailsOpen}
          >
            <Pencil className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
            <span className={detailSectionLabelClass}>Product details</span>
            {quickSaving ? (
              <Loader2
                className="ml-1 size-3 animate-spin text-muted-foreground"
                aria-hidden
              />
            ) : null}
            <span className="ml-auto flex items-center gap-2">
              {!detailsOpen ? (
                <span className="text-[11px] font-medium text-muted-foreground">
                  Name, SKU, alerts
                </span>
              ) : null}
              {detailsOpen ? (
                <ChevronUp className="size-4 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
              )}
            </span>
          </button>
          {detailsOpen ? (
            <div className="divide-y divide-border/40 border-t border-border/40 bg-background/50">
              {quickEdit === "productName" ? (
                inlineEdit(
                  "Display name",
                  saveQuickProductName,
                  <input
                    autoFocus
                    className={productFormInputClass}
                    value={quickProductName}
                    onChange={(e) => setQuickProductName(e.target.value)}
                    placeholder="Customer-facing title"
                  />,
                )
              ) : (
                fieldBtn("Name", detail.name, "productName")
              )}
              {quickEdit === "sku" ? (
                inlineEdit(
                  "SKU",
                  saveQuickSku,
                  <input
                    autoFocus
                    className={productFormInputMonoClass}
                    value={quickSku}
                    onChange={(e) => setQuickSku(e.target.value)}
                    placeholder="SKU-001"
                  />,
                )
              ) : (
                fieldBtn("SKU", detail.sku, "sku", true)
              )}
              {quickEdit === "barcode" ? (
                inlineEdit(
                  "Barcode",
                  () => void saveQuickBarcode(),
                  <input
                    autoFocus
                    className={productFormInputMonoClass}
                    value={quickBarcode}
                    onChange={(e) => setQuickBarcode(e.target.value)}
                    placeholder="Scan or type…"
                  />,
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md border border-input/80 bg-background text-muted-foreground shadow-sm hover:bg-muted"
                    aria-label="Scan barcode with camera"
                  >
                    <Camera className="size-3.5" />
                  </button>,
                )
              ) : (
                fieldBtn(
                  "Barcode",
                  detail.barcode?.trim() || "—",
                  "barcode",
                  true,
                )
              )}
              {!sharedStock && detail.bundleQty != null ? (
                quickEdit === "bundleQty" ? (
                  inlineEdit(
                    "Pack qty",
                    saveQuickBundleQty,
                    <input
                      autoFocus
                      className={productFormInputClass}
                      inputMode="numeric"
                      value={quickBundleQty}
                      onChange={(e) => setQuickBundleQty(e.target.value)}
                      placeholder="e.g. 6"
                    />,
                  )
                ) : (
                  fieldBtn(
                    "Pack qty",
                    String(detail.bundleQty),
                    "bundleQty",
                  )
                )
              ) : null}
              {sharedStock ? (
                <div className={cn(detailFieldRowClass, "cursor-default")}>
                  <div className="min-w-0">
                    <p className={detailFieldLabelClass}>Inventory alerts</p>
                    <p className="text-xs leading-snug text-muted-foreground">
                      Min stock and reorder live on{" "}
                      <span className="font-medium text-foreground">
                        {variantParentDisplayName ?? "the base product"}
                      </span>
                      .
                    </p>
                  </div>
                  {onOpenBaseStock ? (
                    <button
                      type="button"
                      onClick={onOpenBaseStock}
                      className="shrink-0 text-[11px] font-medium text-primary"
                    >
                      Open base
                    </button>
                  ) : null}
                </div>
              ) : (
                <>
                  {quickEdit === "minStock" ? (
                    inlineEdit(
                      "Min stock",
                      saveQuickMinStock,
                      <input
                        autoFocus
                        className={productFormInputClass}
                        inputMode="decimal"
                        value={quickMinStock}
                        onChange={(e) => setQuickMinStock(e.target.value)}
                        placeholder="e.g. 5"
                      />,
                    )
                  ) : (
                    fieldBtn(
                      "Min stock",
                      formatAmount(toNumber(detail.minStockLevel)),
                      "minStock",
                    )
                  )}
                  {quickEdit === "reorder" ? (
                    <div
                      className={detailInlineEditClass}
                      onKeyDown={onInlineEnter(saveQuickReorder)}
                    >
                      <span className={cn(productFormLabelClass, "mb-2 block")}>
                        Reorder
                      </span>
                      <div className={productFormGrid2Class}>
                        <label className={productFormFieldClass}>
                          <span className={productFormLabelClass}>At level</span>
                          <input
                            autoFocus
                            className={productFormInputClass}
                            inputMode="decimal"
                            value={quickReorderLevel}
                            onChange={(e) =>
                              setQuickReorderLevel(e.target.value)
                            }
                            placeholder="e.g. 10"
                          />
                        </label>
                        <label className={productFormFieldClass}>
                          <span className={productFormLabelClass}>Order qty</span>
                          <input
                            className={productFormInputClass}
                            inputMode="decimal"
                            value={quickReorderQty}
                            onChange={(e) => setQuickReorderQty(e.target.value)}
                            placeholder="e.g. 50"
                          />
                        </label>
                      </div>
                      <div className="mt-2 flex justify-end">
                        {saveCancelBtns(saveQuickReorder)}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={detailFieldRowClass}
                      onClick={() => openQuickEdit("reorder")}
                    >
                      <div className="min-w-0">
                        <p className={detailFieldLabelClass}>Reorder</p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          At{" "}
                          <strong className="text-foreground">
                            {formatAmount(toNumber(detail.reorderLevel))}
                          </strong>
                          {" · "}Order{" "}
                          <strong className="text-foreground">
                            {formatAmount(toNumber(detail.reorderQty))}
                          </strong>
                        </p>
                      </div>
                      <Pencil
                        className="size-3 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-primary"
                        aria-hidden
                      />
                    </button>
                  )}
                </>
              )}
              <div className="flex items-center justify-end gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() =>
                    sharedStock
                      ? setActiveDrawer("edit-product")
                      : openQuickEditAll()
                  }
                  className="text-[11px] font-medium text-primary"
                >
                  {sharedStock ? "Full package edit" : "Edit all fields"}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Suppliers */}
      {supplierLinks.length > 0 ? (
        <section className={detailSectionClass}>
          <div className={cn(detailCollapsibleTriggerClass, "cursor-default hover:bg-transparent")}>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => setSuppliersOpen((o) => !o)}
              aria-expanded={suppliersOpen}
            >
              <Building2
                className="size-3.5 shrink-0 text-muted-foreground/70"
                aria-hidden
              />
              <span className={detailSectionLabelClass}>
                Suppliers · {supplierLinks.length}
              </span>
              {suppliersOpen ? (
                <ChevronUp className="ml-1 size-4 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronDown className="ml-1 size-4 text-muted-foreground" aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="shrink-0 text-[11px] font-medium text-primary transition-colors hover:text-primary/80"
              onClick={() => setActiveDrawer("edit-product")}
            >
              Manage
            </button>
          </div>
          {suppliersOpen ? (
            <div className="divide-y divide-border/40 border-t border-border/40 bg-background/50">
              {supplierLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between gap-2 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="truncate text-xs font-medium text-foreground">
                        {link.supplierName}
                      </span>
                      {link.primary && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          Primary
                        </span>
                      )}
                      {!link.active && (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </div>
                    {link.supplierSku && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {link.supplierSku}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-foreground">
                    {formatAmount(effectiveSupplierUnitCost(link, undefined))}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* SKUs — variants & packages */}
      <section className={detailSectionClass}>
        <button
          type="button"
          className={detailCollapsibleTriggerClass}
          onClick={() => setVariantsOpen((o) => !o)}
          aria-expanded={variantsOpen}
        >
          <Layers className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
          <span className={detailSectionLabelClass}>
            {packageVariants.length > 0 && optionVariants.length === 0
              ? "Package sizes"
              : "SKUs & variants"}
          </span>
          {variantCountLabel ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-foreground">
              {variantCountLabel}
            </span>
          ) : null}
          <span className="ml-auto">
            {variantsOpen ? (
              <ChevronUp className="size-4 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
            )}
          </span>
        </button>
        {variantsOpen ? (
          <>
            {!detail.variantOfItemId ? (
              <div className="flex flex-wrap gap-2 border-t border-border/40 bg-muted/15 px-3 py-2">
                {canAddPackageSales ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1 rounded-lg text-xs"
                    onClick={onOpenPackageSales}
                  >
                    <Boxes className="size-3.5" aria-hidden />
                    Add package
                  </Button>
                ) : null}
                {canCatalogWrite ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 rounded-lg text-xs"
                    onClick={() => setActiveDrawer("add-variant")}
                  >
                    <PackagePlus className="size-3.5" aria-hidden />
                    Add variant
                  </Button>
                ) : null}
              </div>
            ) : null}
            {variantRows.length === 0 ? (
              <div className="flex flex-col items-center gap-3 border-t border-border/40 px-4 py-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30">
                  <Layers className="size-5 text-muted-foreground/50" aria-hidden />
                </div>
                <div className="max-w-[14rem] space-y-1">
                  <p className="text-xs font-medium text-foreground">
                    No SKUs yet
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Add option variants or package sizes under this product.
                  </p>
                </div>
                <div className="flex w-full max-w-[16rem] flex-col gap-2 sm:flex-row sm:justify-center">
                  {canAddPackageSales ? (
                    <Button
                      type="button"
                      className="h-9 flex-1 gap-1.5 rounded-lg text-xs"
                      onClick={onOpenPackageSales}
                    >
                      <Boxes className="size-3.5" aria-hidden />
                      Package
                    </Button>
                  ) : null}
                  {canCatalogWrite ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 flex-1 gap-1.5 rounded-lg text-xs"
                      onClick={() => setActiveDrawer("add-variant")}
                    >
                      <PackagePlus className="size-3.5" aria-hidden />
                      Variant
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/40 border-t border-border/40 bg-background/50">
                {variantRows.map((v) => {
                  const vThumb = itemListThumbnailUrl(v);
                  const vSelected = selectedId === v.id;
                  const editing = variantInlineEditId === v.id;
                  return (
                    <Fragment key={v.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        className={cn(
                          "flex cursor-pointer items-center gap-2.5 px-3 py-2.5 transition-colors",
                          !vSelected && panelTone.variantRowHover,
                          vSelected && panelTone.variantRowActive,
                          editing && "bg-muted/20",
                        )}
                    onClick={() => {
                      if (!editing) selectProduct(v.id);
                    }}
                    onKeyDown={(e) => {
                      if (!editing && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        selectProduct(v.id);
                      }
                    }}
                  >
                    <div className="relative size-7 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted">
                      {vThumb ? (
                        <Image
                          src={vThumb}
                          alt=""
                          width={28}
                          height={28}
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package
                            className="size-3.5 text-muted-foreground/40"
                            aria-hidden
                          />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-medium text-foreground">
                          {v.name}
                        </p>
                        {v.packageVariant ? (
                          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-primary/20 bg-primary/8 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                            <Boxes className="size-2.5" aria-hidden />
                            Pack
                          </span>
                        ) : null}
                      </div>
                      {v.packageVariant ? (
                        <p className="text-[11px] tabular-nums text-muted-foreground">
                          {toNumber(v.packageUnitsPerSale) ?? "?"} units ·{" "}
                          {formatStockLabel(v)}
                        </p>
                      ) : v.variantName ? (
                        <p className="text-[11px] text-muted-foreground">
                          {v.variantName}
                        </p>
                      ) : null}
                    </div>
                    {canCatalogWrite && (
                      <button
                        type="button"
                        className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:text-foreground"
                        onClick={(e) => startVariantRowEdit(v, e)}
                        aria-label={`Edit ${v.name}`}
                      >
                        <Pencil className="size-3" aria-hidden />
                      </button>
                    )}
                  </div>
                  {editing && (
                    <div className="border-t border-border/40 bg-muted/20 px-3 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <label className="flex flex-1 flex-col gap-1.5 text-[11px] font-medium text-muted-foreground">
                          Display name
                          <input
                            className={quickInputClass}
                            value={variantEditName}
                            onChange={(e) => setVariantEditName(e.target.value)}
                            aria-label="Variant display name"
                          />
                        </label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 gap-1 rounded-lg"
                            disabled={quickSavingVariant}
                            onClick={() => void saveVariantInline()}
                          >
                            {quickSavingVariant ? (
                              <Loader2
                                className="size-3.5 animate-spin"
                                aria-hidden
                              />
                            ) : (
                              "Save"
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-lg"
                            disabled={quickSavingVariant}
                            onClick={cancelVariantInlineEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Variant name and SKU are set at creation — adjust from{" "}
                        <button
                          type="button"
                          className="font-medium text-primary underline-offset-2 hover:underline"
                          onClick={() => setActiveDrawer("edit-product")}
                        >
                          Details
                        </button>
                        .
                      </p>
                    </div>
                  )}
                    </Fragment>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </section>

      {/* Mobile sticky actions */}
      <div className={detailStickyBarClass}>
        <div className="mx-auto flex max-w-lg gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1 gap-1.5 rounded-xl text-xs font-medium"
            onClick={() => setActiveDrawer("edit-product")}
          >
            <PencilLine className="size-3.5" aria-hidden />
            Edit
          </Button>
          {canAddPackageSales ? (
            <Button
              type="button"
              className="h-10 flex-1 gap-1.5 rounded-xl text-xs font-medium shadow-sm"
              onClick={onOpenPackageSales}
            >
              <Boxes className="size-3.5" aria-hidden />
              Package
            </Button>
          ) : sharedStock && onOpenBaseStock ? (
            <Button
              type="button"
              className="h-10 flex-1 gap-1.5 rounded-xl text-xs font-medium"
              onClick={onOpenBaseStock}
            >
              <PackagePlus className="size-3.5" aria-hidden />
              Stock
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="h-10 flex-1 gap-1.5 rounded-xl text-xs font-medium"
              onClick={() => setActiveDrawer("photos")}
            >
              <Camera className="size-3.5" aria-hidden />
              Photos
            </Button>
          )}
        </div>
      </div>

      {scannerOpen && (
        <BarcodeScanner
          onScan={(barcode) => {
            setQuickBarcode(barcode);
            setScannerOpen(false);
            openQuickEdit("barcode");
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
}
