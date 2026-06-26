import type { ItemSummaryRecord } from "@/lib/api";
import {
  CATALOG_FIX_NAME_LABEL,
  looksLikeUuid,
  resolveCatalogItemName,
} from "@/lib/catalog-display";

/** Import / legacy rows sometimes store placeholder text instead of a real option label. */
const GENERIC_VARIANT_LABELS = new Set(["variant", "option", "variation", "default"]);

export function isGenericVariantLabel(raw: string | undefined): boolean {
  const t = raw?.trim().toLowerCase();
  if (!t) {
    return true;
  }
  return GENERIC_VARIANT_LABELS.has(t);
}

/** Title for POS lists: parent name plus option label when this row is a variant SKU. */
export function cashierItemPrimaryLabel(row: ItemSummaryRecord): string {
  const resolved = resolveCatalogItemName(row);
  if (resolved.needsNameFix) {
    return CATALOG_FIX_NAME_LABEL;
  }
  const name = resolved.label;
  const option = row.variantName?.trim();
  if (option && !isGenericVariantLabel(option) && !looksLikeUuid(option)) {
    return `${name} · ${option}`;
  }
  if (row.variantOfItemId) {
    const sku = row.sku?.trim();
    return sku && !looksLikeUuid(sku) ? `${name} · ${sku}` : name;
  }
  return name;
}

/**
 * Supplier catalog / admin pickers: always distinguish variant SKUs — parent plus option label,
 * or parent plus SKU when `variantName` is absent or a placeholder (legacy/import rows).
 */
export function itemCatalogDisplayTitle(row: ItemSummaryRecord): string {
  const resolved = resolveCatalogItemName(row);
  if (resolved.needsNameFix) {
    return CATALOG_FIX_NAME_LABEL;
  }
  const name = resolved.label;
  if (!row.variantOfItemId) {
    return name;
  }
  const option = row.variantName?.trim();
  if (option && !isGenericVariantLabel(option) && !looksLikeUuid(option)) {
    return `${name} · ${option}`;
  }
  const sku = row.sku?.trim();
  return sku && !looksLikeUuid(sku) ? `${name} · ${sku}` : name;
}

/** Barcode-mirror / import-placeholder SKUs — not shown on POS; prefer availability instead. */
export function isInternalPosSku(sku: string): boolean {
  const s = sku.trim();
  if (!s) {
    return true;
  }
  if (/^BC-\d{8,}$/i.test(s)) {
    return true;
  }
  if (
    /^IMP-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  ) {
    return true;
  }
  return false;
}

function toStockNumber(raw: number | string | null | undefined): number | null {
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }
  const n = typeof raw === "string" ? Number(raw.trim()) : raw;
  return Number.isFinite(n) ? n : null;
}

function formatStockQty(raw: ItemSummaryRecord["stockQty"]): string | null {
  const n = toStockNumber(raw);
  if (n == null) {
    return null;
  }
  if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-6) {
    return String(Math.round(n));
  }
  return (Math.round(n * 10000) / 10000).toString();
}

/** Package/bundle SKU that deducts stock from the parent in base units (tray, case, etc.). */
export function isPosPackageSellRow(row: ItemSummaryRecord): boolean {
  if (row.packageVariant) {
    return true;
  }
  const units = posPackageUnitsPerSale(row);
  return units != null && units > 1 && !!row.variantOfItemId;
}

/**
 * Base units per package sold. Prefer API {@link ItemSummaryRecord.packageUnitsPerSale};
 * infer from branch stock when list rows are stale (e.g. 120 base ÷ 4 trays → 30).
 */
export function posPackageUnitsPerSale(row: ItemSummaryRecord): number | null {
  const fromApi = toStockNumber(row.packageUnitsPerSale);
  if (fromApi != null && fromApi > 0) {
    return Math.round(fromApi);
  }
  const base = toStockNumber(row.baseStockQty);
  const pkgs = toStockNumber(row.stockQty);
  if (
    row.variantOfItemId &&
    base != null &&
    pkgs != null &&
    pkgs > 0 &&
    base >= pkgs
  ) {
    const ratio = base / pkgs;
    if (Math.abs(ratio - Math.round(ratio)) < 1e-6 && ratio >= 1) {
      return Math.round(ratio);
    }
  }
  return null;
}

