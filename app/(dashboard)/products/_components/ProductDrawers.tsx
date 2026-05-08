"use client";

import Image from "next/image";
import {
  Camera,
  Layers,
  Loader2,
  Package,
  PencilLine,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { cn } from "@/lib/utils";
import { VARIANT_INPUT_CLASS } from "../_types";
import type { ProductDetailApi } from "../_hooks/useProductDetail";
import type { QuickEditApi } from "../_hooks/useQuickEdit";
import type { ProductMutationsApi } from "../_hooks/useProductMutations";
import { ProductDetailPanel } from "./ProductDetailPanel";
import { galleryImageUrl, coverImageUrl } from "../_utils";

type Cat = { id: string; name: string; active: boolean };

// ─── Edit drawer ─────────────────────────────────────────────────────────────

export function ProductEditDrawer({
  open,
  onClose,
  detail,
  cats,
  m,
}: {
  open: boolean;
  onClose: () => void;
  detail: Pick<ProductDetailApi, "detail" | "patchDraft" | "setPatchDraft">;
  cats: Cat[];
  m: Pick<ProductMutationsApi, "onPatchItem" | "onDeleteItem">;
}) {
  const d = detail.detail;
  const dr = detail.patchDraft;
  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title="Product details"
      description={d ? `Editing SKU ${d.sku}` : ""}
      contextLabel="Inspector"
      icon={<PencilLine className="size-5 text-primary" />}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" form="edit-product-form">
            Save changes
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void m.onDeleteItem()}
          >
            Delete
          </Button>
        </div>
      }
    >
      {d && (
        <form
          id="edit-product-form"
          className="space-y-4"
          onSubmit={m.onPatchItem}
        >
          <Lbl label="Name">
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={dr.name ?? ""}
              onChange={(e) =>
                detail.setPatchDraft((p) => ({ ...p, name: e.target.value }))
              }
            />
          </Lbl>
          <Lbl label="Barcode">
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
              value={dr.barcode ?? ""}
              onChange={(e) =>
                detail.setPatchDraft((p) => ({ ...p, barcode: e.target.value }))
              }
            />
          </Lbl>
          <Lbl label="Description">
            <textarea
              className="min-h-[6rem] resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={dr.description ?? ""}
              onChange={(e) =>
                detail.setPatchDraft((p) => ({
                  ...p,
                  description: e.target.value,
                }))
              }
            />
          </Lbl>
          <Lbl label="Category">
            <select
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
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
                </option>
              ))}
            </select>
          </Lbl>
          <Lbl label="Selling price">
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              inputMode="decimal"
              value={dr.bundlePriceStr}
              onChange={(e) =>
                detail.setPatchDraft((p) => ({
                  ...p,
                  bundlePriceStr: e.target.value,
                }))
              }
            />
          </Lbl>
          <Lbl label="Cover URL">
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={dr.imageKey}
              onChange={(e) =>
                detail.setPatchDraft((p) => ({
                  ...p,
                  imageKey: e.target.value,
                }))
              }
            />
          </Lbl>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dr.active ?? true}
              onChange={(e) =>
                detail.setPatchDraft((p) => ({
                  ...p,
                  active: e.target.checked,
                }))
              }
            />{" "}
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dr.webPublished ?? false}
              onChange={(e) =>
                detail.setPatchDraft((p) => ({
                  ...p,
                  webPublished: e.target.checked,
                }))
              }
            />{" "}
            Show on online shop
          </label>
        </form>
      )}
    </FormDrawer>
  );
}

