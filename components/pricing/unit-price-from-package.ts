/**
 * Per-unit price from a package: `package price ÷ units`.
 *
 * This is the same idea as the supplies line editor's
 * `unitCostFromLineTotal` — enter what a whole package cost and how many units
 * it held, get the unit price back.
 *
 * `decimals` must match the destination column, whose scale differs:
 * `items.buying_price` and SMS `unit_price_kes` are scale 2, while
 * `inventory_batches.unit_cost` is scale 4. Rounding here keeps the
 * calculator's answer identical to what will actually be stored.
 */
export function unitPriceFromPackage(
  units: number,
  packagePrice: number,
  decimals = 2,
): number {
  if (!(units > 0) || !(packagePrice > 0)) return 0;
  const factor = 10 ** decimals;
  return Math.round((packagePrice / units) * factor) / factor;
}
