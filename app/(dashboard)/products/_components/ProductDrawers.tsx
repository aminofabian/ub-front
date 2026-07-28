"use client";

import Image from "next/image";
import {
  Camera,
  CircleDollarSign,
  Layers,
  Loader2,
  Package,
  PencilLine,
  Save,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FormDrawer,
  FormDrawerFields,
  FormDrawerSheet,
  type FormDrawerProps,
} from "@/components/form-drawer";
import { cn } from "@/lib/utils";
import { ProductFormField } from "./ProductFormField";
import {
  productFormGrid2Class,
  productFormGrid3Class,
  productFormInputClass,
  productFormInputMonoClass,
  productFormSectionClass,
  productFormSectionTitleClass,
  productFormSelectClass,
  productFormTextareaClass,
} from "./product-form-styles";
import type { ProductDetailApi } from "../_hooks/useProductDetail";
import type { QuickEditApi } from "../_hooks/useQuickEdit";
import type { ProductMutationsApi } from "../_hooks/useProductMutations";
import { ProductDetailPanel } from "./ProductDetailPanel";
import {
  coverImageUrl,
  galleryImageUrl,
  packageUnitsPerSaleFromRow,
  toNumber,
  usesSharedPackageStock,
} from "../_utils";
import { useEffect, useState, type ComponentProps } from "react";

export { ProductEditDrawer } from "./ProductEditDrawer";

// ─── Photos drawer ───────────────────────────────────────────────────────────

