/** Shared catalog labeling — UUID product names and import placeholder categories. */

const UUID_RE = /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/i;
const IMP_UUID_RE =
  /^IMP-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeUuid(value: string | null | undefined): boolean {
  const t = value?.trim();
  return !!t && UUID_RE.test(t);
}

/** Import / barcode-mirror SKUs — never show as customer-facing subtitles. */
export function isInternalCatalogSku(sku: string | null | undefined): boolean {
  const s = sku?.trim();
  if (!s) return true;
  if (/^IMP-/i.test(s)) return true;
  if (IMP_UUID_RE.test(s)) return true;
  if (/^BC-\d{8,}$/i.test(s)) return true;
  return false;
}

export const CATALOG_FIX_NAME_LABEL = "Fix name";
export const CATALOG_NO_PRICE_LABEL = "No price";

/** Title-case each word for consistent shelf labels; keeps short ALL-CAPS tokens (e.g. SKU). */
export function normalizeProductDisplayName(name: string): string {
  const t = name.trim().replace(/\s+/g, " ");
  if (!t) return t;
  return t
    .split(" ")
    .map((word) => {
      if (word.length <= 4 && word === word.toUpperCase() && /[A-Z]/.test(word)) {
        return word;
      }
      if (word === word.toLowerCase() || word === word.toUpperCase()) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word;
    })
    .join(" ");
}

/** True when the stored name is empty, a UUID, or an import placeholder like IMP-{uuid}. */
export function isGarbageProductName(value: string | null | undefined): boolean {
  const t = value?.trim();
  if (!t) return true;
  if (looksLikeUuid(t)) return true;
  if (IMP_UUID_RE.test(t)) return true;
  return false;
}

export function isPlaceholderImportCategory(
  name: string | null | undefined,
): boolean {
  const t = name?.trim().toLowerCase();
  if (!t) return false;
  return t === "imported category" || t.startsWith("imported category ");
}

export function resolveCatalogCategoryLabel(
  name: string | null | undefined,
): string | null {
  const t = name?.trim();
  if (!t || isPlaceholderImportCategory(t)) return null;
  return t;
}

export type CatalogNameResolution = {
  label: string;
  needsNameFix: boolean;
};

function usableLabel(value: string | null | undefined): string | null {
  const t = value?.trim();
  if (!t || isGarbageProductName(t)) return null;
  return t;
}

/** Human-readable product title; never surfaces a raw UUID or IMP-{uuid} as the name. */
export function resolveCatalogItemName(input: {
  name?: string | null;
  sku?: string | null;
  variantName?: string | null;
}): CatalogNameResolution {
  const name = usableLabel(input.name);
  if (name) return { label: name, needsNameFix: false };

  const option = usableLabel(input.variantName);
  if (option) return { label: option, needsNameFix: false };

  const sku = usableLabel(input.sku);
  if (sku && !isInternalCatalogSku(sku)) {
    return { label: sku, needsNameFix: true };
  }

  return { label: CATALOG_FIX_NAME_LABEL, needsNameFix: true };
}

/** Second line under list row title — barcode, human SKU, or variant count; never parent name or IMP ids. */
export function resolveCatalogListSubtitle(
  row: {
    barcode?: string | null;
    sku?: string | null;
    name?: string | null;
    variantName?: string | null;
  },
  opts: {
    isVariant: boolean;
    isGroup: boolean;
    variantCount: number;
    primaryName: string;
    parentRow?: {
      name?: string | null;
      sku?: string | null;
      variantName?: string | null;
    } | null;
  },
): string | null {
  const barcode = row.barcode?.trim();
  if (barcode) return barcode;

  const sku = row.sku?.trim();
  const humanSku =
    sku && !isInternalCatalogSku(sku) && sku !== opts.primaryName ? sku : null;

  if (opts.isVariant) {
    return humanSku;
  }

  if ((opts.isGroup || opts.variantCount > 0) && opts.variantCount > 0) {
    return `${opts.variantCount} variant${opts.variantCount === 1 ? "" : "s"}`;
  }

  return humanSku;
}

/** Row ids whose display name duplicates a sibling under the same parent. */
export function findDuplicateCatalogRowIds(
  rows: Array<{
    id: string;
    name?: string | null;
    variantName?: string | null;
    variantOfItemId?: string | null;
  }>,
): Set<string> {
  const seen = new Map<string, string>();
  const duplicates = new Set<string>();
  for (const row of rows) {
    const parentKey = row.variantOfItemId?.trim() || row.id;
    const label = row.variantName?.trim() || row.name?.trim();
    if (!label || isGarbageProductName(label)) continue;
    const key = `${parentKey}::${label.toLowerCase()}`;
    const firstId = seen.get(key);
    if (firstId) {
      duplicates.add(firstId);
      duplicates.add(row.id);
    } else {
      seen.set(key, row.id);
    }
  }
  return duplicates;
}

/** Variant rows: prefer option label, then fall back to parent resolution. */
export function resolveCatalogVariantPrimaryName(input: {
  name?: string | null;
  sku?: string | null;
  variantName?: string | null;
}): CatalogNameResolution {
  const option = usableLabel(input.variantName);
  if (option) return { label: option, needsNameFix: false };
  return resolveCatalogItemName(input);
}
