import type { ItemSummaryRecord } from "@/lib/api";

/** List rows may include catalog unit fields when the API sends them. */
type ButcherCatalogRow = ItemSummaryRecord & {
  isWeighed?: boolean;
  unitType?: string;
};

/** How the butcher counter sells a catalog row. */
export type ButcherSellBy = "kg" | "piece";

const WEIGHT_UNITS = new Set(["kg", "g", "lb", "kilogram", "gram", "pound"]);

/** Maps catalog fields to butcher tile behaviour (weight sheet vs tap-to-add). */
export function resolveButcherSellBy(item: ButcherCatalogRow): ButcherSellBy {
  if (item.isWeighed === true) {
    return "kg";
  }
  const unit = (item.unitType ?? "").trim().toLowerCase();
  if (WEIGHT_UNITS.has(unit)) {
    return "kg";
  }
  return "piece";
}

export function butcherUnitSuffix(sellBy: ButcherSellBy): string {
  return sellBy === "kg" ? "/kg" : "/piece";
}

export function formatButcherTilePrice(
  amount: number | string | null | undefined,
  currency: string,
  sellBy: ButcherSellBy,
): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (n == null || !Number.isFinite(n) || n < 0) {
    return "—";
  }
  const rounded = Math.round(n * 100) / 100;
  const num = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  const code = currency.trim();
  const suffix = butcherUnitSuffix(sellBy);
  return code ? `${code} ${num}${suffix}` : `${num}${suffix}`;
}

export const BUTCHER_QUICK_WEIGHTS_KG = [0.25, 0.5, 1, 1.5, 2] as const;
