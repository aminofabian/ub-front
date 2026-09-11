/** Work-list helpers for the Shoppers board (warehouse V1). */

export function medianNumber(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Wholesale-shaped: at least two tills and a basket at least 5× the shop
 * median in this window, with a KSh 2,000 floor so a tiny shop does not
 * flag every slightly-larger purchase.
 */
export function isWholesaleShaped(
  avgBasket: number,
  saleCount: number,
  medianBasket: number,
): boolean {
  const floor = Math.max(medianBasket * 5, 2_000);
  return saleCount >= 2 && avgBasket >= floor;
}

export function captureLinkedPct(
  identifiedSaleCount: number,
  walkInSaleCount: number,
): number {
  const total = identifiedSaleCount + walkInSaleCount;
  if (total <= 0) return 0;
  return Math.round((identifiedSaleCount / total) * 100);
}

export function directoryCustomerId(
  customerId: string | null | undefined,
): string | null {
  const value = customerId?.trim() ?? "";
  if (!value || value.startsWith("mpesa:")) return null;
  return value;
}