/** Merge catalog list row with item detail for branch-accurate package stock in the POS modal. */
export function mergePosItemStockFromDetail(
  listRow: ItemSummaryRecord,
  detail: {
    packageVariant?: boolean;
    packagingUnitQty?: number | string | null;
    packageUnitsPerSale?: number | string | null;
    stockQty?: number | string | null;
    baseStockQty?: number | string | null;
  },
): ItemSummaryRecord {
  const units =
    toStockNumber(detail.packageUnitsPerSale) ??
    toStockNumber(detail.packagingUnitQty);
  return {
    ...listRow,
    packageVariant: detail.packageVariant ?? listRow.packageVariant,
    packageUnitsPerSale: listRow.packageUnitsPerSale ?? units ?? undefined,
    stockQty: detail.stockQty ?? listRow.stockQty,
    baseStockQty: detail.baseStockQty ?? listRow.baseStockQty,
  };
}

function posPackageLabel(row: ItemSummaryRecord): string {
  const name = row.variantName?.trim();
  if (name && !isGenericVariantLabel(name)) {
    return name;
  }
  return "package";
}

/** Short sellable unit for copy — "Tray of 30" → tray, "Half Tray" → half tray. */
export function posPackageShortName(row: ItemSummaryRecord): string {
  const name = row.variantName?.trim();
  if (!name || isGenericVariantLabel(name)) {
    return "pack";
  }
  const ofSplit = name.match(/^(.+?)\s+of\s+[\d.,]+/i);
  if (ofSplit?.[1]) {
    return ofSplit[1].trim().toLowerCase();
  }
  return name.toLowerCase();
}

function pluralPackageUnit(shortName: string, count: number): string {
  const unit = shortName.toLowerCase();
  if (count === 1) {
    return unit;
  }
  if (unit.endsWith("s") || unit.endsWith("x")) {
    return unit;
  }
  return `${unit}s`;
}

/**
 * One-line package availability for POS (modal, search, cart).
 * e.g. "26 trays ready", "Only 2 trays left", "Sold out".
 */
export function posPackageStockHeadline(
  row: ItemSummaryRecord,
  allowNegativeStock = false,
): string {
  const unit = posPackageShortName(row);
  if (allowNegativeStock) {
    const units = posPackageUnitsPerSale(row);
    if (units != null) {
      const base = toStockNumber(row.baseStockQty);
      const fromList = toStockNumber(row.stockQty);
      const stockBase = base ?? fromList;
      if (stockBase != null && stockBase <= 0) {
        return "0 on hand";
      }
    }
  }
  const avail = posAvailablePackages(row, allowNegativeStock);
  if (avail == null) {
    return "—";
  }
  if (avail === 0) {
    return allowNegativeStock ? "0 on hand" : "Sold out";
  }
  if (avail === 1) {
    return `Last ${unit} left`;
  }
  if (avail <= 5) {
    return `Only ${avail} ${pluralPackageUnit(unit, avail)} left`;
  }
  return `${avail} ${pluralPackageUnit(unit, avail)} ready`;
}

function pluralPackageLabel(label: string, count: number): string {
  return pluralPackageUnit(
    label.toLowerCase().replace(/\s+of\s+[\d.,]+$/i, "").trim() || "pack",
    count,
  );
}

/**
 * Whole packages available at the branch. Uses base stock ÷ units per package when the API
 * provides {@link ItemSummaryRecord.baseStockQty}; otherwise falls back to {@link stockQty}.
 */
