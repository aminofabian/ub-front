/**
 * New supply pack mode: the typed qty is packs, typed cost is pack price.
 * Stock still lands as pieces. Shelf sell may be per pack (tray SKU) or per
 * piece (base SKU bought in cartons) — revenue and margin follow that.
 */

import { isPackSellSku } from "@/lib/pack-sell-sku";

export type SupplyPackSellUnit = "pack" | "piece";

export type SupplyPackMode = {
  unitsPerPack: number;
  packUnit: string;
  /** Save this custom shape to the product when it is not a saved option yet. */
  remember?: boolean;
  /**
   * How the typed sell price is read. Pack = same unit as cost (tray @ 450).
   * Piece = shelf each (sachets from a carton). Omitted → infer from catalog.
   */
  sellUnit?: SupplyPackSellUnit;
  /** Optional second packaging level (outer → inner → base item). */
  innerPackUnit?: string | null;
  innerPackCount?: number | null;
  baseUnitsPerInner?: number | null;
};

export type SupplySellPricingItem = {
  packageVariant?: boolean | null;
  variantOfItemId?: string | null;
  packageUnitsPerSale?: number | string | null;
  packagingUnitQty?: number | string | null;
  isStocked?: boolean | null;
};

function toPositive(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toNonNeg(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function formatSupplyQty(n: number): string {
  const r = Math.round(n * 10000) / 10000;
  return Number.isInteger(r) ? String(r) : String(r);
}

export function formatSupplyMoney(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

export function roundSupplyMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function resolvePackSize(
  pack: SupplyPackMode | null | undefined,
  fallback?: number | string | null,
): number | null {
  if (pack && pack.unitsPerPack > 0) return pack.unitsPerPack;
  return toPositive(fallback);
}

/**
 * True when shelf sell is priced per pack (Eggs Large Tray @ 450/tray),
 * not per piece (Royco sachets bought in a carton of 40).
 */
export function supplySellPerPack(
  pack: SupplyPackMode | null | undefined,
  item?: SupplySellPricingItem | null,
): boolean {
  if (!pack || !(pack.unitsPerPack > 0)) return false;
  if (pack.sellUnit === "pack") return true;
  if (pack.sellUnit === "piece") return false;
  if (isPackSellSku(item)) return true;
  const sale = toPositive(
    item?.packageUnitsPerSale ?? item?.packagingUnitQty ?? null,
  );
  if (sale == null || sale <= 1) return false;
  return Math.abs(sale - pack.unitsPerPack) < 0.0001;
}

/** Default sell-unit choice when opening the pack sheet. */
export function inferSupplyPackSellUnit(
  item?: SupplySellPricingItem | null,
  unitsPerPack?: number | null,
): SupplyPackSellUnit {
  if (isPackSellSku(item)) return "pack";
  const sale = toPositive(
    item?.packageUnitsPerSale ?? item?.packagingUnitQty ?? null,
  );
  if (
    sale != null &&
    sale > 1 &&
    unitsPerPack != null &&
    Math.abs(sale - unitsPerPack) < 0.0001
  ) {
    return "pack";
  }
  if (sale != null && sale <= 1) return "piece";
  // Known base SKU without pack flags → shelf is each.
  if (item && !isPackSellSku(item)) return "piece";
  // Ad-hoc / unknown: cost and sell share the pack unit on the line.
  return "pack";
}

/** Pack noun for labels: "tray", "carton". */
export function supplyPackUnitLabel(
  pack: SupplyPackMode | null | undefined,
): string {
  const unit = pack?.packUnit?.trim();
  return unit || "pack";
}

/**
 * Pieces that actually hit the shelf.
 * Pack mode: typed qty is packs.
 */
export function supplyStockQty(
  qtyStr: string,
  pack: SupplyPackMode | null | undefined,
): number | null {
  const q = toPositive(qtyStr);
  if (q == null) return null;
  if (!pack || !(pack.unitsPerPack > 0)) return q;
  return Math.round(q * pack.unitsPerPack * 10000) / 10000;
}

/** Typed pack count (or unit qty when not packed). */
export function supplyEntryQty(
  qtyStr: string,
  pack: SupplyPackMode | null | undefined,
): number | null {
  void pack;
  return toPositive(qtyStr);
}

/** Buying price of one base unit. Pack mode: typed cost is the pack price. */
export function supplyUnitCost(
  costStr: string,
  pack: SupplyPackMode | null | undefined,
): number | null {
  const c = toNonNeg(costStr);
  if (c == null) return null;
  if (!pack || !(pack.unitsPerPack > 0)) return c;
  return roundSupplyMoney(c / pack.unitsPerPack);
}

/**
 * Cost to compare against the typed sell price for margin / below-cost.
 * Pack-priced shelf → pack price. Piece-priced shelf → unit cost.
 */
export function supplyMarginCost(
  costStr: string,
  pack: SupplyPackMode | null | undefined,
  sellPerPack: boolean,
): number | null {
  if (sellPerPack && pack && pack.unitsPerPack > 0) {
    return toNonNeg(costStr);
  }
  return supplyUnitCost(costStr, pack);
}

/** Payable for the line: packs × pack price, or units × unit cost. */
export function supplyLineTotal(
  qtyStr: string,
  costStr: string,
  pack: SupplyPackMode | null | undefined,
): number | null {
  const q = toPositive(qtyStr);
  const c = toNonNeg(costStr);
  if (q == null || c == null) return null;
  return roundSupplyMoney(q * c);
}

/**
 * Expected shelf take if every received unit sold at the typed sell price.
 * Pack-priced SKUs: packs × sell. Otherwise pieces × sell.
 */
export function supplyRetailRevenue(
  qtyStr: string,
  sellStr: string,
  pack: SupplyPackMode | null | undefined,
  sellPerPack = false,
): number | null {
  const sell = toNonNeg(sellStr);
  if (sell == null) return null;
  if (sellPerPack && pack && pack.unitsPerPack > 0) {
    const packs = toPositive(qtyStr);
    if (packs == null) return null;
    return roundSupplyMoney(packs * sell);
  }
  const stock = supplyStockQty(qtyStr, pack);
  if (stock == null) return null;
  return roundSupplyMoney(stock * sell);
}

/**
 * Turn a unit-qty / unit-cost line into pack entry.
 * If current qty is an exact multiple of pack size, collapse to that many packs
 * (12 pieces of a 12-pack → 1). Otherwise keep the typed number as pack count.
 */
export function toPackEntry(
  qtyStr: string,
  unitStr: string,
  unitsPerPack: number,
): { qtyStr: string; unitStr: string } {
  const size = toPositive(unitsPerPack);
  if (size == null) return { qtyStr, unitStr };
  const units = toPositive(qtyStr);
  const unitCost = toNonNeg(unitStr);

  let nextQty = qtyStr;
  if (units != null) {
    const packs = units / size;
    const rounded = Math.round(packs * 10000) / 10000;
    if (rounded >= 1 && Math.abs(rounded * size - units) < 0.0001) {
      nextQty = formatSupplyQty(rounded);
    }
  }

  let nextCost = unitStr;
  if (unitCost != null) {
    nextCost = formatSupplyMoney(unitCost * size);
  }
  return { qtyStr: nextQty, unitStr: nextCost };
}

/** Expand pack entry back to pieces and unit cost. */
export function toUnitEntry(
  qtyStr: string,
  unitStr: string,
  unitsPerPack: number,
): { qtyStr: string; unitStr: string } {
  const size = toPositive(unitsPerPack);
  if (size == null) return { qtyStr, unitStr };
  const packs = toPositive(qtyStr);
  const packPrice = toNonNeg(unitStr);
  return {
    qtyStr: packs != null ? formatSupplyQty(packs * size) : qtyStr,
    unitStr:
      packPrice != null ? formatSupplyMoney(packPrice / size) : unitStr,
  };
}

/**
 * Human label for a posted receipt line's packaging snapshot:
 * "2 × carton · 24 per carton · 1,200.00 per carton = 48 units".
 * Returns null for legacy lines that were posted before packaging was recorded.
 */
export function supplyPackSnapshotLabel(line: {
  purchaseUnit?: string | null;
  purchaseQty?: number | string | null;
  unitsPerPurchaseUnit?: number | string | null;
  packPrice?: number | string | null;
  baseUnit?: string | null;
}): string | null {
  const unit = line.purchaseUnit?.trim();
  const packs = toPositive(line.purchaseQty);
  const units = toPositive(line.unitsPerPurchaseUnit);
  if (!unit || packs == null || units == null || units <= 1) return null;
  const total = Math.round(packs * units * 10000) / 10000;
  const price = toNonNeg(line.packPrice);
  const base = line.baseUnit?.trim() || "units";
  const plural = Math.abs(packs - 1) < 0.0001 ? unit : `${unit}s`;
  const pricePart =
    price != null ? ` · ${formatSupplyMoney(price)} per ${unit}` : "";
  return `${formatSupplyQty(packs)} × ${plural}${pricePart} · ${formatSupplyQty(units)} per ${unit} = ${formatSupplyQty(total)} ${base}`;
}
