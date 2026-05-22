import {
  ApiRequestError,
  type CreateVariantPayload,
  type ItemDetailRecord,
  type ItemImageRecord,
  type PatchItemPayload,
} from "@/lib/api";
import { type PackageDraft, type VariantDraft } from "./_types";

// ─── numeric helpers ──────────────────────────────────────────────────────────

/** User-visible message for catalog/inventory mutation failures (includes API errors). */
export function formatMutationError(
  error: unknown,
  fallback = "Request failed.",
): string {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Resolves the unit cost shown for a supplier link: agreed default, then last
 * purchase cost (updated when receiving supply), then optional catalog fallback.
 */
export function effectiveSupplierUnitCost(
  link:
    | {
        defaultCostPrice?: number | string | null;
        lastCostPrice?: number | string | null;
      }
    | null
    | undefined,
  itemBuyingPrice?: number | string | null,
): number | null {
  const buy = toNumber(itemBuyingPrice);
  const def = toNumber(link?.defaultCostPrice);
  const last = toNumber(link?.lastCostPrice);
  if (link) {
    return def ?? last ?? buy ?? null;
  }
  return buy ?? null;
}

/** Human-readable stock for catalog rows and detail (supports package variants). */
/** Base product id for variants/packages (never a child variant id). */
export function resolveCatalogParentId(
  detail: { id: string; variantOfItemId?: string | null } | null,
  selectedId: string | null,
): string | null {
  if (detail?.variantOfItemId?.trim()) {
    return detail.variantOfItemId.trim();
  }
  if (detail?.id?.trim()) {
    return detail.id.trim();
  }
  return selectedId?.trim() || null;
}

export function formatStockLabel(
  row: {
    packageVariant?: boolean;
    stockQty?: number | string | null;
    baseStockQty?: number | string | null;
    packageUnitsPerSale?: number | string | null;
    currentStock?: number | string | null;
  } | null | undefined,
): string {
  if (!row) return "—";
  if (row.packageVariant) {
    const pkgs = toNumber(row.stockQty);
    const base = toNumber(row.baseStockQty) ?? toNumber(row.currentStock);
    const units = toNumber(row.packageUnitsPerSale);
    if (pkgs == null && base == null) return "—";
    const pkgPart = pkgs != null ? `${pkgs} pkg` : "—";
    if (base != null && units != null && units > 0) {
      return `${pkgPart} · ${base} base`;
    }
    return pkgPart;
  }
  const onHand = toNumber(row.stockQty) ?? toNumber(row.currentStock);
  return onHand != null ? onHand.toLocaleString() : "—";
}

/** Branch batch on-hand when available; otherwise item-level currentStock. */
export function effectiveOnHand(
  detail: {
    stockQty?: number | string | null;
    currentStock?: number | string | null;
  } | null | undefined,
): number | null {
  if (!detail) return null;
  return toNumber(detail.stockQty) ?? toNumber(detail.currentStock);
}

export function formatAmount(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function optionalPositiveNumber(raw: string, label: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`${label} must be a valid number.`);
  return n;
}

// ─── image helpers ────────────────────────────────────────────────────────────

export function galleryImageUrl(img: ItemImageRecord): string | null {
  const secure = img.secureUrl?.trim();
  if (secure) return secure;
  const key = img.s3Key?.trim();
  if (key?.startsWith("http")) return key;
  return null;
}

export function coverImageUrl(detail: ItemDetailRecord): string | null {
  const k = detail.imageKey?.trim();
  if (k?.startsWith("http")) return k;
  const sorted = detail.images
    ? [...detail.images].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  for (const img of sorted) {
    const u = galleryImageUrl(img);
    if (u) return u;
  }
  return null;
}

// ─── variant payload builders ─────────────────────────────────────────────────

export function buildCreatePackageVariantBody(
  draft: PackageDraft,
): CreateVariantPayload {
  const name = draft.name.trim();
  if (!name) throw new Error("Package name is required.");
  const units = Number(draft.unitsPerPackage.trim());
  if (!Number.isFinite(units) || units <= 0 || !Number.isInteger(units)) {
    throw new Error("Units per package must be a positive whole number.");
  }
  const body: CreateVariantPayload = {
    variantName: name,
    packageVariant: true,
    packagingUnitName: name,
    packagingUnitQty: units,
    bundleQty: 1,
  };
  if (draft.sku.trim()) body.sku = draft.sku.trim();
  if (draft.barcode.trim()) body.barcode = draft.barcode.trim();
  if (draft.price.trim()) {
    const price = Number(draft.price.trim());
    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Package price must be a valid non-negative number.");
    }
    body.bundlePrice = price;
  }
  return body;
}

export function buildCreateVariantBody(draft: VariantDraft): CreateVariantPayload {
  const variantName = draft.variantName.trim();
  if (!variantName) throw new Error("Variant label is required.");

  if (draft.isPackageVariant) {
    const units = Number(draft.unitsPerPackage.trim());
    if (!Number.isFinite(units) || units <= 0 || !Number.isInteger(units)) {
      throw new Error("Units per package must be a positive whole number.");
    }
    const body: CreateVariantPayload = {
      variantName,
      packageVariant: true,
      packagingUnitName: variantName,
      packagingUnitQty: units,
      bundleQty: 1,
    };
    if (draft.sku.trim()) body.sku = draft.sku.trim();
    if (draft.barcode.trim()) body.barcode = draft.barcode.trim();
    if (draft.bundlePrice.trim()) {
      const price = Number(draft.bundlePrice.trim());
      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Package price must be a valid non-negative number.");
      }
      body.bundlePrice = price;
    }
    return body;
  }

  const body: CreateVariantPayload = { variantName };
  if (draft.sku.trim()) body.sku = draft.sku.trim();
  if (draft.name.trim()) body.name = draft.name.trim();
  if (draft.barcode.trim()) body.barcode = draft.barcode.trim();
  if (draft.description.trim()) body.description = draft.description.trim();
  if (draft.categoryId.trim()) body.categoryId = draft.categoryId.trim();
  if (draft.brand.trim()) body.brand = draft.brand.trim();
  if (draft.size.trim()) body.size = draft.size.trim();
  if (draft.unitType.trim()) body.unitType = draft.unitType.trim();
  if (draft.imageKey.trim()) body.imageKey = draft.imageKey.trim();

  const minL = optionalPositiveNumber(draft.minStockLevel, "Min stock level");
  if (minL !== undefined) body.minStockLevel = minL;
  const rL = optionalPositiveNumber(draft.reorderLevel, "Reorder level");
  if (rL !== undefined) body.reorderLevel = rL;
  const rQ = optionalPositiveNumber(draft.reorderQty, "Reorder qty");
  if (rQ !== undefined) body.reorderQty = rQ;

  return body;
}

export function bundlePatchFromVariantDraft(draft: VariantDraft): PatchItemPayload | null {
  const patch: PatchItemPayload = {};

  if (draft.bundleQty.trim()) {
    const n = Number(draft.bundleQty.trim());
    if (!Number.isFinite(n)) throw new Error("Bundle qty must be a valid number.");
    patch.bundleQty = n;
  }
  if (draft.bundlePrice.trim()) {
    const n = Number(draft.bundlePrice.trim());
    if (!Number.isFinite(n)) throw new Error("Bundle price must be a valid number.");
    patch.bundlePrice = n;
  }
  if (draft.bundleName.trim()) patch.bundleName = draft.bundleName.trim();

  return Object.keys(patch).length > 0 ? patch : null;
}
