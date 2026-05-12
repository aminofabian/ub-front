"use client";

import Image from "next/image";
import { Fragment } from "react";
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
  formatAmount,
  toNumber,
} from "../_utils";
import {
  sectionCls,
  sectionHeadCls,
  sectionLabelCls,
  fieldRowCls,
  fieldLabelCls,
  fieldValueCls,
  inlineEditCls,
  quickInputClass,
} from "../_types";

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
  canLinkSupplier: boolean;
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

  const saveCancelBtns = (onSave: () => void) => (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        className="h-7 gap-1 rounded-lg text-xs"
        disabled={quickSaving}
        onClick={onSave}
      >
        <Save />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 rounded-lg text-xs"
        disabled={quickSaving}
        onClick={cancelQuickEdit}
      >
        Cancel
      </Button>
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
      className={fieldRowCls}
      onClick={() => openQuickEdit(key)}
    >
      <div className="min-w-0">
        <p className={fieldLabelCls}>{label}</p>
        <p
          className={cn(
            fieldValueCls,
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

  return (
    <div className="space-y-3">
      {/* ── 0. Identity strip ──────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm">
          {coverImageUrl(detail) ? (
            <Image
              src={coverImageUrl(detail)!}
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
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap gap-1">
            {detail.variantOfItemId ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                <Layers className="size-2.5" aria-hidden /> Option
              </span>
            ) : variantRows.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                <Package className="size-2.5" aria-hidden /> Group ·{" "}
                {variantRows.length}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                <Package className="size-2.5" aria-hidden /> Standalone
              </span>
            )}
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
          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
            {detail.sku && <span className="font-mono">{detail.sku}</span>}
            {detail.barcode && (
              <span className="font-mono opacity-60">{detail.barcode}</span>
            )}
            {detail.brand && (
              <span className="rounded-full border border-border/40 bg-muted/40 px-1.5 py-0 text-[10px]">{detail.brand}</span>
            )}
            {detail.size && (
              <span className="rounded-full border border-border/40 bg-muted/40 px-1.5 py-0 text-[10px]">{detail.size}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveDrawer("edit-product")}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 text-[11px] font-medium text-foreground shadow-sm transition-colors hover:bg-muted/60"
          >
            <PencilLine className="size-3" aria-hidden /> Edit
          </button>
          <button
            type="button"
            onClick={() => setActiveDrawer("photos")}
            className="flex size-7 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted/60"
            aria-label="Photos"
          >
            <Camera className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setActiveDrawer("add-variant")}
            className="flex size-7 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted/60"
            aria-label="Add option SKU"
          >
            <Layers className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Variant context notice */}
      {detail.variantOfItemId && (
        <div className="flex items-start gap-2 rounded-lg border border-violet-500/20 bg-violet-500/[0.04] px-3 py-2 text-[11px] leading-snug text-violet-800 dark:text-violet-200">
          <Layers
            className="mt-0.5 size-3 shrink-0 text-violet-500"
            aria-hidden
          />
          <span>
            Option of{" "}
            {variantParentDisplayName ? (
              <strong className="font-semibold">
                {variantParentDisplayName}
              </strong>
            ) : (
              "this group"
            )}
            . Tap another row to switch options.
          </span>
        </div>
      )}

      {/* ── 1. Pricing ────────────────────────────────────────────────── */}
      <section className={sectionCls}>
        <header className={sectionHeadCls}>
          <CircleDollarSign
            className="size-3.5 text-muted-foreground/70"
            aria-hidden
          />
          <span className={sectionLabelCls}>Pricing</span>
        </header>
        <div className="grid grid-cols-4 divide-x divide-border/40 bg-background/50">
          {(
            [
              ["Shelf", formatAmount(sellPrice), "font-bold"],
              ["Cost", formatAmount(primaryCost), "font-semibold"],
              [
                "Margin",
                marginPct != null ? `${marginPct.toFixed(1)}%` : "—",
                marginPct != null && marginPct > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "",
              ],
              [
                "Stock",
                formatAmount(toNumber(detail.currentStock)),
                toNumber(detail.currentStock) != null &&
                toNumber(detail.currentStock)! <=
                  (toNumber(detail.minStockLevel) ?? 0)
                  ? "text-destructive font-semibold"
                  : "font-semibold",
              ],
            ] as const
          ).map(([label, value, cls]) => (
            <div key={label} className="px-3 py-2.5">
              <p className={fieldLabelCls}>{label}</p>
              <p
                className={cn(
                  "mt-0.5 text-sm tabular-nums text-foreground",
                  cls,
                )}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
        {supplierLinks.length === 0 && (
          <p className="border-t border-border/40 px-3 py-2 text-[11px] text-muted-foreground">
            Link a supplier to see cost &amp; margin.
          </p>
        )}
      </section>

      {/* ── 2. Fields ─────────────────────────────────────────────────── */}
      {canCatalogWrite && (
        <section className={sectionCls}>
          <header className={cn(sectionHeadCls, "justify-between")}>
            <div className="flex items-center gap-2">
              <Pencil
                className="size-3.5 text-muted-foreground/70"
                aria-hidden
              />
              <span className={sectionLabelCls}>Fields</span>
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
              <div className={inlineEditCls}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                  Display name
                </span>
                <input
                  autoFocus
                  className={quickInputClass}
                  value={quickProductName}
                  onChange={(e) => setQuickProductName(e.target.value)}
                  placeholder="Customer-facing title"
                />
                {saveCancelBtns(saveQuickProductName)}
              </div>
            ) : (
              fieldBtn("Name", detail.name, "productName")
            )}
            {/* SKU */}
            {quickEdit === "sku" ? (
              <div className={inlineEditCls}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                  SKU
                </span>
                <input
                  autoFocus
                  className={cn(quickInputClass, "font-mono")}
                  value={quickSku}
                  onChange={(e) => setQuickSku(e.target.value)}
                  placeholder="SKU-001"
                />
                {saveCancelBtns(saveQuickSku)}
              </div>
            ) : (
              fieldBtn("SKU", detail.sku, "sku", true)
            )}
            {/* Barcode */}
            {quickEdit === "barcode" ? (
              <div className={inlineEditCls}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                  Barcode
                </span>
                <input
                  autoFocus
                  className={cn(quickInputClass, "font-mono")}
                  value={quickBarcode}
                  onChange={(e) => setQuickBarcode(e.target.value)}
                  placeholder="Scan or type…"
                />
                {saveCancelBtns(() => void saveQuickBarcode())}
              </div>
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
              <div className={cn(inlineEditCls)}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                  Pack qty
                </span>
                <input
                  autoFocus
                  className={quickInputClass}
                  inputMode="numeric"
                  value={quickBundleQty}
                  onChange={(e) => setQuickBundleQty(e.target.value)}
                  placeholder="e.g. 6"
                />
                {saveCancelBtns(saveQuickBundleQty)}
              </div>
            ) : quickEdit === "bundlePrice" ? (
              <div className={cn(inlineEditCls)}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                  Shelf price
                </span>
                <input
                  autoFocus
                  className={quickInputClass}
                  inputMode="decimal"
                  value={quickBundlePrice}
                  onChange={(e) => setQuickBundlePrice(e.target.value)}
                  placeholder="0.00"
                />
                {saveCancelBtns(saveQuickBundlePrice)}
              </div>
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
              <div className={cn(inlineEditCls)}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                  Cost price
                </span>
                <input
                  autoFocus
                  className={quickInputClass}
                  inputMode="decimal"
                  value={quickBuyingPrice}
                  onChange={(e) => setQuickBuyingPrice(e.target.value)}
                  placeholder="0.00"
                />
                {saveCancelBtns(saveQuickBuyingPrice)}
              </div>
            ) : quickEdit === "minStock" ? (
              <div className={cn(inlineEditCls)}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                  Min stock
                </span>
                <input
                  autoFocus
                  className={quickInputClass}
                  inputMode="decimal"
                  value={quickMinStock}
                  onChange={(e) => setQuickMinStock(e.target.value)}
                  placeholder="e.g. 5"
                />
                {saveCancelBtns(saveQuickMinStock)}
              </div>
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
              <div className={inlineEditCls}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                  Reorder
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    At level
                    <input
                      autoFocus
                      className={quickInputClass}
                      inputMode="decimal"
                      value={quickReorderLevel}
                      onChange={(e) => setQuickReorderLevel(e.target.value)}
                      placeholder="e.g. 10"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    Order qty
                    <input
                      className={quickInputClass}
                      inputMode="decimal"
                      value={quickReorderQty}
                      onChange={(e) => setQuickReorderQty(e.target.value)}
                      placeholder="e.g. 50"
                    />
                  </label>
                </div>
                {saveCancelBtns(saveQuickReorder)}
              </div>
            ) : (
              <button
                type="button"
                className={fieldRowCls}
                onClick={() => openQuickEdit("reorder")}
              >
                <div className="min-w-0">
                  <p className={fieldLabelCls}>Reorder</p>
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

            {/* Stock qty */}
            {quickEdit === "stock" ? (
              <div className={inlineEditCls}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                  Stock qty
                </span>
                <input
                  autoFocus
                  className={quickInputClass}
                  inputMode="decimal"
                  value={quickStock}
                  onChange={(e) => setQuickStock(e.target.value)}
                  placeholder="Current on‑hand"
                />
                {saveCancelBtns(saveQuickStock)}
              </div>
            ) : (
              fieldBtn(
                "Stock qty",
                formatAmount(toNumber(detail.currentStock)),
                "stock",
              )
            )}
          </div>
        </section>
      )}

      {/* ── 3. Suppliers ──────────────────────────────────────────────── */}
      {supplierLinks.length > 0 && (
        <section className={sectionCls}>
          <header className={cn(sectionHeadCls, "justify-between")}>
            <div className="flex items-center gap-2">
              <Building2
                className="size-3.5 text-muted-foreground/70"
                aria-hidden
              />
              <span className={sectionLabelCls}>Suppliers</span>
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
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-foreground">
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
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">
                  {formatAmount(
                    effectiveSupplierUnitCost(link, undefined),
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 4. Options / Variants ─────────────────────────────────────── */}
      <section className={sectionCls}>
        <header className={cn(sectionHeadCls, "justify-between")}>
          <div className="flex items-center gap-2">
            <Layers className="size-3.5 text-muted-foreground/70" aria-hidden />
            <span className={sectionLabelCls}>
              Options{variantRows.length > 0 ? ` · ${variantRows.length}` : ""}
            </span>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] font-medium text-primary transition-colors hover:text-primary/70"
            onClick={() => setActiveDrawer("add-variant")}
          >
            <PackagePlus className="size-3" aria-hidden /> Add
          </button>
        </header>
        {variantRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
            <p className="text-[11px] text-muted-foreground">No variants yet.</p>
            <button
              type="button"
              onClick={() => setActiveDrawer("add-variant")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <PackagePlus className="size-3" aria-hidden /> Add first variant
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
                      "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/25",
                      vSelected && "bg-primary/[0.06]",
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
                    <div className="relative size-8 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
                      {vThumb ? (
                        <Image
                          src={vThumb}
                          alt=""
                          width={32}
                          height={32}
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
                      <p className="truncate text-sm font-medium text-foreground">
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
                        Option label and SKU are set at creation — adjust from{" "}
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
    </div>
  );
}
