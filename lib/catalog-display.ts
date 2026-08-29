/** Shared catalog labeling — UUID product names and import placeholder categories. */

import { shouldPreserveProductNameCasing } from "@/lib/catalog-display-policy";

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

const KEEP_ALL_CAPS = new Set([
  "SKU",
  "VAT",
  "POS",
  "ID",
  "TV",
  "PC",
  "USB",
  "LED",
  "HD",
  "UHD",
]);

/** Canonical shelf unit suffix after a quantity (2L, 500ml, 90g). */
function normalizeUnitSuffix(raw: string): string {
  const u = raw.toLowerCase();
  if (u === "l" || u.startsWith("lit")) return "L";
  if (u === "kg") return "kg";
  if (u === "g") return "g";
  return "ml";
}

/** Trim and collapse whitespace; preserves caller casing (inventory codes, imports). */
export function trimCatalogLabel(value: string | null | undefined): string {
  const t = value?.trim().replace(/\s+/g, " ");
  return t ?? "";
}

/**
 * Display/save formatter for product names — exact when the business setting is on,
 * otherwise legacy title-case normalization.
 */
export function formatProductNameForCatalog(name: string): string {
  const t = trimCatalogLabel(name);
  if (!t) return t;
  return shouldPreserveProductNameCasing() ? t : normalizeProductDisplayName(t);
}

/**
 * Title-case shelf labels for consumer-facing copy (categories, storefront teasers).
 * Product names use {@link trimCatalogLabel} so codes like `BL CVD-12` stay exact.
 * Also normalizes size tokens: 2Litres → 2L, 350ML → 350ml, 90G → 90g, "2 litre" → 2L.
 */
export function normalizeProductDisplayName(name: string): string {
  const t = name.trim().replace(/\s+/g, " ");
  if (!t) return t;

  const parts = t.split(" ");
  const out: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const word = parts[i];
    const next = parts[i + 1];

    const glued = word.match(
      /^(\d+(?:[.,]\d+)?)(ml|l|litres?|liters?|kg|g)$/i,
    );
    if (glued) {
      out.push(`${glued[1].replace(",", ".")}${normalizeUnitSuffix(glued[2])}`);
      continue;
    }

    if (
      next &&
      /^\d+(?:[.,]\d+)?$/.test(word) &&
      /^(ml|l|litres?|liters?|kg|g)$/i.test(next)
    ) {
      out.push(`${word.replace(",", ".")}${normalizeUnitSuffix(next)}`);
      i += 1;
      continue;
    }

    const spacedUnit = word.match(/^(ml|l|litres?|liters?|kg|g)$/i);
    if (spacedUnit) {
      out.push(normalizeUnitSuffix(spacedUnit[1]));
      continue;
    }

    const upper = word.toUpperCase();
    if (KEEP_ALL_CAPS.has(upper) && word.length <= 4) {
      out.push(upper);
      continue;
    }

    if (word === word.toLowerCase() || word === word.toUpperCase()) {
      out.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      continue;
    }

    out.push(word);
  }

  return out.join(" ");
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
  return normalizeProductDisplayName(t);
}

export type CatalogNameResolution = {
  label: string;
  needsNameFix: boolean;
};

/** Collective words that read as noise once a family name is folded into a product title. */
const FAMILY_FILLER_WORDS = new Set([
  "product",
  "products",
  "brand",
  "brands",
  "range",
  "collection",
]);

function trimFamilyFiller(family: string): string {
  const words = family.split(" ");
  if (words.length < 2) return family;
  return FAMILY_FILLER_WORDS.has(words[words.length - 1].toLowerCase())
    ? words.slice(0, -1).join(" ")
    : family;
}

function containsPhrase(haystack: string, needle: string): boolean {
  if (haystack === needle) return true;
  return (
    haystack.startsWith(`${needle} `) ||
    haystack.endsWith(` ${needle}`) ||
    haystack.includes(` ${needle} `)
  );
}

/**
 * Reads a family and an option label as a single product title:
 * "Velvex Products" + "Scouring Powder Lavender Fragrance 1Kg"
 * → "Velvex Scouring Powder Lavender Fragrance 1Kg".
 *
 * Drops whichever part already contains the other so brands and pack sizes are never repeated.
 */
export function joinProductNameParts(
  family: string | null | undefined,
  option: string | null | undefined,
): string {
  const opt = option?.trim().replace(/\s+/g, " ") ?? "";
  const fam = trimFamilyFiller(family?.trim().replace(/\s+/g, " ") ?? "");
  if (!fam) return opt;
  if (!opt) return fam;

  const famLower = fam.toLowerCase();
  const optLower = opt.toLowerCase();
  if (containsPhrase(optLower, famLower)) return opt;
  if (containsPhrase(famLower, optLower)) return fam;
  return `${fam} ${opt}`;
}

/** Appends a code (SKU / barcode) that identifies a row but isn't part of the product's name. */
export function withProductCode(name: string, code: string): string {
  return `${name} (${code})`;
}

function usableLabel(value: string | null | undefined): string | null {
  const t = trimCatalogLabel(value);
  if (!t || isGarbageProductName(t)) return null;
  return formatProductNameForCatalog(t);
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

export type CatalogVariantListTitle = {
  /** Parent / family name when it should be shown (search orphan variants). */
  family: string | null;
  /** Option / pack label (e.g. "Single 60 Sticks"). */
  option: string;
  /** Screen-reader / combined title: "Rhino Kubwa Single 60 Sticks". */
  combined: string;
  needsNameFix: boolean;
};

function labelsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * How a variant should read in the catalog list.
 *
 * When the parent row is already on screen (browse), keep the compact option-only
 * title under the parent. When the parent is missing (typical search hit), surface
 * the family name so "Single 60 Sticks" becomes "Rhino Kubwa Single 60 Sticks".
 */
export function resolveCatalogVariantListTitle(
  row: {
    name?: string | null;
    sku?: string | null;
    variantName?: string | null;
    brand?: string | null;
  },
  opts?: {
    parentInList?: boolean;
    parentRow?: {
      name?: string | null;
      sku?: string | null;
      variantName?: string | null;
    } | null;
  },
): CatalogVariantListTitle {
  const optionRes = resolveCatalogVariantPrimaryName(row);
  const option = optionRes.label;

  if (opts?.parentInList) {
    return {
      family: null,
      option,
      combined: option,
      needsNameFix: optionRes.needsNameFix,
    };
  }

  const fromParent = usableLabel(opts?.parentRow?.name);
  const fromOwnName = usableLabel(row.name);
  const fromBrand = usableLabel(row.brand);

  // "Rhino Kubwa Single 60 Sticks" + option "Single 60 Sticks" → family "Rhino Kubwa".
  const peeledFromName =
    fromOwnName && fromOwnName.length > option.length
      ? fromOwnName
          .replace(new RegExp(`[\\s·•|-]+${escapeRegExp(option)}\\s*$`, "i"), "")
          .trim()
      : "";
  const peeledFamily =
    peeledFromName &&
    peeledFromName.length < fromOwnName!.length &&
    !labelsMatch(peeledFromName, option)
      ? peeledFromName
      : null;

  const family =
    fromParent ??
    peeledFamily ??
    (fromOwnName && !labelsMatch(fromOwnName, option) ? fromOwnName : null) ??
    (fromBrand && !labelsMatch(fromBrand, option) ? fromBrand : null);

  if (!family) {
    return {
      family: null,
      option,
      combined: option,
      needsNameFix: optionRes.needsNameFix,
    };
  }

  return {
    family,
    option,
    combined: joinProductNameParts(family, option),
    needsNameFix: optionRes.needsNameFix,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
