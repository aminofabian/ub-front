"use client";

import Image from "next/image";
import {
  Camera,
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
  productFormStackClass,
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
      icon={<Camera className="size-5 text-primary" />}
    >
      {d && (
        <div className="space-y-5">
          <div className="space-y-3 rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/50 via-background to-amber-50/35 p-4">
            <p className="text-sm font-semibold">Live cover</p>
            {coverImageUrl(d) ? (
              <div
                className="relative mx-auto h-44 w-full max-w-sm overflow-hidden rounded-xl border-2 border-background shadow-xl"
                style={{
                  boxShadow: `0 18px 42px -16px ${detail.sortedImages.find((i) => i.predominantColorHex)?.predominantColorHex ?? "rgba(99,102,241,0.45)"}`,
                }}
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
            className="space-y-3 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/10 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void m.onUploadCatalogImage(e as never);
            }}
          >
            <p className="text-sm font-medium">Beam a new photo</p>
            <input
              type="file"
              accept="image/*"
              className="max-w-full text-xs file:mr-2 file:rounded file:border file:bg-background file:px-2 file:py-1"
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
              className="relative overflow-hidden rounded-lg border bg-background p-2 shadow-sm"
              style={{
                borderColor: `${img.predominantColorHex?.trim() ?? "#818cf8"}66`,
              }}
            >
              {galleryImageUrl(img) ? (
                <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
                  <Image
                    src={galleryImageUrl(img)!}
                    alt={img.altText ?? ""}
                    fill
                    className="object-cover"
                    sizes="180px"
                  />
                </div>
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-md bg-muted text-[10px]">
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
      icon={<PencilLine className="size-5 text-primary" />}
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
            className="gap-1.5"
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
        className={productFormStackClass}
        onSubmit={(e) => {
          e.preventDefault();
          void quick.saveQuickEditAll();
        }}
      >
        <FormDrawerFields legend="Identity">
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
          <p className="rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2 text-xs text-muted-foreground">
            Stock, min level, and reorder live on the base product. Change{" "}
            <span className="font-medium text-foreground">units per package</span>{" "}
            in the full product editor (Package section).
          </p>
        ) : null}
        <FormDrawerFields legend="Pricing">
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
          <FormDrawerFields legend="Stock">
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
        <FormDrawerFields legend="Description">
          <F label="Notes">
            <textarea
              className={productFormTextareaClass}
              value={quick.qeaDescription}
              onChange={(e) => quick.setQeaDescription(e.target.value)}
            />
          </F>
        </FormDrawerFields>
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
  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      banner={banner}
      title={d?.name ?? ""}
      description={d?.variantName ?? (d?.sku ? `SKU ${d.sku}` : "")}
      contextLabel={d?.variantOfItemId ? "Variant SKU" : "Product"}
      icon={
        d?.variantOfItemId ? (
          <Layers className="size-5 text-violet-600" />
        ) : (
          <Package className="size-5 text-emerald-600" />
        )
      }
      width="wide"
    >
      {d ? (
        <ProductDetailPanel {...detailPanelProps} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      )}
    </FormDrawer>
  );
}