export function posAvailablePackages(
  row: ItemSummaryRecord,
  allowNegativeStock = false,
): number | null {
  if (!isPosPackageSellRow(row)) {
    return null;
  }
  const units = posPackageUnitsPerSale(row);
  if (units == null) {
    return null;
  }
  const base = toStockNumber(row.baseStockQty);
  if (base != null) {
    if (base <= 0 && allowNegativeStock) {
      return null;
    }
    if (base >= 0) {
      return Math.floor(base / units);
    }
  }
  const fromList = toStockNumber(row.stockQty);
  if (fromList != null) {
    if (fromList <= 0 && allowNegativeStock) {
      return null;
    }
    if (fromList >= 0) {
      return Math.floor(fromList);
    }
  }
  return null;
}

/** Optional fine print under quantity — size of one package in base units. */
export function posPackageQuantityHint(row: ItemSummaryRecord): string | null {
  const units = posPackageUnitsPerSale(row);
  if (units == null || units <= 1) {
    return null;
  }
  const unit = posPackageShortName(row);
  return `Each ${unit} · ${units} pcs`;
}

/** Redundant with {@link posPackageStockHeadline}; kept for callers that still read it. */
export function posPackageMaxQuantityHint(_row: ItemSummaryRecord): string | null {
  return null;
}

/** Human-facing SKU for POS subtitles only (hides internal patterns; hides when same as barcode). */
export function displaySkuForPos(row: ItemSummaryRecord): string | null {
  const sku = row.sku?.trim();
  if (!sku || isInternalPosSku(sku)) {
    return null;
  }
  const bc = row.barcode?.trim();
  if (bc && sku === bc) {
    return null;
  }
  return sku;
}

function posAvailabilitySubtitle(stockLabel: string | null, skuLabel: string | null): string {
  if (stockLabel != null) {
    const avail = `${stockLabel} available`;
    return skuLabel ? `${avail} · ${skuLabel}` : avail;
  }
  if (skuLabel) {
    return skuLabel;
  }
  return "—";
}

/**
 * POS search / cart / modal row: on-hand count as "{n} available", optional human SKU. Omits barcode and internal SKUs.
 * When the list was requested without `branchId`, stock is omitted from the API.
 */
export function posSearchItemDetailLine(
  row: ItemSummaryRecord,
  allowNegativeStock = false,
): string {
  if (!isPosPackageSellRow(row)) {
    return posAvailabilitySubtitle(formatStockQty(row.stockQty), displaySkuForPos(row));
  }
  return posPackageStockHeadline(row, allowNegativeStock);
}

/** Top seller tile — same rules; uses optional cached `stockQty` from last add. */
export function posTopProductSubtitle(p: {
  sku?: string;
  stockQty?: ItemSummaryRecord["stockQty"];
}): string {
  const stock = formatStockQty(p.stockQty);
  const skuRaw = p.sku?.trim();
  const sku =
    skuRaw && !isInternalPosSku(skuRaw) ? skuRaw : null;
  return posAvailabilitySubtitle(stock, sku);
}

/** Extra text on cart line title: availability, or human SKU in parens — never internal IDs. */
export function posCartLineSuffix(item: ItemSummaryRecord): string {
  if (isPosPackageSellRow(item)) {
    const avail = posAvailablePackages(item);
    if (avail != null) {
      const unit = posPackageShortName(item);
      return ` (${avail} ${pluralPackageUnit(unit, avail)})`;
    }
  }
  const stock = formatStockQty(item.stockQty);
  if (stock != null) {
    return ` (${stock} available)`;
  }
  const sku = displaySkuForPos(item);
  return sku ? ` (${sku})` : "";
}

/** Secondary line: SKU, and barcode when it differs (common for imported retail IDs). */
export function cashierItemDetailLine(row: ItemSummaryRecord): string {
  const sku = row.sku?.trim() || "";
  const bc = row.barcode?.trim() || "";
  if (!sku) {
    return bc || "no sku";
  }
  if (!bc || bc === sku) {
    return sku;
  }
  return `${sku} · ${bc}`;
}
