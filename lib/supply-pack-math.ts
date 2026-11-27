/**
 * New supply pack mode: typed qty is packs, typed cost is pack price, typed
 * sell is pack sell. Stock still lands as pieces. Catalog reads/writes convert
 * at the boundary when the SKU’s shelf price is per piece.
 */

import { isPackSellSku } from "@/lib/pack-sell-sku";

export type SupplyPackMode = {
  unitsPerPack: number;
  packUnit: string;
  /** Save this custom shape to the product when it is not a saved option yet. */
  remember?: boolean;
  /** Optional second packaging level (outer → inner → base item). */
  innerPackUnit?: string | null;
  innerPackCount?: number | null;
  baseUnitsPerInner?: number | null;
  /**
   * @deprecated Pack lines always price sell per pack. Kept so old drafts parse.
   */
  sellUnit?: "pack" | "piece";
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
 * True when a typed sell looks like a per-piece price next to a pack cost
 * (e.g. 15 each beside a 430 tray), not a pack sell (450 / tray).
 * Tight band around each-cost so a real low tray price (20) is left alone.
 */
export function sellLooksLikePiecePrice(
  sell: number,
  packPrice: number | null | undefined,
  unitsPerPack: number,
): boolean {
  if (!(unitsPerPack > 1) || !(sell >= 0)) return false;
  if (packPrice == null || !(packPrice > 0)) return false;
  const each = packPrice / unitsPerPack;
  if (!(each > 0)) return false;
  return sell >= each * 0.75 && sell <= each * 1.35;
}

/**
 * Lift a catalog/each sell onto the pack line so cost and sell share a unit.
 * Piece SKUs always multiply. Pack SKUs multiply only when the figure still
 * looks like an each price (heals 15-on-a-tray drafts).
 */
export function toPackLineSell(
  sell: number,
  unitsPerPack: number,
  packPrice: number | null | undefined,
  item?: SupplySellPricingItem | null,
): number {
  if (!(unitsPerPack > 1) || !(sell >= 0)) return sell;
  if (item && !isPackSellSku(item)) {
    return roundSupplyMoney(sell * unitsPerPack);
  }
  if (sellLooksLikePiecePrice(sell, packPrice, unitsPerPack)) {
    return roundSupplyMoney(sell * unitsPerPack);
  }
  return roundSupplyMoney(sell);
}

/** Collapse pack-line sell back to each when leaving pack mode. */
export function toPieceLineSell(sell: number, unitsPerPack: number): number {
  if (!(unitsPerPack > 1) || !(sell >= 0)) return sell;
  return roundSupplyMoney(sell / unitsPerPack);
}

/**
 * Pack-denominated sell for margin / revenue, even if the draft still holds an
 * each price from before the fix.
 */
export function supplyPackSell(
  sellStr: string,
  costStr: string,
  pack: SupplyPackMode | null | undefined,
  item?: SupplySellPricingItem | null,
): number | null {
  const sell = toNonNeg(sellStr);
  if (sell == null) return null;
  if (!pack || !(pack.unitsPerPack > 0)) return sell;
  const packPrice = toNonNeg(costStr);
  return toPackLineSell(sell, pack.unitsPerPack, packPrice, item);
}

/**
 * Cost compared to the (pack) sell price for margin / below-cost.
 * Pack mode → pack price. Otherwise → unit cost.
 */
export function supplyMarginCost(
  costStr: string,
  pack: SupplyPackMode | null | undefined,
): number | null {
  if (pack && pack.unitsPerPack > 0) {
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
 * Expected shelf take if every received pack sold at the pack sell price.
 * Pack mode always uses packs × pack-sell (after normalizing each→pack).
 */
export function supplyRetailRevenue(
  qtyStr: string,
  sellStr: string,
  pack: SupplyPackMode | null | undefined,
  item?: SupplySellPricingItem | null,
  costStr?: string,
): number | null {
  if (!pack || !(pack.unitsPerPack > 0)) {
    const stock = supplyStockQty(qtyStr, pack);
    const sell = toNonNeg(sellStr);
    if (stock == null || sell == null) return null;
    return roundSupplyMoney(stock * sell);
  }
  const packs = toPositive(qtyStr);
  const packSell = supplyPackSell(sellStr, costStr ?? "", pack, item);
  if (packs == null || packSell == null) return null;
  return roundSupplyMoney(packs * packSell);
}

/**
 * Shelf price to post to the catalog from a pack-line sell.
 * Pack SKUs keep the pack price; piece SKUs store each.
 */
export function toCatalogSellPrice(
  packLineSell: number,
  pack: SupplyPackMode | null | undefined,
  item?: SupplySellPricingItem | null,
): number {
  if (!pack || !(pack.unitsPerPack > 1)) return packLineSell;
  if (isPackSellSku(item)) return roundSupplyMoney(packLineSell);
  return roundSupplyMoney(packLineSell / pack.unitsPerPack);
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
