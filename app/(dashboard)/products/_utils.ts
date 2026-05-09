import {
  type CreateVariantPayload,
  type ItemDetailRecord,
  type ItemImageRecord,
  type PatchItemPayload,
} from "@/lib/api";
import { type VariantDraft } from "./_types";

// ─── numeric helpers ──────────────────────────────────────────────────────────

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

export function buildCreateVariantBody(draft: VariantDraft): CreateVariantPayload {
  const variantName = draft.variantName.trim();
  if (!variantName) throw new Error("Variant label is required.");

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
