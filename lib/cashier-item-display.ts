import type { ItemSummaryRecord } from "@/lib/api";

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
  const name = row.name?.trim() || "Item";
  const option = row.variantName?.trim();
  if (option && !isGenericVariantLabel(option)) {
    return `${name} · ${option}`;
  }
  if (row.variantOfItemId) {
    const sku = row.sku?.trim();
    return sku ? `${name} · ${sku}` : name;
  }
  return name;
}

/**
 * Supplier catalog / admin pickers: always distinguish variant SKUs — parent plus option label,
 * or parent plus SKU when `variantName` is absent or a placeholder (legacy/import rows).
 */
export function itemCatalogDisplayTitle(row: ItemSummaryRecord): string {
  const name = row.name?.trim() || "Item";
  if (!row.variantOfItemId) {
    return name;
  }
  const option = row.variantName?.trim();
  if (option && !isGenericVariantLabel(option)) {
    return `${name} · ${option}`;
  }
  const sku = row.sku?.trim();
  return sku ? `${name} · ${sku}` : name;
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

function formatStockQty(raw: ItemSummaryRecord["stockQty"]): string | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  const n = typeof raw === "string" ? Number(raw.trim()) : raw;
  if (!Number.isFinite(n)) {
    return null;
  }
  if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-6) {
    return String(Math.round(n));
  }
  return (Math.round(n * 10000) / 10000).toString();
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
export function posSearchItemDetailLine(row: ItemSummaryRecord): string {
  return posAvailabilitySubtitle(formatStockQty(row.stockQty), displaySkuForPos(row));
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
