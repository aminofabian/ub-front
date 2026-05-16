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
  Plus,
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
  formatMutationError,
  galleryImageUrl,
  toNumber,
} from "../_utils";
import { postStockIncrease } from "@/lib/api";
import { useEffect, useState, type ComponentProps } from "react";
import { StockIncreaseFields } from "./StockIncreaseFields";
type Cat = { id: string; name: string; active: boolean };

// ─── Edit drawer ─────────────────────────────────────────────────────────────

export function ProductEditDrawer({
  open,
  onClose,
  banner,
  detail,
  cats,
  m,
  headerBranchId,
  refreshFullCatalog,
  refreshSelectedDetail,
  setMessage,
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
  refreshFullCatalog: () => Promise<void>;
  refreshSelectedDetail: (itemIdOverride?: string | null) => Promise<void>;
  setMessage: (msg: string) => void;
}) {
  const d = detail.detail;
  const dr = detail.patchDraft;
  const [stockQty, setStockQty] = useState("");
  const [stockBranchId, setStockBranchId] = useState("");
  const [stockUnitCost, setStockUnitCost] = useState("");
  const [stockSaving, setStockSaving] = useState(false);

  useEffect(() => {
    if (!open || !d) return;
    setStockQty("");
    setStockBranchId(headerBranchId || m.branches[0]?.id || "");
    const cost =
      toNumber(d.buyingPrice) ??
      toNumber(dr.buyingPriceStr) ??
      null;
    setStockUnitCost(cost != null ? String(cost) : "");
  }, [open, d?.id, d?.buyingPrice, headerBranchId, dr.buyingPriceStr, m.branches]);

  // Default "Show on online shop" to checked whenever the edit drawer opens.
  useEffect(() => {
    if (!open || !d) return;
    detail.setPatchDraft((p) => ({ ...p, webPublished: true }));
  }, [open, d?.id, detail.setPatchDraft]);

  const handleStockIncrease = async (): Promise<boolean> => {
    if (!d) return false;
    if (d.isStocked === false) {
      setMessage(
        "This SKU is not stocked. Turn on stock tracking for this product, or add stock on a variant row instead.",
      );
      return false;
    }
    const qtyRaw = stockQty.trim();
    if (!qtyRaw) {
      setMessage("Enter a quantity to add.");
      return false;
    }
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
      await refreshFullCatalog();
      await refreshSelectedDetail();
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

  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      banner={banner}
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
          className={productFormStackClass}
          onSubmit={(e) => void onEditSubmit(e)}
        >
          <ProductFormField label={d.variantOfItemId ? "Display name" : "Name"} required>
            <input
              className={productFormInputClass}
              value={dr.name ?? ""}
              onChange={(e) =>
                detail.setPatchDraft((p) => ({ ...p, name: e.target.value }))
              }
            />
          </ProductFormField>
          {d.variantOfItemId ? (
            <ProductFormField label="Variant label" required>
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
          ) : null}
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
                </option>
              ))}
            </select>
          </ProductFormField>
          <ProductFormField label="Description">
            <textarea
              className={productFormTextareaClass}
              value={dr.description ?? ""}
              onChange={(e) =>
                detail.setPatchDraft((p) => ({
                  ...p,
                  description: e.target.value,
                }))
              }
            />
          </ProductFormField>
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
            <ProductFormField label="Pack qty">
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
          </div>
          <div className={productFormGrid2Class}>
            <ProductFormField label="Cost">
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
          <div className={productFormSectionClass}>
            <p className={productFormSectionTitleClass}>Cover image</p>
            {coverImageUrl(d) ? (
              <div className="relative mx-auto h-36 w-full max-w-xs overflow-hidden rounded-lg border bg-background shadow-sm">
                <Image
                  src={coverImageUrl(d)!}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="240px"
                />
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-background text-xs text-muted-foreground">
                No cover image
              </div>
            )}
            <div className="space-y-2">
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
                placeholder="Alt text (optional)"
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
                type="button"
                size="sm"
                className="h-7 text-xs"
                disabled={m.catalogImageUploadBusy || !m.pendingCatalogImage}
                onClick={() =>
                  void m.onUploadCatalogImage(new Event("submit") as never)
                }
              >
                {m.catalogImageUploadBusy ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </div>

          <StockIncreaseFields
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
            hint={
              d.isStocked === false
                ? "This SKU is not stocked — enable stock tracking before adding quantity."
                : "Click Add stock, or fill qty and use Save changes."
            }
          />
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={stockSaving}
            onClick={() => void handleStockIncrease()}
          >
            {stockSaving ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-3" aria-hidden />
            )}
            {stockSaving ? "Adding…" : "Add stock"}
          </Button>

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
              checked={dr.webPublished ?? true}
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
  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      banner={banner}
      title={detail.detail?.name ?? "Edit product"}
      description={
        detail.detail?.variantName
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
        <FormDrawerFields legend="Pricing">
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
        </FormDrawerFields>
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
