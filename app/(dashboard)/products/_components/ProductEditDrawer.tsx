"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Camera,
  CircleDollarSign,
  FileText,
  Layers,
  Loader2,
  Package,
  PencilLine,
  Settings2,
  Trash2,
  Warehouse,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  FormDrawer,
  type FormDrawerProps,
} from "@/components/form-drawer";
import { cn } from "@/lib/utils";
import { postStockIncrease, type ItemSummaryRecord } from "@/lib/api";

import type { ProductDetailApi } from "../_hooks/useProductDetail";
import type { ProductMutationsApi } from "../_hooks/useProductMutations";
import {
  coverImageUrl,
  formatMutationError,
  toNumber,
  usesSharedPackageStock,
} from "../_utils";
import { ProductFormField } from "./ProductFormField";
import { ProductFormSectionToggle } from "./ProductFormSectionToggle";
import { StockIncreaseFields } from "./StockIncreaseFields";
import {
  productFormDrawerHeroClass,
  productFormDrawerStackClass,
  productFormGrid2Class,
  productFormInputClass,
  productFormInputMonoClass,
  productFormSectionBodyClass,
  productFormSelectClass,
  productFormTextareaClass,
  productFormToggleCardClass,
} from "./product-form-styles";

type Cat = { id: string; name: string; active: boolean };

type SectionKey =
  | "basics"
  | "package"
  | "pricing"
  | "inventory"
  | "visibility"
  | "media";

