import type { PublicCatalogItemCard } from "@/lib/public-storefront";

type Priced = Pick<
  PublicCatalogItemCard,
  "price" | "regularPrice" | "savedAmount"
>;

export type ZetuDiscount = {
  /** Whole-number percentage, e.g. 30 for 30% off. */
  percent: number;
  /** Absolute amount off, in the shop currency. */
  saved: number;
};

/** Discount present on a card/PDP record, or null when it is full price. */
export function zetuDiscount(item: Priced): ZetuDiscount | null {
  const price = item.price;
  const regular = item.regularPrice;
  if (price == null || regular == null) return null;
  if (!Number.isFinite(price) || !Number.isFinite(regular)) return null;
  if (price <= 0 || regular <= price) return null;
  const saved = item.savedAmount ?? regular - price;
  const percent = Math.max(1, Math.round((1 - price / regular) * 100));
  return { percent, saved: Math.round(saved * 100) / 100 };
}

/** Highest live discount across a list (0 when the catalogue is full price). */
export function zetuMaxDiscount(items: readonly Priced[]): number {
  let max = 0;
  for (const item of items) {
    const discount = zetuDiscount(item);
    if (discount && discount.percent > max) max = discount.percent;
  }
  return max;
}

/**
 * A readable "budget friendly" ceiling for the deal tiles: the median price
 * rounded down to the nearest 500, floored at 1,000. Avoids inventing a
 * threshold the shop does not actually sell under.
 */
export function zetuBudgetCeiling(
  items: readonly Pick<PublicCatalogItemCard, "price">[],
): number | null {
  const prices = items
    .map((i) => i.price)
    .filter((p): p is number => p != null && Number.isFinite(p) && p > 0)
    .sort((a, b) => a - b);
  if (prices.length === 0) return null;
  const median = prices[Math.floor(prices.length / 2)]!;
  const rounded = Math.floor(median / 500) * 500;
  return Math.max(1000, rounded);
}

/** Product counts for the deal/hero chips. */
export function zetuCatalogueStats(items: readonly Priced[]): {
  sale: number;
  fullPrice: number;
  maxDiscount: number;
} {
  let sale = 0;
  let maxDiscount = 0;
  for (const item of items) {
    const discount = zetuDiscount(item);
    if (discount) {
      sale += 1;
      maxDiscount = Math.max(maxDiscount, discount.percent);
    }
  }
  return { sale, fullPrice: items.length - sale, maxDiscount };
}
