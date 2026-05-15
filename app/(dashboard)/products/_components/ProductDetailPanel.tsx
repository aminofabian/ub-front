"use client";

import Image from "next/image";
import { Fragment, useState } from "react";
import {
  Building2,
  Camera,
  CircleDollarSign,
  Layers,
  Loader2,
  Package,
  PackagePlus,
  Pencil,
  PencilLine,
  Save,
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
  toNumber,
} from "../_utils";
import { quickInputClass } from "../_types";
import {
  productFormFieldClass,
  productFormGrid2Class,
  productFormInputClass,
  productFormInputMonoClass,
  productFormLabelClass,
} from "./product-form-styles";
import { StockIncreaseFields } from "./StockIncreaseFields";
import {
  detailFieldRowClass,
  detailInlineEditClass,
  detailPanelKind,
  detailPanelTone,
  detailSectionClass,
  detailSectionHeadClass,
  detailSectionLabelClass,
  detailStatCellClass,
  detailFieldLabelClass,
  detailFieldValueClass,
  detailActionBtnClass,
  detailActionBtnPrimaryClass,
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
  quickSaving: boolean;
  openQuickEdit: (k: Exclude<QuickEditKey, null>) => void;
  cancelQuickEdit: () => void;
  saveQuickProductName: () => void;
  saveQuickBarcode: () => void;
  saveQuickSku: () => void;
  saveQuickBundleQty: () => void;
  saveQuickBundlePrice: () => void;
  saveQuickBuyingPrice: () => void;
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
    quickSaving,
    openQuickEdit,
    cancelQuickEdit,
    saveQuickProductName,
    saveQuickBarcode,
    saveQuickSku,
    saveQuickBundleQty,
    saveQuickBundlePrice,
    saveQuickBuyingPrice,
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
  } = props;

  const [scannerOpen, setScannerOpen] = useState(false);

  const panelKind = detailPanelKind(detail, variantRows.length);
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

  const stockLevel = effectiveOnHand(detail);
  const minStock = toNumber(detail.minStockLevel);
  const stockLow =
    stockLevel != null && minStock != null && stockLevel <= minStock;

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

  return (
    <div className="space-y-2.5">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border/55 p-2.5 shadow-sm ring-1 ring-inset",
          panelTone.heroGradient,
          panelTone.heroRing,
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full",
            panelTone.accent,
          )}
          aria-hidden
        />
        <div className="flex items-start gap-2 pl-1.5">
          {isParentish && !thumbUrl ? (
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-lg border border-dashed text-sm font-bold tracking-tight shadow-sm ring-1 ring-black/[0.04]",
                panelTone.accentLight,
              )}
            >
              {titleInitial}
            </span>
          ) : (
            <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted shadow-sm ring-1 ring-black/[0.04]">
              {thumbUrl ? (
                <Image
                  src={thumbUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="44px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package
                    className="size-5 text-muted-foreground/40"
                    aria-hidden
                  />
                </div>
              )}
            </div>
          )}
        <div className="min-w-0 flex-1 space-y-1">
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
          </div>
          <h3
            className={cn(
              "text-sm font-semibold leading-snug tracking-tight text-foreground",
              isParentish && "capitalize",
            )}
          >
            {heroTitle}
          </h3>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground">
            {detail.sku && (
              <span className="font-mono font-medium">{detail.sku}</span>
            )}
            {detail.barcode && (
              <span className="font-mono opacity-70">{detail.barcode}</span>
            )}
            {detail.brand && (
              <span className="rounded-full border border-border/40 bg-muted/40 px-1.5 py-0 text-[10px] font-medium text-foreground/80">
                {detail.brand}
              </span>
            )}
            {detail.size && (
              <span className="rounded-full border border-border/40 bg-muted/40 px-1.5 py-0 text-[10px] font-medium text-foreground/80">
                {detail.size}
              </span>
            )}
            {detail.variantName && (
              <span className="font-medium text-violet-700 dark:text-violet-300">
                {detail.variantName}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveDrawer("edit-product")}
            className={detailActionBtnPrimaryClass}
          >
            <PencilLine className="size-3" aria-hidden /> Edit
          </button>
          <button
            type="button"
            onClick={() => setActiveDrawer("photos")}
            className={cn(detailActionBtnClass, "size-6")}
            aria-label="Photos"
          >
            <Camera className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setActiveDrawer("add-variant")}
            className={cn(detailActionBtnClass, "size-6")}
            aria-label="Add variant under parent"
          >
            <Layers className="size-3.5" aria-hidden />
          </button>
        </div>
        </div>
      </div>

      {/* Variant context notice */}
      {detail.variantOfItemId && (
        <div
          className={cn(
            "flex items-start gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] leading-snug",
            panelTone.notice,
          )}
        >
          <Layers
            className="mt-0.5 size-3 shrink-0 text-violet-500"
            aria-hidden
          />
          <span>
            This SKU is a variant of{" "}
            {variantParentDisplayName ? (
              <strong className="font-semibold">
                {variantParentDisplayName}
              </strong>
            ) : (
              "its parent product"
            )}
            . Tap a variant in the list below to switch SKUs.
          </span>
        </div>
      )}

      {/* ── 1. Pricing ────────────────────────────────────────────────── */}
      <section className={detailSectionClass}>
        <header className={detailSectionHeadClass}>
          <CircleDollarSign
            className="size-3 text-muted-foreground/70"
            aria-hidden
          />
          <span className={detailSectionLabelClass}>Pricing</span>
        </header>
        <div className="grid grid-cols-4 divide-x divide-border/40 bg-background/50">
          {(
            [
              ["Shelf", formatAmount(sellPrice), "font-bold", "default"] as const,
              ["Cost", formatAmount(primaryCost), "font-semibold", "default"] as const,
              [
                "Margin",
                marginPct != null ? `${marginPct.toFixed(1)}%` : "—",
                marginPct != null && marginPct > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "",
                marginPct != null && marginPct > 0 ? "success" : "default",
              ] as const,
              [
                "Stock",
                formatAmount(stockLevel),
                stockLow ? "text-destructive font-semibold" : "font-semibold",
                stockLow ? "danger" : "default",
              ] as const,
            ]
          ).map(([label, value, cls, highlight]) => (
            <div
              key={label}
              className={detailStatCellClass(
                highlight === "success"
                  ? "success"
                  : highlight === "danger"
                    ? "danger"
                    : "default",
              )}
            >
              <p className={detailFieldLabelClass}>{label}</p>
              <p className={cn(detailStatValueClass, cls)}>
                {value}
              </p>
            </div>
          ))}
        </div>
        {supplierLinks.length === 0 && (
          <p className="border-t border-border/40 px-2.5 py-1.5 text-[10px] text-muted-foreground">
            Link a supplier to see cost &amp; margin.
          </p>
        )}
      </section>

      {/* ── 2. Fields ─────────────────────────────────────────────────── */}
      {canCatalogWrite && (
        <section className={detailSectionClass}>
          <header className={cn(detailSectionHeadClass, "justify-between")}>
            <div className="flex items-center gap-2">
              <Pencil
                className="size-3 text-muted-foreground/70"
                aria-hidden
              />
              <span className={detailSectionLabelClass}>Fields</span>
            </div>
            <div className="flex items-center gap-3">
              {quickSaving && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" aria-hidden /> Saving
                </span>
              )}
              <button
                type="button"
                onClick={openQuickEditAll}
                className="text-[11px] font-medium text-primary transition-colors hover:text-primary/70"
              >
                Edit all
              </button>
            </div>
          </header>
          <div className="divide-y divide-border/40 bg-background/50">
            {/* Name */}
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
            {/* SKU */}
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
            {/* Barcode */}
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

            {/* Pack qty + Shelf price side by side */}
            {quickEdit === "bundleQty" ? (
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
            ) : quickEdit === "bundlePrice" ? (
              inlineEdit(
                "Shelf price",
                saveQuickBundlePrice,
                <input
                  autoFocus
                  className={productFormInputClass}
                  inputMode="decimal"
                  value={quickBundlePrice}
                  onChange={(e) => setQuickBundlePrice(e.target.value)}
                  placeholder="0.00"
                />,
              )
            ) : (
              <div className="grid grid-cols-2 divide-x divide-border/40">
                {fieldBtn(
                  "Pack qty",
                  detail.bundleQty != null ? String(detail.bundleQty) : "—",
                  "bundleQty",
                )}
                {fieldBtn(
                  "Shelf price",
                  formatAmount(sellPrice),
                  "bundlePrice",
                )}
              </div>
            )}

            {/* Cost + Min stock side by side */}
            {quickEdit === "buyingPrice" ? (
              inlineEdit(
                "Cost price",
                saveQuickBuyingPrice,
                <input
                  autoFocus
                  className={productFormInputClass}
                  inputMode="decimal"
                  value={quickBuyingPrice}
                  onChange={(e) => setQuickBuyingPrice(e.target.value)}
                  placeholder="0.00"
                />,
              )
            ) : quickEdit === "minStock" ? (
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
              <div className="grid grid-cols-2 divide-x divide-border/40">
                {fieldBtn(
                  "Cost price",
                  formatAmount(primaryCost),
                  "buyingPrice",
                )}
                {fieldBtn(
                  "Min stock",
                  formatAmount(toNumber(detail.minStockLevel)),
                  "minStock",
                )}
              </div>
            )}

            {/* Reorder */}
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
                      onChange={(e) => setQuickReorderLevel(e.target.value)}
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

            {canInventoryWrite ? (
              quickEdit === "stock" ? (
                <div
                  className={detailInlineEditClass}
                  onKeyDown={onInlineEnter(saveQuickStock)}
                >
                  <StockIncreaseFields
                    branches={branches}
                    branchId={quickStockBranchId}
                    onBranchIdChange={setQuickStockBranchId}
                    quantity={quickStock}
                    onQuantityChange={setQuickStock}
                    unitCost={quickStockUnitCost}
                    onUnitCostChange={setQuickStockUnitCost}
                    itemId={selectedId}
                    currentUnitCost={primaryCost}
                    className="border-0 p-0 shadow-none ring-0"
                    hint="Adds to on-hand at the selected branch."
                  />
                  <div className="mt-2 flex justify-end">
                    {saveCancelBtns(saveQuickStock)}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={detailFieldRowClass}
                  onClick={() => openQuickEdit("stock")}
                >
                  <div className="min-w-0">
                    <p className={detailFieldLabelClass}>On-hand stock</p>
                    <p className={detailFieldValueClass}>
                      {formatAmount(stockLevel)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Tap to add stock (qty + unit cost)
                    </p>
                  </div>
                  <PackagePlus
                    className="size-3 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-primary"
                    aria-hidden
                  />
                </button>
              )
            ) : (
              <div className={detailFieldRowClass}>
                <div className="min-w-0">
                  <p className={detailFieldLabelClass}>On-hand stock</p>
                  <p className={detailFieldValueClass}>
                    {formatAmount(stockLevel)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── 3. Suppliers ──────────────────────────────────────────────── */}
      {supplierLinks.length > 0 && (
        <section className={detailSectionClass}>
          <header className={cn(detailSectionHeadClass, "justify-between")}>
            <div className="flex items-center gap-2">
              <Building2
                className="size-3 text-muted-foreground/70"
                aria-hidden
              />
              <span className={detailSectionLabelClass}>Suppliers</span>
            </div>
            <button
              type="button"
              className="text-[11px] font-medium text-primary transition-colors hover:text-primary/70"
              onClick={() => setActiveDrawer("edit-product")}
            >
              Manage
            </button>
          </header>
          <div className="divide-y divide-border/40 bg-background/50">
            {supplierLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between gap-2 px-2.5 py-2"
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
        </section>
      )}

      {/* ── 4. Variants (child SKUs of parent) ─────────────────────────── */}
      <section className={detailSectionClass}>
        <header className={cn(detailSectionHeadClass, "justify-between")}>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Layers className="size-3 shrink-0 text-muted-foreground/70" aria-hidden />
              <span className={detailSectionLabelClass}>
                Variants{variantRows.length > 0 ? ` · ${variantRows.length}` : ""}
              </span>
            </div>
            {detail.variantOfItemId && variantParentDisplayName ? (
              <p className="pl-5 text-[10px] leading-snug text-muted-foreground">
                Same parent as{" "}
                <span className="font-medium text-foreground">{variantParentDisplayName}</span>
              </p>
            ) : !detail.variantOfItemId && variantRows.length > 0 ? (
              <p className="pl-5 text-[10px] leading-snug text-muted-foreground">
                Child SKUs for this parent. Add several at once from the drawer.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary transition-colors hover:text-primary/70"
            onClick={() => setActiveDrawer("add-variant")}
          >
            <PackagePlus className="size-3" aria-hidden /> Add variants
          </button>
        </header>
        {variantRows.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-2.5 py-4 text-center">
            <p className="max-w-[16rem] text-[11px] text-muted-foreground">
              No variants yet. Open the drawer to add one or many—each row becomes a variant SKU under
              this parent.
            </p>
            <button
              type="button"
              onClick={() => setActiveDrawer("add-variant")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <PackagePlus className="size-3" aria-hidden /> Add variants
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border/40 bg-background/50">
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
                      "flex cursor-pointer items-center gap-2 px-2.5 py-2 transition-colors",
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
                      <p className="truncate text-xs font-medium text-foreground">
                        {v.name}
                      </p>
                      {v.variantName && (
                        <p className="text-[11px] text-muted-foreground">
                          {v.variantName}
                        </p>
                      )}
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
      </section>
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
