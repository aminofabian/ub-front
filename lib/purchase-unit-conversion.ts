import type { ItemDetailRecord, ItemSummaryRecord, SupplierItemLinkRecord } from "@/lib/api";

/** Purchase units shown in receiving forms — independent of the product's sale unit. */
export const COMMON_PURCHASE_UNITS = [
  "kg",
  "g",
  "lb",
  "each",
  "crate",
  "tray",
  "box",
  "case",
] as const;

export type PurchaseUnitOption = {
  value: string;
  label: string;
};

const KG_PER_UNIT: Record<string, number> = {
  kg: 1,
  kilogram: 1,
  kilograms: 1,
  g: 0.001,
  gram: 0.001,
  grams: 0.001,
  lb: 0.453592,
  pound: 0.453592,
  pounds: 0.453592,
  each: 1,
  pc: 1,
  piece: 1,
};

function normUnit(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function labelForUnit(value: string): string {
  const v = normUnit(value);
  if (v === "kg") return "kg";
  if (v === "g") return "g";
  if (v === "lb") return "lb";
  if (v === "each" || v === "pc") return "each";
  return value.trim();
}

function toPositiveNumber(
  raw: number | string | null | undefined,
): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function variantUnitName(row: ItemSummaryRecord): string | null {
  const packaging = (row as ItemSummaryRecord & { packagingUnitName?: string })
    .packagingUnitName;
  const fromPackaging = packaging?.trim();
  if (fromPackaging) return fromPackaging;
  const variant = row.variantName?.trim();
  if (variant) return variant;
  return null;
}

/** Build unit dropdown options for a catalog row (base + package variants + weight alternates). */
export function buildPurchaseUnitOptions(
  item: ItemDetailRecord | null,
  variants: ItemSummaryRecord[] = [],
): PurchaseUnitOption[] {
  const seen = new Set<string>();
  const options: PurchaseUnitOption[] = [];

  const push = (raw: string) => {
    const value = normUnit(raw);
    if (!value || seen.has(value)) return;
    seen.add(value);
    options.push({ value, label: labelForUnit(raw) });
  };

  const baseUnit = item?.unitType?.trim() || "kg";
  push(baseUnit);

  if (item?.isWeighed || ["kg", "g", "lb"].includes(normUnit(baseUnit))) {
    for (const u of ["kg", "g", "lb"]) push(u);
  }

  for (const v of variants) {
    const name = variantUnitName(v);
    if (name) push(name);
  }

  const packagingName = item?.packagingUnitName?.trim();
  if (packagingName) push(packagingName);

  for (const u of COMMON_PURCHASE_UNITS) {
    push(u);
  }

  return options;
}

export type StockReceiptResolution = {
  catalogItemId: string;
  usableQty: number;
  /** When the purchase unit could not be mapped and qty was passed through 1:1. */
  conversionNote?: string;
};

/**
 * Maps purchase qty + unit to Path B {@code usableQty} and catalog item id.
 * Package units (crate, tray) prefer a matching package-variant SKU so the server
 * applies {@code packagingUnitQty}; weight units convert into the item's stock unit.
 */
export function resolveStockReceiptLine(
  purchaseQty: number,
  purchaseUnit: string,
  item: ItemDetailRecord,
  variants: ItemSummaryRecord[] = [],
  link?: SupplierItemLinkRecord | null,
): StockReceiptResolution {
  const unit = normUnit(purchaseUnit);
  const qty = purchaseQty;

  if (link?.packUnit && link.packSize != null) {
    const packUnit = normUnit(link.packUnit);
    const packSize = toPositiveNumber(link.packSize);
    if (packUnit && packSize && packUnit === unit) {
      return {
        catalogItemId: item.id,
        usableQty: Math.round(qty * packSize * 10000) / 10000,
      };
    }
  }

  for (const variant of variants) {
    const variantUnit = variantUnitName(variant);
    if (!variantUnit) continue;
    if (normUnit(variantUnit) === unit) {
      return { catalogItemId: variant.id, usableQty: qty };
    }
  }

  const itemPackaging = item.packagingUnitName?.trim();
  if (itemPackaging && normUnit(itemPackaging) === unit && item.packageVariant) {
    return { catalogItemId: item.id, usableQty: qty };
  }

  const stockUnit = normUnit(item.unitType?.trim() || "kg");
  const purchaseKg = KG_PER_UNIT[unit];
  const stockKg = KG_PER_UNIT[stockUnit];

  if (purchaseKg != null && stockKg != null && (item.isWeighed || stockKg !== 1)) {
    const stockQty = (qty * purchaseKg) / stockKg;
    return {
      catalogItemId: item.id,
      usableQty: Math.round(stockQty * 10000) / 10000,
    };
  }

  if (unit === stockUnit || unit === "each" || stockUnit === "each") {
    return { catalogItemId: item.id, usableQty: qty };
  }

  const unitsPerPackage = toPositiveNumber(item.packagingUnitQty);
  if (unitsPerPackage && (unit === "crate" || unit === "case" || unit === "box")) {
    return {
      catalogItemId: item.id,
      usableQty: Math.round(qty * unitsPerPackage * 10000) / 10000,
      conversionNote: `Treated 1 ${unit} as ${unitsPerPackage} ${stockUnit} from product packaging.`,
    };
  }

  return {
    catalogItemId: item.id,
    usableQty: qty,
    conversionNote: `No conversion rule for "${purchaseUnit}" — posted ${qty} ${stockUnit} as entered.`,
  };
}

export function defaultPurchaseUnit(
  item: ItemDetailRecord | null,
  link?: SupplierItemLinkRecord | null,
): string {
  const fromLink = link?.packUnit?.trim();
  if (fromLink) return normUnit(fromLink);
  const base = item?.unitType?.trim();
  if (base) return normUnit(base);
  return "kg";
}

export function parseCostMoney(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export function parsePurchaseQty(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function linePurchaseTotal(qty: number, costPerUnit: number): number {
  return Math.round(qty * costPerUnit * 100) / 100;
}

export type ReceiveMarginHint = {
  costPerStockUnit: number;
  sellPerStockUnit: number;
  marginPercent: number;
  stockUnitLabel: string;
};

/** Buy vs shelf margin for a receive line (stock-unit cost vs item bundle price). */
export function computeReceiveMarginHint(
  purchaseQty: number,
  purchaseUnit: string,
  costPerPurchaseUnit: number,
  item: ItemDetailRecord,
  variants: ItemSummaryRecord[] = [],
  link?: SupplierItemLinkRecord | null,
): ReceiveMarginHint | null {
  const sellRaw = item.bundlePrice;
  if (sellRaw == null || sellRaw === "") return null;
  const sell =
    typeof sellRaw === "number" ? sellRaw : Number(String(sellRaw).trim());
  if (!Number.isFinite(sell) || sell <= 0) return null;

  const resolved = resolveStockReceiptLine(
    purchaseQty,
    purchaseUnit,
    item,
    variants,
    link,
  );
  if (resolved.usableQty <= 0) return null;

  const lineCost = linePurchaseTotal(purchaseQty, costPerPurchaseUnit);
  const costPerStockUnit =
    Math.round((lineCost / resolved.usableQty) * 10000) / 10000;
  const marginPercent =
    Math.round(((sell - costPerStockUnit) / sell) * 1000) / 10;
  if (!Number.isFinite(marginPercent)) return null;

  const stockUnitLabel = normUnit(item.unitType?.trim() || "kg") || "kg";
  return {
    costPerStockUnit,
    sellPerStockUnit: sell,
    marginPercent,
    stockUnitLabel,
  };
}
