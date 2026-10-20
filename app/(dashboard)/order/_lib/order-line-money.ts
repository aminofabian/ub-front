import type { SupplierItemLinkRecord } from "@/lib/api";
import { resolveCurrencyCode } from "@/lib/money";

export type OrderLinePack = {
  size: number;
  price?: number | null;
} | null;

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Catalog cost for one loose unit, before a pack or a handwritten price. */
export function orderCatalogUnitCost(link: SupplierItemLinkRecord): number {
  const candidates = [
    link.lastCostPrice,
    link.defaultCostPrice,
    link.catalogBuyingPrice,
  ];
  for (const c of candidates) {
    const n = toNum(c);
    if (n > 0) return n;
  }
  return 0;
}

/**
 * Price for one qty step: a pack when the line is packed, otherwise one unit.
 * A handwritten override wins, matching the order slip.
 */
export function orderUnitPrice(
  link: SupplierItemLinkRecord,
  pack: OrderLinePack,
  priceOverride: number | null = null,
): number {
  if (priceOverride != null && priceOverride > 0) return priceOverride;
  if (pack && pack.size > 1) {
    if (pack.price != null && pack.price > 0) return pack.price;
    return orderCatalogUnitCost(link);
  }
  return orderCatalogUnitCost(link);
}

/** Line extension. A snapped total wins over unit × qty. */
export function orderLineAmount(
  unit: number,
  qty: number,
  totalOverride: number | null = null,
): number {
  if (totalOverride != null && totalOverride > 0) return totalOverride;
  return unit * qty;
}

/** Short mark beside an editable amount. KES stays "Ksh"; others use the code. */
export function orderMoneyPrefix(currency?: string | null): string {
  const code = resolveCurrencyCode(currency);
  return code === "KES" ? "Ksh" : code;
}