export function ProductPhotosDrawer({
  open,
  onClose,
  banner,
  detail,
  m,
}: {
  open: boolean;
  onClose: () => void;
  banner?: FormDrawerProps["banner"];
  detail: Pick<ProductDetailApi, "detail" | "sortedImages">;
  m: Pick<
    ProductMutationsApi,
    | "pendingCatalogImage"
    | "setPendingCatalogImage"
    | "catalogImageUploadBusy"
    | "catalogImageAlt"
    | "setCatalogImageAlt"
    | "catalogImagePrimary"
    | "setCatalogImagePrimary"
    | "onUploadCatalogImage"
    | "onRemoveGalleryImage"
  >;
}) {
  const d = detail.detail!;
  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      banner={banner}
      title="Photo studio"
      contextLabel="Media"
      appearance="sharp"
      headerDensity="compact"
      icon={<Camera className="size-3.5 text-primary" />}
    >
      {d && (
        <div className="space-y-3">
          <div className="space-y-3 rounded-none border border-border bg-muted/15 p-3 shadow-none">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Live cover
            </p>
            {coverImageUrl(d) ? (
              <div
                className="relative mx-auto h-44 w-full max-w-sm overflow-hidden rounded-none border border-border shadow-none"
              >
                <Image
                  src={coverImageUrl(d)!}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="320px"
                  priority
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No hero image yet.
              </p>
            )}
          </div>
          <form
            className="space-y-3 rounded-none border border-dashed border-border bg-muted/10 p-3 shadow-none"
            onSubmit={(e) => {
              e.preventDefault();
              void m.onUploadCatalogImage(e as never);
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Upload
            </p>
            <input
              type="file"
              accept="image/*"
              className="max-w-full text-xs file:mr-2 file:rounded-md file:border file:bg-background file:px-2 file:py-1"
              onChange={(e) =>
                m.setPendingCatalogImage(e.target.files?.[0] ?? null)
              }
            />
            <input
              className={productFormInputClass}
              placeholder="Alt text"
              value={m.catalogImageAlt}
              onChange={(e) => m.setCatalogImageAlt(e.target.value)}
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                className="size-3.5 rounded-none"
                checked={m.catalogImagePrimary}
                onChange={(e) => m.setCatalogImagePrimary(e.target.checked)}
              />{" "}
              Set as cover
            </label>
            <Button
              type="submit"
              size="sm"
              disabled={m.catalogImageUploadBusy || !m.pendingCatalogImage}
            >
              {m.catalogImageUploadBusy ? "Uploading…" : "Upload"}
            </Button>
          </form>
          {detail.sortedImages.map((img) => (
            <figure
              key={img.id}
              className="relative overflow-hidden rounded-none border border-border bg-background p-2 shadow-none"
              style={{
                borderColor: `${img.predominantColorHex?.trim() ?? "#818cf8"}66`,
              }}
            >
              {galleryImageUrl(img) ? (
                <div className="relative aspect-square w-full overflow-hidden rounded-none bg-muted">
                  <Image
                    src={galleryImageUrl(img)!}
                    alt={img.altText ?? ""}
                    fill
                    className="object-cover"
                    sizes="180px"
                  />
                </div>
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-none bg-muted text-[10px]">
                  No preview
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute bottom-2 right-2 h-7 text-xs text-destructive"
                onClick={() => {
                  void m.onRemoveGalleryImage(img.id);
                }}
              >
                Remove
              </Button>
            </figure>
          ))}
        </div>
      )}
    </FormDrawer>
  );
}

// ─── Quick Edit All drawer ───────────────────────────────────────────────────

export function ProductQuickEditAllDrawer({
  open,
  onClose,
  banner,
  detail,
  quick,
}: {
  open: boolean;
  onClose: () => void;
  banner?: FormDrawerProps["banner"];
  detail: Pick<ProductDetailApi, "detail">;
  quick: Pick<
    QuickEditApi,
    | "qeaName"
    | "setQeaName"
    | "qeaSku"
    | "setQeaSku"
    | "qeaBarcode"
    | "setQeaBarcode"
    | "qeaBundleQty"
    | "setQeaBundleQty"
    | "qeaBundlePrice"
    | "setQeaBundlePrice"
    | "qeaBuyingPrice"
    | "setQeaBuyingPrice"
    | "qeaMinStock"
    | "setQeaMinStock"
    | "qeaReorderLevel"
    | "setQeaReorderLevel"
    | "qeaReorderQty"
    | "setQeaReorderQty"
    | "qeaDescription"
    | "setQeaDescription"
    | "qeaSaving"
    | "saveQuickEditAll"
  >;
}) {
  const sharedStock = usesSharedPackageStock(detail.detail);
  const unitsPerPackage = packageUnitsPerSaleFromRow(detail.detail);

  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      banner={banner}
      title={detail.detail?.name ?? "Edit product"}
      description={
        sharedStock
          ? "Package line · pricing only (stock is on the base product)"
          : detail.detail?.variantName
            ? `Variant · ${detail.detail.variantName}`
            : "Edit all fields"
      }
      contextLabel="Quick edit"
      appearance="sharp"
      headerDensity="compact"
      icon={<PencilLine className="size-3.5 text-primary" />}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={quick.qeaSaving}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="quick-edit-all-form"
            disabled={quick.qeaSaving}
            className="gap-1.5 shadow-none"
          >
            {quick.qeaSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {quick.qeaSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      <form
        id="quick-edit-all-form"
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void quick.saveQuickEditAll();
        }}
      >
        <FormDrawerSheet>
        <FormDrawerFields legend="Identity" appearance="sharp" embedded index={1}>
          <F label="Display name" required>
            <input
              className={productFormInputClass}
              value={quick.qeaName}
              onChange={(e) => quick.setQeaName(e.target.value)}
              required
            />
          </F>
          <div className={productFormGrid2Class}>
            <F label="SKU" required>
              <input
                className={productFormInputMonoClass}
                value={quick.qeaSku}
                onChange={(e) => quick.setQeaSku(e.target.value)}
                required
              />
            </F>
            <F label="Barcode">
              <input
                className={productFormInputMonoClass}
                value={quick.qeaBarcode}
                onChange={(e) => quick.setQeaBarcode(e.target.value)}
              />
            </F>
          </div>
        </FormDrawerFields>
        {sharedStock ? (
          <p className="border-t border-border bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
            Stock, min level, and reorder live on the base product. Change{" "}
            <span className="font-medium text-foreground">units per package</span>{" "}
            in the full product editor (Package section).
          </p>
        ) : null}
        <FormDrawerFields legend="Pricing" appearance="sharp" embedded index={2}>
          {sharedStock ? (
            <div className={productFormGrid3Class}>
              <F label="Units per package">
                <input
                  className={productFormInputClass}
                  readOnly
                  disabled
                  value={
                    unitsPerPackage != null ? String(unitsPerPackage) : "—"
                  }
                />
              </F>
              <F label="Shelf price">
                <input
                  className={productFormInputClass}
                  inputMode="decimal"
                  value={quick.qeaBundlePrice}
                  onChange={(e) => quick.setQeaBundlePrice(e.target.value)}
                />
              </F>
              <F label="Cost">
                <input
                  className={productFormInputClass}
                  inputMode="decimal"
                  value={quick.qeaBuyingPrice}
                  onChange={(e) => quick.setQeaBuyingPrice(e.target.value)}
                />
              </F>
            </div>
          ) : (
            <div className={productFormGrid3Class}>
              <F label="Shelf price">
                <input
                  className={productFormInputClass}
                  inputMode="decimal"
                  value={quick.qeaBundlePrice}
                  onChange={(e) => quick.setQeaBundlePrice(e.target.value)}
                />
              </F>
              <F label="Cost">
                <input
                  className={productFormInputClass}
                  inputMode="decimal"
                  value={quick.qeaBuyingPrice}
                  onChange={(e) => quick.setQeaBuyingPrice(e.target.value)}
                />
              </F>
              <F label="Pack qty">
                <input
                  className={productFormInputClass}
                  inputMode="numeric"
                  value={quick.qeaBundleQty}
                  onChange={(e) => quick.setQeaBundleQty(e.target.value)}
                />
              </F>
            </div>
          )}
        </FormDrawerFields>
        {!sharedStock ? (
          <FormDrawerFields legend="Stock" appearance="sharp" embedded index={3}>
            <div className={productFormGrid3Class}>
              <F label="Min stock">
                <input
                  className={productFormInputClass}
                  inputMode="decimal"
                  value={quick.qeaMinStock}
                  onChange={(e) => quick.setQeaMinStock(e.target.value)}
                />
              </F>
              <F label="Reorder at">
                <input
                  className={productFormInputClass}
                  inputMode="decimal"
                  value={quick.qeaReorderLevel}
                  onChange={(e) => quick.setQeaReorderLevel(e.target.value)}
                />
              </F>
              <F label="Order qty">
                <input
                  className={productFormInputClass}
                  inputMode="decimal"
                  value={quick.qeaReorderQty}
                  onChange={(e) => quick.setQeaReorderQty(e.target.value)}
                />
              </F>
            </div>
          </FormDrawerFields>
        ) : null}
        <FormDrawerFields legend="Description" appearance="sharp" embedded index={4}>
          <F label="Notes">
            <textarea
              className={productFormTextareaClass}
              value={quick.qeaDescription}
              onChange={(e) => quick.setQeaDescription(e.target.value)}
            />
          </F>
        </FormDrawerFields>
        </FormDrawerSheet>
      </form>
    </FormDrawer>
  );
}

function F({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <ProductFormField label={label} required={required}>
      {children}
    </ProductFormField>
  );
}

// ─── Mobile detail drawer ────────────────────────────────────────────────────

export function ProductMobileDetailDrawer({
  open,
  onClose,
  banner,
  detail,
  detailPanelProps,
}: {
  open: boolean;
  onClose: () => void;
  banner?: FormDrawerProps["banner"];
  detail: Pick<ProductDetailApi, "detail">;
  detailPanelProps: ComponentProps<typeof ProductDetailPanel>;
}) {
  const d = detail.detail;
  const canEdit = detailPanelProps.canCatalogWrite;
  const canStock = detailPanelProps.canInventoryWrite;
  const sharedStock = !!d && usesSharedPackageStock(d);

  const focusCommerce = () => {
    requestAnimationFrame(() => {
      document
        .getElementById("product-commerce")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const dockBtn = cn(
    "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 border border-border bg-background",
    "text-[10px] font-semibold uppercase tracking-wide text-foreground",
    "active:bg-muted/70 disabled:opacity-40",
  );

  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      banner={banner}
      title={d?.name ?? "Product"}
      description={
        d?.variantName?.trim() ||
        (d?.sku ? `SKU ${d.sku}` : "Tap Price or Stock to update")
      }
      contextLabel={d?.variantOfItemId ? "Variant" : "Product"}
      width="full"
      appearance="sharp"
      headerDensity="compact"
      footer={
        d ? (
          <div className="grid grid-cols-4 gap-1.5 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]">
            <button
              type="button"
              className={dockBtn}
              disabled={!canEdit}
              onClick={() => {
                detailPanelProps.openQuickEdit("bundlePrice");
                focusCommerce();
              }}
            >
              <CircleDollarSign className="size-4" aria-hidden />
              Price
            </button>
            <button
              type="button"
              className={dockBtn}
              disabled={
                sharedStock
                  ? !canStock || !detailPanelProps.onOpenBaseStock
                  : !canStock
              }
              onClick={() => {
                if (sharedStock && detailPanelProps.onOpenBaseStock) {
                  detailPanelProps.onOpenBaseStock();
                  return;
                }
                detailPanelProps.openQuickEdit("stock");
                focusCommerce();
              }}
            >
              <Package className="size-4" aria-hidden />
              Stock
            </button>
            <button
              type="button"
              className={dockBtn}
              disabled={!canEdit}
              onClick={() => detailPanelProps.setActiveDrawer("edit-product")}
            >
              <PencilLine className="size-4" aria-hidden />
              Edit
            </button>
            <button
              type="button"
              className={dockBtn}
              disabled={!canEdit}
              onClick={() => detailPanelProps.setActiveDrawer("photos")}
            >
              <Camera className="size-4" aria-hidden />
              Photo
            </button>
          </div>
        ) : undefined
      }
    >
      {d ? (
        <ProductDetailPanel
          {...detailPanelProps}
          showMobileStickyActions={false}
          mobileAppLayout
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      )}
    </FormDrawer>
  );
}
