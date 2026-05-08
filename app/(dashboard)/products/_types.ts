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
  barcode?: string;
  description?: string;
  active?: boolean;
  webPublished?: boolean;
  bundlePriceStr: string;
  imageKey: string;
  categoryId: string;
};

export const EMPTY_EDIT_DRAFT: ProductEditDraft = {
  bundlePriceStr: "",
  imageKey: "",
  description: "",
  active: true,
  webPublished: false,
  categoryId: "",
};

// ─── create-parent draft ──────────────────────────────────────────────────────

export type ParentDraft = {
  name: string;
  sku: string;
  barcode: string;
  itemTypeId: string;
  categoryId: string;
  supplierId: string;
  supplierSku: string;
  defaultCostPrice: string;
  setPrimarySupplier: boolean;
};

export const EMPTY_PARENT: ParentDraft = {
  name: "",
  sku: "",
  barcode: "",
  itemTypeId: "",
  categoryId: "",
  supplierId: "",
  supplierSku: "",
  defaultCostPrice: "",
  setPrimarySupplier: true,
};

// ─── add-variant draft ────────────────────────────────────────────────────────

export type VariantDraft = {
  sku: string;
  variantName: string;
  name: string;
  barcode: string;
  description: string;
  categoryId: string;
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
  sku: "", variantName: "", name: "", barcode: "", description: "",
  categoryId: "", unitType: "", minStockLevel: "", reorderLevel: "",
  reorderQty: "", imageKey: "", bundleQty: "", bundlePrice: "",
  bundleName: "", sellingPrice: "", sellBranchId: "", supplierId: "",
  supplierSku: "", defaultCostPrice: "", setPrimarySupplier: true,
  openingQty: "", openingBranchId: "", openingUnitCost: "",
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
  | null;

// ─── shared style constants ───────────────────────────────────────────────────

export const VARIANT_INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground";

export const panelClass = cn(
  "rounded-3xl border border-border/70 bg-card/90 shadow-md shadow-black/[0.03] ring-1 ring-black/[0.03] backdrop-blur-sm",
  "dark:bg-card/80 dark:shadow-black/20 dark:ring-white/[0.06]",
);

export const filterLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90";

export const quickInputClass = cn(
  "w-full rounded-xl border border-input/80 bg-background px-3 py-2 text-sm shadow-sm",
  "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
);

// ─── detail-panel section style tokens ───────────────────────────────────────

export const sectionCls = "overflow-hidden rounded-xl border border-border/60";

export const sectionHeadCls =
  "flex items-center gap-2 border-b border-border/40 bg-muted/30 px-3 py-2";

export const sectionLabelCls =
  "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground";

export const fieldRowCls =
  "group flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/25";

export const fieldLabelCls =
  "text-[10px] font-medium uppercase tracking-wide text-muted-foreground";

export const fieldValueCls = "text-sm font-medium text-foreground truncate";

export const inlineEditCls =
  "flex flex-col gap-2.5 bg-primary/[0.03] px-3 py-3 ring-1 ring-inset ring-primary/15";