export function ProductEditDrawer({
  open,
  onClose,
  banner,
  detail,
  cats,
  m,
  headerBranchId,
  syncListRowFromDetail,
  refreshSelectedDetail,
  setMessage,
  onOpenPhotos,
}: {
  open: boolean;
  onClose: () => void;
  banner?: FormDrawerProps["banner"];
  detail: Pick<ProductDetailApi, "detail" | "patchDraft" | "setPatchDraft">;
  cats: Cat[];
  m: Pick<
    ProductMutationsApi,
    | "onPatchItem"
    | "onDeleteItem"
    | "pendingCatalogImage"
    | "setPendingCatalogImage"
    | "catalogImageUploadBusy"
    | "catalogImageAlt"
    | "setCatalogImageAlt"
    | "catalogImagePrimary"
    | "setCatalogImagePrimary"
    | "onUploadCatalogImage"
    | "branches"
  >;
  headerBranchId?: string;
  syncListRowFromDetail: (row: ItemSummaryRecord) => void;
  refreshSelectedDetail: ProductDetailApi["refreshSelectedDetail"];
  setMessage: (msg: string) => void;
  onOpenPhotos?: () => void;
}) {
  const d = detail.detail;
  const dr = detail.patchDraft;
  const sharedStock = d ? usesSharedPackageStock(d) : false;
  const isVariant = !!d?.variantOfItemId;

  const [stockQty, setStockQty] = useState("");
  const [stockBranchId, setStockBranchId] = useState("");
  const [stockUnitCost, setStockUnitCost] = useState("");
  const [stockSaving, setStockSaving] = useState(false);

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    basics: true,
    package: true,
    pricing: true,
    inventory: true,
    visibility: true,
    media: false,
  });

  const toggleSection = (key: SectionKey) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  useEffect(() => {
    if (!open || !d) return;
    setStockQty("");
    setStockBranchId(headerBranchId || m.branches[0]?.id || "");
    const cost =
      toNumber(d.buyingPrice) ?? toNumber(dr.buyingPriceStr) ?? null;
    setStockUnitCost(cost != null ? String(cost) : "");
    setOpenSections({
      basics: true,
      package: isVariant,
      pricing: true,
      inventory: !sharedStock,
      visibility: true,
      media: false,
    });
  }, [open, d?.id, d?.buyingPrice, headerBranchId, dr.buyingPriceStr, m.branches, isVariant, sharedStock]);

  useEffect(() => {
    if (!open || !d) return;
    detail.setPatchDraft((p) => ({ ...p, webPublished: true }));
  }, [open, d?.id, detail.setPatchDraft]);

  const heroTitle = useMemo(() => {
    if (!d) return "";
    return dr.name?.trim() || d.name?.trim() || "Product";
  }, [d, dr.name]);

  const handleStockIncrease = async (): Promise<boolean> => {
    if (!d) return false;
    if (d.isStocked === false) {
      setMessage(
        "This SKU is not stocked. Enable stock tracking or add quantity on a stocked variant.",
      );
      return false;
    }
    const qtyRaw = stockQty.trim();
    if (!qtyRaw) return true;
    const qty = Number(qtyRaw);
    if (!Number.isFinite(qty) || qty <= 0) {
      setMessage("Quantity must be a positive number.");
      return false;
    }
    const branchId = stockBranchId.trim();
    if (!branchId) {
      setMessage("Select a branch.");
      return false;
    }
    const costRaw = stockUnitCost.trim();
    const unitCost = costRaw === "" ? 0 : Number(costRaw);
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setMessage("Unit cost must be a valid non-negative number.");
      return false;
    }
    setStockSaving(true);
    setMessage("");
    try {
      await postStockIncrease({
        branchId,
        itemId: d.id,
        quantity: qty,
        unitCost,
      });
      const updated = await refreshSelectedDetail();
      if (updated) syncListRowFromDetail(updated);
      setStockQty("");
      setMessage("Stock increased.");
      return true;
    } catch (e) {
      setMessage(formatMutationError(e, "Stock adjustment failed."));
      return false;
    } finally {
      setStockSaving(false);
    }
  };

  const onEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stockQty.trim()) {
      const ok = await handleStockIncrease();
      if (!ok) return;
    }
    await m.onPatchItem(e);
  };

  const thumb = d ? coverImageUrl(d) : null;

  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      banner={banner}
      width="wide"
      title={heroTitle}
      description={
        d
          ? [d.sku, d.variantName?.trim()].filter(Boolean).join(" · ")
          : undefined
      }
      contextLabel={sharedStock ? "Package SKU" : isVariant ? "Variant" : "Product"}
      icon={
        sharedStock ? (
          <Boxes className="size-5 text-primary" aria-hidden />
        ) : isVariant ? (
          <Layers className="size-5 text-violet-600" aria-hidden />
        ) : (
          <PencilLine className="size-5 text-primary" aria-hidden />
        )
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => void m.onDeleteItem()}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Delete product
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-product-form"
              className="h-10 rounded-xl shadow-sm"
            >
              Save changes
            </Button>
          </div>
        </div>
      }
    >
      {d && (
        <form
          id="edit-product-form"
          className={productFormDrawerStackClass}
          onSubmit={(e) => void onEditSubmit(e)}
        >
          <div className={productFormDrawerHeroClass}>
            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted shadow-sm">
              {thumb ? (
                <Image src={thumb} alt="" fill className="object-cover" sizes="56px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="size-6 text-muted-foreground/40" aria-hidden />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {heroTitle}
              </p>
              <p className="font-mono text-xs text-muted-foreground">{d.sku}</p>
              <div className="flex flex-wrap gap-1">
                {sharedStock ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <Boxes className="size-2.5" aria-hidden />
                    Package
                  </span>
                ) : null}
                {isVariant && !sharedStock ? (
                  <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-200">
                    Variant
                  </span>
                ) : null}
                {d.active === false ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Inactive
                  </span>
                ) : null}
              </div>
            </div>
            {onOpenPhotos ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-1 rounded-lg text-xs"
                onClick={onOpenPhotos}
              >
                <Camera className="size-3.5" aria-hidden />
                Photos
              </Button>
            ) : null}
          </div>

          <ProductFormSectionToggle
            icon={FileText}
            label="Basics"
            hint="Name, codes, category, description"
            expanded={openSections.basics}
            onToggle={() => toggleSection("basics")}
          />
          {openSections.basics ? (
            <div className={productFormSectionBodyClass}>
              <ProductFormField
                label={isVariant ? "Display name" : "Product name"}
                required
              >
                <input
                  className={productFormInputClass}
                  value={dr.name ?? ""}
                  onChange={(e) =>
                    detail.setPatchDraft((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </ProductFormField>
              <div className={productFormGrid2Class}>
                <ProductFormField label="SKU" required>
                  <input
                    className={productFormInputMonoClass}
                    value={dr.sku ?? ""}
                    onChange={(e) =>
                      detail.setPatchDraft((p) => ({ ...p, sku: e.target.value }))
                    }
                  />
                </ProductFormField>
                <ProductFormField label="Barcode">
                  <input
                    className={productFormInputMonoClass}
                    value={dr.barcode ?? ""}
                    onChange={(e) =>
                      detail.setPatchDraft((p) => ({
                        ...p,
                        barcode: e.target.value,
                      }))
                    }
                  />
                </ProductFormField>
              </div>
              <ProductFormField label="Category">
                <select
                  className={productFormSelectClass}
                  value={dr.categoryId}
                  onChange={(e) =>
                    detail.setPatchDraft((p) => ({
                      ...p,
                      categoryId: e.target.value,
                    }))
                  }
                >
                  <option value="">— None —</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {!c.active ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </ProductFormField>
              <ProductFormField label="Description">
                <textarea
                  className={productFormTextareaClass}
                  rows={3}
                  value={dr.description ?? ""}
                  onChange={(e) =>
                    detail.setPatchDraft((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                />
              </ProductFormField>
            </div>
          ) : null}

          {isVariant ? (
            <>
              <ProductFormSectionToggle
                icon={Boxes}
                label="Package & variant"
                hint="How this SKU sells and deducts stock"
                expanded={openSections.package}
                onToggle={() => toggleSection("package")}
                badge={
                  (dr.packageVariant ?? d.packageVariant) ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Package mode
                    </span>
                  ) : null
                }
              />
              {openSections.package ? (
                <div className={productFormSectionBodyClass}>
                  <ProductFormField
                    label={
                      dr.packageVariant ?? d.packageVariant
                        ? "Package name"
                        : "Variant label"
                    }
                    required
                  >
                    <input
                      className={productFormInputClass}
                      value={dr.variantName ?? ""}
                      onChange={(e) =>
                        detail.setPatchDraft((p) => ({
                          ...p,
                          variantName: e.target.value,
                        }))
                      }
                    />
                  </ProductFormField>
                  <ProductFormField
                    label="Base units per sale"
                    required={dr.packageVariant ?? d.packageVariant}
                    hint="Units deducted from parent stock per sale (e.g. 1 each, 30 tray)"
                  >
                    <input
                      className={productFormInputClass}
                      inputMode="numeric"
                      placeholder={d.packageVariant ? "30" : "1"}
                      value={dr.packagingUnitQtyStr}
                      onChange={(e) =>
                        detail.setPatchDraft((p) => ({
                          ...p,
                          packagingUnitQtyStr: e.target.value,
                        }))
                      }
                    />
                  </ProductFormField>
                  <label className={productFormToggleCardClass}>
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 rounded border-input"
                      checked={dr.packageVariant ?? d.packageVariant}
                      onChange={(e) =>
                        detail.setPatchDraft((p) => ({
                          ...p,
                          packageVariant: e.target.checked,
                        }))
                      }
                    />
                    <span className="min-w-0 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Sell as package
                      </span>{" "}
                      — stock stays on the parent; each sale uses the units above.
                    </span>
                  </label>
                </div>
              ) : null}
            </>
          ) : null}

          <ProductFormSectionToggle
            icon={CircleDollarSign}
            label="Pricing"
            hint="Shelf price, pack size, cost"
            expanded={openSections.pricing}
            onToggle={() => toggleSection("pricing")}
          />
          {openSections.pricing ? (
            <div className={productFormSectionBodyClass}>
              <div className={productFormGrid2Class}>
                <ProductFormField label="Shelf price">
                  <input
                    className={productFormInputClass}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={dr.bundlePriceStr}
                    onChange={(e) =>
                      detail.setPatchDraft((p) => ({
                        ...p,
                        bundlePriceStr: e.target.value,
                      }))
                    }
                  />
                </ProductFormField>
                {!sharedStock ? (
                  <ProductFormField label="Pack qty" hint="Units per sell line">
                    <input
                      className={productFormInputClass}
                      inputMode="numeric"
                      placeholder="1"
                      value={dr.bundleQtyStr}
                      onChange={(e) =>
                        detail.setPatchDraft((p) => ({
                          ...p,
                          bundleQtyStr: e.target.value,
                        }))
                      }
                    />
                  </ProductFormField>
                ) : null}
                <ProductFormField label="Cost price">
                  <input
                    className={productFormInputClass}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={dr.buyingPriceStr}
                    onChange={(e) =>
                      detail.setPatchDraft((p) => ({
                        ...p,
                        buyingPriceStr: e.target.value,
                      }))
                    }
                  />
                </ProductFormField>
              </div>
            </div>
          ) : null}

          <ProductFormSectionToggle
            icon={Warehouse}
            label="Inventory"
            hint={
              sharedStock
                ? "Stock lives on the base product"
                : "Alerts and stock adjustments"
            }
            expanded={openSections.inventory}
            onToggle={() => toggleSection("inventory")}
          />
          {openSections.inventory ? (
            <div className={productFormSectionBodyClass}>
              {sharedStock ? (
                <p className="rounded-lg border border-primary/20 bg-primary/[0.05] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  Quantity is tracked on the{" "}
                  <span className="font-medium text-foreground">parent product</span>.
                  Each sale deducts{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {dr.packagingUnitQtyStr || "—"}
                  </span>{" "}
                  base units. Use the detail panel or base SKU to adjust on-hand stock.
                </p>
              ) : (
                <>
                  <div className={productFormGrid2Class}>
                    <ProductFormField label="Min stock">
                      <input
                        className={productFormInputClass}
                        inputMode="decimal"
                        placeholder="0"
                        value={dr.minStockLevelStr}
                        onChange={(e) =>
                          detail.setPatchDraft((p) => ({
                            ...p,
                            minStockLevelStr: e.target.value,
                          }))
                        }
                      />
                    </ProductFormField>
                    <ProductFormField label="Reorder at">
                      <input
                        className={productFormInputClass}
                        inputMode="decimal"
                        placeholder="0"
                        value={dr.reorderLevelStr}
                        onChange={(e) =>
                          detail.setPatchDraft((p) => ({
                            ...p,
                            reorderLevelStr: e.target.value,
                          }))
                        }
                      />
                    </ProductFormField>
                    <ProductFormField label="Reorder qty">
                      <input
                        className={productFormInputClass}
                        inputMode="decimal"
                        placeholder="0"
                        value={dr.reorderQtyStr}
                        onChange={(e) =>
                          detail.setPatchDraft((p) => ({
                            ...p,
                            reorderQtyStr: e.target.value,
                          }))
                        }
                      />
                    </ProductFormField>
                  </div>
                  {d.isStocked === false ? (
                    <p className="text-[11px] text-amber-800 dark:text-amber-200">
                      Stock tracking is off for this SKU — enable it before adding
                      quantity.
                    </p>
                  ) : null}
                  <StockIncreaseFields
                    className="border-0 bg-transparent p-0 ring-0"
                    branches={m.branches}
                    branchId={stockBranchId}
                    onBranchIdChange={setStockBranchId}
                    quantity={stockQty}
                    onQuantityChange={setStockQty}
                    unitCost={stockUnitCost}
                    onUnitCostChange={setStockUnitCost}
                    itemId={d.id}
                    currentUnitCost={
                      toNumber(d.buyingPrice) ?? toNumber(dr.buyingPriceStr)
                    }
                    hint="Optional — applied when you save if qty is filled."
                    minimal
                  />
                  {stockQty.trim() ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-9 w-full rounded-lg text-xs sm:w-auto"
                      disabled={stockSaving}
                      onClick={() => void handleStockIncrease()}
                    >
                      {stockSaving ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : null}
                      {stockSaving ? "Adding stock…" : "Add stock now"}
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          <ProductFormSectionToggle
            icon={Settings2}
            label="Visibility"
            hint="POS and online shop"
            expanded={openSections.visibility}
            onToggle={() => toggleSection("visibility")}
          />
          {openSections.visibility ? (
            <div className={cn(productFormSectionBodyClass, "space-y-2")}>
              <label className={productFormToggleCardClass}>
                <input
                  type="checkbox"
                  className="size-4 shrink-0 rounded border-input"
                  checked={dr.active ?? true}
                  onChange={(e) =>
                    detail.setPatchDraft((p) => ({
                      ...p,
                      active: e.target.checked,
                    }))
                  }
                />
                <span className="text-sm font-medium text-foreground">Active</span>
                <span className="block text-[11px] text-muted-foreground">
                  Inactive SKUs are hidden from sale flows.
                </span>
              </label>
              <label className={productFormToggleCardClass}>
                <input
                  type="checkbox"
                  className="size-4 shrink-0 rounded border-input"
                  checked={dr.webPublished ?? true}
                  onChange={(e) =>
                    detail.setPatchDraft((p) => ({
                      ...p,
                      webPublished: e.target.checked,
                    }))
                  }
                />
                <span className="text-sm font-medium text-foreground">
                  Show on online shop
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Listed on your public storefront when published.
                </span>
              </label>
            </div>
          ) : null}

          <ProductFormSectionToggle
            icon={Camera}
            label="Cover image"
            hint="Quick upload — full gallery in Photo studio"
            expanded={openSections.media}
            onToggle={() => toggleSection("media")}
          />
          {openSections.media ? (
            <div className={productFormSectionBodyClass}>
              {onOpenPhotos ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mb-3 h-9 w-full gap-2 rounded-lg text-xs sm:w-auto"
                  onClick={onOpenPhotos}
                >
                  <Camera className="size-3.5" aria-hidden />
                  Open photo studio
                </Button>
              ) : null}
              <input
                type="file"
                accept="image/*"
                className="w-full text-xs file:mr-2 file:rounded-lg file:border file:bg-background file:px-3 file:py-1.5"
                onChange={(e) =>
                  m.setPendingCatalogImage(e.target.files?.[0] ?? null)
                }
              />
              <ProductFormField label="Alt text">
                <input
                  className={productFormInputClass}
                  placeholder="Optional"
                  value={m.catalogImageAlt}
                  onChange={(e) => m.setCatalogImageAlt(e.target.value)}
                />
              </ProductFormField>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={m.catalogImagePrimary}
                  onChange={(e) => m.setCatalogImagePrimary(e.target.checked)}
                />
                Set as cover image
              </label>
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-lg text-xs"
                disabled={m.catalogImageUploadBusy || !m.pendingCatalogImage}
                onClick={() =>
                  void m.onUploadCatalogImage(new Event("submit") as never)
                }
              >
                {m.catalogImageUploadBusy ? "Uploading…" : "Upload cover"}
              </Button>
            </div>
          ) : null}
        </form>
      )}
    </FormDrawer>
  );
}
