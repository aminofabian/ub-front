/**
 * Browser-local draft for Add product on the catalog.
 * An unfinished product, including its options, survives leaving the page.
 */

import { EMPTY_PARENT, type PackageDraft, type ParentDraft } from "../_types";

export const CATALOG_CREATE_DRAFT_PREFIX = "kiosk:catalogCreateProduct:v1:";
export const CATALOG_CREATE_DRAFT_EVENT = "kiosk:catalog-create-draft";

const MAX_IMAGE_DATA_URL_CHARS = 1_200_000;
const MAX_OPTION_IMAGE_DATA_URL_CHARS = 450_000;

export type CatalogCreateOptionDraft = {
  key: string;
  label: string;
  barcode: string;
  buyingPrice: string;
  unitPrice: string;
  stock: string;
  sharedProductId: string | null;
  imageDataUrl: string | null;
};

export type CatalogCreateProductDraft = {
  v: 1;
  updatedAt: number;
  businessId: string;
  parent: ParentDraft;
  options: CatalogCreateOptionDraft[];
  imageDataUrl: string | null;
};

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function storageKey(businessId: string): string {
  return `${CATALOG_CREATE_DRAFT_PREFIX}${businessId.trim() || "_"}`;
}

function notifyDraftChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CATALOG_CREATE_DRAFT_EVENT));
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asPackageRow(value: unknown): PackageDraft | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<PackageDraft>;
  return {
    name: asString(row.name, ""),
    unitsPerPackage: asString(row.unitsPerPackage, ""),
    price: asString(row.price, ""),
    sku: asString(row.sku, ""),
    barcode: asString(row.barcode, ""),
  };
}

function asParent(value: unknown): ParentDraft | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<ParentDraft>;
  if (raw.productStructure !== "standalone" && raw.productStructure !== "group") {
    return null;
  }
  const packages = Array.isArray(raw.packageRows)
    ? raw.packageRows.flatMap((row) => {
        const parsed = asPackageRow(row);
        return parsed ? [parsed] : [];
      })
    : [];
  return {
    ...EMPTY_PARENT,
    productStructure: raw.productStructure,
    name: asString(raw.name, ""),
    sku: asString(raw.sku, ""),
    barcode: asString(raw.barcode, ""),
    pluCode: asString(raw.pluCode, ""),
    itemTypeId: asString(raw.itemTypeId, ""),
    categoryId: asString(raw.categoryId, ""),
    aisleId: asString(raw.aisleId, ""),
    brand: asString(raw.brand, ""),
    size: asString(raw.size, ""),
    description: asString(raw.description, ""),
    unitType: asString(raw.unitType, ""),
    isWeighed: asBool(raw.isWeighed, false),
    isSellable: asBool(raw.isSellable, true),
    isStocked: asBool(raw.isStocked, true),
    buyingPrice: asString(raw.buyingPrice, ""),
    bundleQty: asString(raw.bundleQty, ""),
    bundlePrice: asString(raw.bundlePrice, ""),
    bundleName: asString(raw.bundleName, ""),
    minStockLevel: asString(raw.minStockLevel, ""),
    reorderLevel: asString(raw.reorderLevel, ""),
    reorderQty: asString(raw.reorderQty, ""),
    supplierId: asString(raw.supplierId, ""),
    supplierSku: asString(raw.supplierSku, ""),
    defaultCostPrice: asString(raw.defaultCostPrice, ""),
    setPrimarySupplier: asBool(raw.setPrimarySupplier, true),
    openingBranchId: asString(raw.openingBranchId, ""),
    openingQty: asString(raw.openingQty, ""),
    openingUnitCost: asString(raw.openingUnitCost, ""),
    sellAsPackages: asBool(raw.sellAsPackages, false),
    packageRows: packages.length > 0 ? packages : EMPTY_PARENT.packageRows,
    globalProductSourceId:
      typeof raw.globalProductSourceId === "string"
        ? raw.globalProductSourceId
        : null,
    globalExtraVariantIds: Array.isArray(raw.globalExtraVariantIds)
      ? raw.globalExtraVariantIds.filter((id) => typeof id === "string")
      : [],
  };
}

function asOption(value: unknown): CatalogCreateOptionDraft | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<CatalogCreateOptionDraft>;
  const key = asString(row.key, "").trim();
  if (!key) return null;
  const image = asString(row.imageDataUrl, "");
  return {
    key,
    label: asString(row.label, ""),
    barcode: asString(row.barcode, ""),
    buyingPrice: asString(row.buyingPrice, ""),
    unitPrice: asString(row.unitPrice, ""),
    stock: asString(row.stock, "1") || "1",
    sharedProductId:
      typeof row.sharedProductId === "string" ? row.sharedProductId : null,
    imageDataUrl:
      image && image.length <= MAX_OPTION_IMAGE_DATA_URL_CHARS ? image : null,
  };
}

