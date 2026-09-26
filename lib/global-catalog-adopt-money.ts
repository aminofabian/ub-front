/**
 * AdoptLineRequest rejects buying/selling below 0.01 and openingUnitCost below 0.0001.
 * Omit invalid values so the API can fall back to catalog defaults / skip cost.
 */

const MIN_SHELF_MONEY = 0.01;
const MIN_UNIT_COST = 0.0001;

function finiteNumber(value: number | null | undefined): number | undefined {
  if (value == null) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

/** Selling / buying price for adopt lines — omit when below backend @DecimalMin(0.01). */
export function adoptShelfMoney(
  value: number | null | undefined,
): number | undefined {
  const n = finiteNumber(value);
  if (n == null || n < MIN_SHELF_MONEY) return undefined;
  return n;
}

/** Opening unit cost — omit when below backend @DecimalMin(0.0001). */
export function adoptOpeningUnitCost(
  value: number | null | undefined,
): number | undefined {
  const n = finiteNumber(value);
  if (n == null || n < MIN_UNIT_COST) return undefined;
  return n;
}
