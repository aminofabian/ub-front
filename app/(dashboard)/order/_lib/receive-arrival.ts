/** How a receive line was counted. Stock does not move until put-away. */
export const ARRIVAL_AS_ORDERED = "as_ordered";
export const ARRIVAL_MISSING = "missing";
export const ARRIVAL_SHORT = "short";
export const ARRIVAL_DAMAGED = "damaged";

export const ARRIVAL_DECISIONS = [
  ARRIVAL_AS_ORDERED,
  ARRIVAL_MISSING,
  ARRIVAL_SHORT,
  ARRIVAL_DAMAGED,
] as const;

export type ArrivalDecision = (typeof ARRIVAL_DECISIONS)[number];

export const PUT_AWAY_STOCK = "stock";
export const PUT_AWAY_STORE = "store";

export type PutAwayDestination = typeof PUT_AWAY_STOCK | typeof PUT_AWAY_STORE;

export type ArrivalMap = Record<string, ArrivalDecision | undefined>;

export type CatalogLinkFields = {
  itemName: string;
  sku?: string | null;
  barcode?: string | null;
  supplierSku?: string | null;
  variantName?: string | null;
  parentItemName?: string | null;
};

export type PutAwayPlan = {
  stockLineIds: string[];
  storeLines: { id: string; qty: number }[];
};

const MOVES: readonly ArrivalDecision[] = [ARRIVAL_AS_ORDERED, ARRIVAL_SHORT];

function formatQty(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10000) / 10000);
}

/** Toggle a decision off when the same control is pressed again. */
export function nextArrival(
  current: ArrivalMap,
  lineId: string,
  kind: ArrivalDecision,
): ArrivalMap {
  const next = { ...current };
  if (current[lineId] === kind) delete next[lineId];
  else next[lineId] = kind;
  return next;
}

/**
 * Keep the label honest when the clerk edits the count.
 * Damaged stays damaged. A count with no decision yet becomes As ordered or Short.
 */
export function retargetArrival(
  current: ArrivalMap,
  lineId: string,
  qty: number,
  remaining: number,
): ArrivalMap {
  const decision = current[lineId];
  if (decision === ARRIVAL_DAMAGED) return current;
  if (qty <= 0) {
    if (decision == null) return current;
    return { ...current, [lineId]: ARRIVAL_MISSING };
  }
  if (qty < remaining) return { ...current, [lineId]: ARRIVAL_SHORT };
  return { ...current, [lineId]: ARRIVAL_AS_ORDERED };
}

export function arrivalPassComplete(openLineIds: readonly string[], decisions: ArrivalMap): boolean {
  if (openLineIds.length === 0) return false;
  return openLineIds.every((id) => decisions[id] != null);
}

export function arrivalStatusLabel(
  decision: ArrivalDecision,
  qty: number,
  ordered: number,
): string {
  if (decision === ARRIVAL_AS_ORDERED) return "As ordered";
  if (decision === ARRIVAL_MISSING) return "Didn't come";
  if (decision === ARRIVAL_DAMAGED) return `Damaged · ${formatQty(qty)}`;
  return `Short · ${formatQty(qty)} of ${formatQty(ordered)}`;
}

export function tallyArrival(openLineIds: readonly string[], decisions: ArrivalMap) {
  const tally = { asOrdered: 0, short: 0, missing: 0, damaged: 0, undecided: 0 };
  for (const id of openLineIds) {
    const decision = decisions[id];
    if (decision === ARRIVAL_AS_ORDERED) tally.asOrdered += 1;
    else if (decision === ARRIVAL_SHORT) tally.short += 1;
    else if (decision === ARRIVAL_MISSING) tally.missing += 1;
    else if (decision === ARRIVAL_DAMAGED) tally.damaged += 1;
    else tally.undecided += 1;
  }
  return tally;
}

/** Lines that leave the dock. Missing and damaged stay off the shelf. */
export function planPutAway(
  openLineIds: readonly string[],
  decisions: ArrivalMap,
  qtyByLine: Record<string, number>,
  destByLine: Record<string, PutAwayDestination>,
  fallback: PutAwayDestination = PUT_AWAY_STOCK,
): PutAwayPlan {
  const stockLineIds: string[] = [];
  const storeLines: { id: string; qty: number }[] = [];
  for (const id of openLineIds) {
    const decision = decisions[id];
    if (decision == null || !MOVES.includes(decision)) continue;
    const qty = qtyByLine[id] ?? 0;
    if (qty <= 0) continue;
    const dest = destByLine[id] ?? fallback;
    if (dest === PUT_AWAY_STORE) storeLines.push({ id, qty });
    else stockLineIds.push(id);
  }
  return { stockLineIds, storeLines };
}

/** Every active supplier link that matches the query. No cap, nothing hidden for being on the order. */
export function filterSupplierCatalog<T extends CatalogLinkFields>(
  links: readonly T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...links];
  return links.filter((link) => {
    const hay = [
      link.itemName,
      link.sku ?? "",
      link.barcode ?? "",
      link.supplierSku ?? "",
      link.variantName ?? "",
      link.parentItemName ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });
}