export function optionDraftHasWork(
  row: Pick<
    CatalogCreateOptionDraft,
    "label" | "barcode" | "buyingPrice" | "unitPrice" | "imageDataUrl"
  >,
): boolean {
  return Boolean(
    row.label.trim() ||
      row.barcode.trim() ||
      row.buyingPrice.trim() ||
      row.unitPrice.trim() ||
      row.imageDataUrl,
  );
}

export function parentDraftHasWork(parent: ParentDraft): boolean {
  return Boolean(
    parent.name.trim() ||
      parent.barcode.trim() ||
      parent.sku.trim() ||
      parent.brand.trim() ||
      parent.size.trim() ||
      parent.description.trim() ||
      parent.buyingPrice.trim() ||
      parent.bundlePrice.trim() ||
      parent.openingQty.trim() ||
      parent.pluCode.trim() ||
      parent.globalProductSourceId,
  );
}

export function catalogCreateDraftHasWork(
  draft: Pick<CatalogCreateProductDraft, "parent" | "options" | "imageDataUrl">,
): boolean {
  if (parentDraftHasWork(draft.parent) || draft.imageDataUrl) return true;
  return draft.options.some(optionDraftHasWork);
}

export function catalogCreateDraftSummary(
  draft: Pick<CatalogCreateProductDraft, "parent" | "options">,
): string {
  const name = draft.parent.name.trim() || "Untitled product";
  const started = draft.options.filter(optionDraftHasWork).length;
  if (draft.parent.productStructure === "group" && started > 0) {
    const noun = started === 1 ? "option" : "options";
    return `${name} · ${started} ${noun}`;
  }
  return name;
}

export function loadCatalogProductCreateDraft(
  businessId: string,
  store: StorageLike | null = browserStorage(),
): CatalogCreateProductDraft | null {
  if (!store) return null;
  try {
    const raw = store.getItem(storageKey(businessId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CatalogCreateProductDraft>;
    if (parsed?.v !== 1) return null;
    const parent = asParent(parsed.parent);
    if (!parent) return null;
    const options = Array.isArray(parsed.options)
      ? parsed.options.flatMap((row) => {
          const option = asOption(row);
          return option ? [option] : [];
        })
      : [];
    const image = asString(parsed.imageDataUrl, "");
    return {
      v: 1,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
      businessId: asString(parsed.businessId, businessId),
      parent,
      options,
      imageDataUrl:
        image && image.length <= MAX_IMAGE_DATA_URL_CHARS ? image : null,
    };
  } catch {
    return null;
  }
}

function trimOptionImages(
  rows: CatalogCreateOptionDraft[],
): CatalogCreateOptionDraft[] {
  return rows.map((row) => ({
    ...row,
    imageDataUrl:
      row.imageDataUrl &&
      row.imageDataUrl.length <= MAX_OPTION_IMAGE_DATA_URL_CHARS
        ? row.imageDataUrl
        : null,
  }));
}

export function saveCatalogProductCreateDraft(
  draft: Omit<CatalogCreateProductDraft, "v" | "updatedAt">,
  store: StorageLike | null = browserStorage(),
): void {
  if (!store) return;
  const imageDataUrl =
    draft.imageDataUrl && draft.imageDataUrl.length <= MAX_IMAGE_DATA_URL_CHARS
      ? draft.imageDataUrl
      : null;
  const payload: CatalogCreateProductDraft = {
    ...draft,
    options: trimOptionImages(draft.options),
    imageDataUrl,
    v: 1,
    updatedAt: Date.now(),
  };
  const key = storageKey(draft.businessId);
  if (!catalogCreateDraftHasWork(payload)) {
    store.removeItem(key);
    notifyDraftChanged();
    return;
  }
  const textOnly: CatalogCreateProductDraft = {
    ...payload,
    imageDataUrl: null,
    options: payload.options.map((row) => ({ ...row, imageDataUrl: null })),
  };
  try {
    store.setItem(key, JSON.stringify(payload));
  } catch {
    try {
      store.setItem(key, JSON.stringify(textOnly));
    } catch {
      /* private mode or quota — the form still works for this visit */
    }
  }
  notifyDraftChanged();
}

export function clearCatalogProductCreateDraft(
  businessId: string,
  store: StorageLike | null = browserStorage(),
): void {
  if (!store) return;
  try {
    store.removeItem(storageKey(businessId));
  } catch {
    /* ignore */
  }
  notifyDraftChanged();
}
