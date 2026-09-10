import { cn } from "@/lib/utils";

// ─── drawer IDs ──────────────────────────────────────────────────────────────

export type ProductDrawerId =
  | "create-parent"
  | "edit-product"
  | "photos"
  | "pick-variant-parent"
  | "add-variant";

// ─── edit-product draft ───────────────────────────────────────────────────────

export type ProductEditDraft = {
  name?: string;
  sku?: string;
  barcode?: string;
  pluCode?: string;
  description?: string;
  active?: boolean;
  webPublished?: boolean;
  bundlePriceStr: string;
  bundleQtyStr: string;
  buyingPriceStr: string;
  minStockLevelStr: string;
  reorderLevelStr: string;
  reorderQtyStr: string;
  imageKey: string;
  categoryId: string;
  aisleId: string;
  /** Option / variant label (PATCH only for variant SKUs). */
  variantName: string;
  packageVariant: boolean;
  packagingUnitName: string;
  packagingUnitQtyStr: string;
};

export const EMPTY_EDIT_DRAFT: ProductEditDraft = {
  bundlePriceStr: "",
  bundleQtyStr: "",
  buyingPriceStr: "",
  minStockLevelStr: "",
  reorderLevelStr: "",
  reorderQtyStr: "",
  imageKey: "",
  description: "",
  active: true,
  webPublished: true,
  categoryId: "",
  aisleId: "",
  variantName: "",
  packageVariant: false,
  packagingUnitName: "",
  packagingUnitQtyStr: "",
};

// ─── create-parent draft ──────────────────────────────────────────────────────

export type ParentDraft = {
  productStructure: "standalone" | "group";
  name: string;
  sku: string;
  barcode: string;
  pluCode: string;
  itemTypeId: string;
  categoryId: string;
  aisleId: string;
  brand: string;
  size: string;
  description: string;
  unitType: string;
  isWeighed: boolean;
  isSellable: boolean;
  isStocked: boolean;
  buyingPrice: string;
  bundleQty: string;
  bundlePrice: string;
  bundleName: string;
  minStockLevel: string;
  reorderLevel: string;
  reorderQty: string;
  supplierId: string;
  supplierSku: string;
  defaultCostPrice: string;
  setPrimarySupplier: boolean;
  openingBranchId: string;
  openingQty: string;
  openingUnitCost: string;
  sellAsPackages: boolean;
  packageRows: PackageDraft[];
  /** When set, create adopts this shared catalog product (sets global_product_source_id). */
  globalProductSourceId: string | null;
};

// ─── package / bundle sell variants ───────────────────────────────────────────

export type PackageDraft = {
  name: string;
  unitsPerPackage: string;
  price: string;
  sku: string;
  barcode: string;
};

export function emptyPackageDraft(): PackageDraft {
  return { name: "", unitsPerPackage: "", price: "", sku: "", barcode: "" };
}

export const EMPTY_PARENT: ParentDraft = {
  productStructure: "standalone",
  name: "",
  sku: "",
  barcode: "",
  pluCode: "",
  itemTypeId: "",
  categoryId: "",
  aisleId: "",
  brand: "",
  size: "",
  description: "",
  unitType: "",
  isWeighed: false,
  isSellable: true,
  isStocked: true,
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
  setPrimarySupplier: true,
  openingBranchId: "",
  openingQty: "",
  openingUnitCost: "",
  sellAsPackages: false,
  packageRows: [emptyPackageDraft()],
  globalProductSourceId: null,
};

// ─── add-variant draft ────────────────────────────────────────────────────────

export type VariantDraft = {
  sku: string;
  variantName: string;
  name: string;
  barcode: string;
  description: string;
  categoryId: string;
  brand: string;
  size: string;
  unitType: string;
  minStockLevel: string;
  reorderLevel: string;
  reorderQty: string;
  imageKey: string;
  bundleQty: string;
  bundlePrice: string;
  bundleName: string;
  sellingPrice: string;
  sellBranchId: string;
  sellEffectiveFrom: string;
  supplierId: string;
  supplierSku: string;
  defaultCostPrice: string;
  setPrimarySupplier: boolean;
  openingQty: string;
  openingBranchId: string;
  openingUnitCost: string;
  /** Package variant: deducts stock from parent using unitsPerPackage. */
  isPackageVariant: boolean;
  unitsPerPackage: string;
};

const VARIANT_DRAFT_FIELDS: Omit<VariantDraft, "sellEffectiveFrom"> = {
  sku: "",
  variantName: "",
  name: "",
  barcode: "",
  description: "",
  categoryId: "",
  brand: "",
  size: "",
  unitType: "",
  minStockLevel: "",
  reorderLevel: "",
  reorderQty: "",
  imageKey: "",
  bundleQty: "",
  bundlePrice: "",
  bundleName: "",
  sellingPrice: "",
  sellBranchId: "",
  supplierId: "",
  supplierSku: "",
  defaultCostPrice: "",
  setPrimarySupplier: true,
  openingQty: "",
  openingBranchId: "",
  openingUnitCost: "",
  isPackageVariant: false,
  unitsPerPackage: "",
};

export function emptyVariantDraft(): VariantDraft {
  return {
    ...VARIANT_DRAFT_FIELDS,
    sellEffectiveFrom: new Date().toISOString().slice(0, 10),
  };
}

// ─── quick-edit key ───────────────────────────────────────────────────────────

export type QuickEditKey =
  | "productName"
  | "sku"
  | "barcode"
  | "bundleQty"
  | "bundlePrice"
  | "buyingPrice"
  | "margin"
  | "minStock"
  | "reorder"
  | "stock"
  | null;

// ─── shared style constants ───────────────────────────────────────────────────

export {
  productFormInputClass as VARIANT_INPUT_CLASS,
  productFormInputClass as quickInputClass,
} from "./_components/product-form-styles";

export const panelClass = cn(
  "rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white",
);

export const filterLabelClass =
  "text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]";

// ─── detail-panel section style tokens ───────────────────────────────────────

/** @deprecated Prefer product-detail-styles — kept for drawers that import _types */
export const sectionCls =
  "overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white shadow-none";

export const sectionHeadCls =
  "flex items-center gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 py-2 bg-white";

export const sectionLabelCls =
  "text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]";

export const fieldRowCls =
  "group flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,transparent)]";

export const fieldLabelCls =
  "text-[11px] font-medium tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]";

export const fieldValueCls = "text-sm font-medium text-foreground truncate";

export const inlineEditCls =
  "flex flex-col gap-2.5 border-l-2 border-primary/40 bg-primary/[0.05] px-3 py-3 ring-1 ring-inset ring-primary/15";
