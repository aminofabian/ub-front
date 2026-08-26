/**
 * New supply pack mode: the typed qty is packs, typed cost is pack price.
 * Stock and shelf math still use pieces and unit cost.
 */

export type SupplyPackMode = {
  unitsPerPack: number;
  packUnit: string;
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

/** Buying price of one sell-unit. Pack mode: typed cost is the pack price. */
export function supplyUnitCost(
  costStr: string,
  pack: SupplyPackMode | null | undefined,
): number | null {
  const c = toNonNeg(costStr);
  if (c == null) return null;
  if (!pack || !(pack.unitsPerPack > 0)) return c;
  return roundSupplyMoney(c / pack.unitsPerPack);
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

export function supplyRetailRevenue(
  qtyStr: string,
  sellStr: string,
  pack: SupplyPackMode | null | undefined,
): number | null {
  const stock = supplyStockQty(qtyStr, pack);
  const sell = toNonNeg(sellStr);
  if (stock == null || sell == null) return null;
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