function Lbl({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

// ─── Photos drawer ───────────────────────────────────────────────────────────

export function ProductPhotosDrawer({
  open,
  onClose,
  detail,
  m,
}: {
  open: boolean;
  onClose: () => void;
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
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
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
  detail,
  quick,
}: {
  open: boolean;
  onClose: () => void;
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
    | "qeaError"
    | "saveQuickEditAll"
  >;
}) {
  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={detail.detail?.name ?? "Edit product"}
      description={
        detail.detail?.variantName
          ? `Option · ${detail.detail.variantName}`
          : "Edit all fields"
      }
      contextLabel="Quick edit"
      icon={<PencilLine className="size-5 text-primary" />}
      footer={
        <div className="flex justify-end gap-2">
          {quick.qeaError && (
            <p className="flex-1 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive">
              {quick.qeaError}
            </p>
          )}
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
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void quick.saveQuickEditAll();
        }}
      >
        <FormDrawerFields legend="Identity">
          <F label="Display name">
            <span className="text-destructive">*</span>
            <input
              className={VARIANT_INPUT_CLASS}
              value={quick.qeaName}
              onChange={(e) => quick.setQeaName(e.target.value)}
              required
            />
          </F>
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="SKU">
              <span className="text-destructive">*</span>
              <input
                className={cn(VARIANT_INPUT_CLASS, "font-mono")}
                value={quick.qeaSku}
                onChange={(e) => quick.setQeaSku(e.target.value)}
                required
              />
            </F>
            <F label="Barcode">
              <input
                className={cn(VARIANT_INPUT_CLASS, "font-mono")}
                value={quick.qeaBarcode}
                onChange={(e) => quick.setQeaBarcode(e.target.value)}
              />
            </F>
          </div>
        </FormDrawerFields>
        <FormDrawerFields legend="Pricing">
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Shelf price">
              <input
                className={VARIANT_INPUT_CLASS}
                inputMode="decimal"
                value={quick.qeaBundlePrice}
                onChange={(e) => quick.setQeaBundlePrice(e.target.value)}
              />
            </F>
            <F label="Buying price">
              <input
                className={VARIANT_INPUT_CLASS}
                inputMode="decimal"
                value={quick.qeaBuyingPrice}
                onChange={(e) => quick.setQeaBuyingPrice(e.target.value)}
              />
            </F>
          </div>
          <F label="Units per pack">
            <input
              className={VARIANT_INPUT_CLASS}
              inputMode="numeric"
              value={quick.qeaBundleQty}
              onChange={(e) => quick.setQeaBundleQty(e.target.value)}
            />
          </F>
        </FormDrawerFields>
        <FormDrawerFields legend="Stock">
          <div className="grid gap-3 sm:grid-cols-3">
            <F label="Min stock">
              <input
                className={VARIANT_INPUT_CLASS}
                inputMode="decimal"
                value={quick.qeaMinStock}
                onChange={(e) => quick.setQeaMinStock(e.target.value)}
              />
            </F>
            <F label="Reorder at">
              <input
                className={VARIANT_INPUT_CLASS}
                inputMode="decimal"
                value={quick.qeaReorderLevel}
                onChange={(e) => quick.setQeaReorderLevel(e.target.value)}
              />
            </F>
            <F label="Order qty">
              <input
                className={VARIANT_INPUT_CLASS}
                inputMode="decimal"
                value={quick.qeaReorderQty}
                onChange={(e) => quick.setQeaReorderQty(e.target.value)}
              />
            </F>
          </div>
        </FormDrawerFields>
        <FormDrawerFields legend="Description">
          <F label="Product description">
            <textarea
              className={cn(VARIANT_INPUT_CLASS, "min-h-24 resize-y")}
              value={quick.qeaDescription}
              onChange={(e) => quick.setQeaDescription(e.target.value)}
            />
          </F>
        </FormDrawerFields>
      </form>
    </FormDrawer>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      {label}
      {children}
    </label>
  );
}

// ─── Mobile detail drawer ────────────────────────────────────────────────────

export function ProductMobileDetailDrawer({
  open,
  onClose,
  detail,
  detailPanelProps,
}: {
  open: boolean;
  onClose: () => void;
  detail: Pick<ProductDetailApi, "detail">;
  detailPanelProps: Record<string, any>;
}) {
  const d = detail.detail;
  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={d?.name ?? ""}
      description={d?.variantName ?? (d?.sku ? `SKU ${d.sku}` : "")}
      contextLabel={d?.variantOfItemId ? "Option SKU" : "Product"}
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
        <ProductDetailPanel {...(detailPanelProps as any)} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      )}
    </FormDrawer>
  );
}
