/** Compact sheet price — drop trailing .00 when whole. */
export function compactListPrice(value: number): string {
  const whole = Math.abs(value - Math.round(value)) < 0.005;
  if (whole) return Math.round(value).toLocaleString();
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Effective shelf sell: live selling-price row, else catalog bundlePrice. */
export function listSellPrice(
  row: {
    sellingPrice?: number | string | null;
    bundlePrice?: number | string | null;
  },
  toNumber: (v: string | number | null | undefined) => number | null,
): number | null {
  return toNumber(row.sellingPrice) ?? toNumber(row.bundlePrice);
}

/** Gross margin % on sell: (sell − buy) / sell × 100. */
export function listMarginPct(
  sell: number | null,
  buy: number | null,
): number | null {
  if (sell == null || sell <= 0 || buy == null || buy < 0) return null;
  return Math.round(((sell - buy) / sell) * 1000) / 10;
}
