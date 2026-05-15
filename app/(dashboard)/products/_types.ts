import { cn } from "@/lib/utils";

// ─── drawer IDs ──────────────────────────────────────────────────────────────

export type ProductDrawerId =
  | "create-parent"
  | "edit-product"
  | "photos"
  | "add-variant";

// ─── edit-product draft ───────────────────────────────────────────────────────

export type ProductEditDraft = {
  name?: string;
  sku?: string;
  barcode?: string;
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
};

// ─── create-parent draft ──────────────────────────────────────────────────────

export type ParentDraft = {
  productStructure: "standalone" | "group";
  name: string;
  sku: string;
  barcode: string;
  itemTypeId: string;
  categoryId: string;
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
  imageKey: string;
  supplierId: string;
  supplierSku: string;
  defaultCostPrice: string;
  setPrimarySupplier: boolean;
  openingBranchId: string;
  openingQty: string;
  openingUnitCost: string;
};

export const EMPTY_PARENT: ParentDraft = {
  productStructure: "standalone",
  name: "",
  sku: "",
  barcode: "",
  itemTypeId: "",
  categoryId: "",
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
  imageKey: "",
  supplierId: "",
  supplierSku: "",
  defaultCostPrice: "",
  setPrimarySupplier: true,
  openingBranchId: "",
  openingQty: "",
  openingUnitCost: "",
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
  "rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm",
  "dark:bg-card/90 dark:ring-white/[0.04]",
);

export const filterLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90";

// ─── detail-panel section style tokens ───────────────────────────────────────

/** @deprecated Prefer product-detail-styles — kept for drawers that import _types */
export const sectionCls =
  "overflow-hidden rounded-xl border border-border/55 bg-card/80 shadow-sm ring-1 ring-black/[0.02] dark:bg-card/50 dark:ring-white/[0.04]";

export const sectionHeadCls =
  "flex items-center gap-2 border-b border-border/45 px-3 py-2.5 bg-muted/30 dark:bg-muted/35";

export const sectionLabelCls =
  "text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/70";

export const fieldRowCls =
  "group flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-[background-color,box-shadow] duration-150 hover:bg-muted/40";

export const fieldLabelCls =
  "text-[10px] font-medium uppercase tracking-wide text-muted-foreground";

export const fieldValueCls = "text-sm font-medium text-foreground truncate";

export const inlineEditCls =
  "flex flex-col gap-2.5 border-l-2 border-primary/40 bg-primary/[0.05] px-3 py-3 ring-1 ring-inset ring-primary/15";
