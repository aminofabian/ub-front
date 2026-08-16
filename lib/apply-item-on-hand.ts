import {
  fetchAllocationPreview,
  postBatchDecrease,
  postStockIncrease,
} from "@/lib/api";

function roundQty(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Set branch on-hand to an absolute quantity (increase via stock-increase,
 * decrease via batch allocation). Returns the applied target.
 */
export async function applyItemOnHandQty(opts: {
  branchId: string;
  itemId: string;
  current: number;
  target: number;
  unitCost?: number;
  notes?: string;
}): Promise<number> {
  const branchId = opts.branchId.trim();
  const itemId = opts.itemId.trim();
  const current = Number(opts.current);
  const target = Number(opts.target);
  if (!branchId || !itemId) {
    throw new Error("Branch and item are required.");
  }
  if (!Number.isFinite(target) || target < 0) {
    throw new Error("Enter a quantity of zero or more.");
  }
  const from = Number.isFinite(current) ? current : 0;
  const delta = roundQty(target - from);
  if (Math.abs(delta) < 0.0001) {
    return from;
  }
  const notes = opts.notes?.trim() || "Stock set from grocery counter";

  if (delta > 0) {
    const unitCost = opts.unitCost ?? 0;
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new Error("Unit cost must be zero or more.");
    }
    await postStockIncrease({
      branchId,
      itemId,
      quantity: delta,
      unitCost,
      notes,
    });
    return target;
  }

  const decreaseQty = Math.abs(delta);
  const allocations = await fetchAllocationPreview({
    itemId,
    branchId,
    quantity: decreaseQty,
  });
  if (!allocations.length) {
    throw new Error("Could not allocate stock to remove for this branch.");
  }
  let allocated = 0;
  for (const line of allocations) {
    const q = Number(line.quantity);
    if (!Number.isFinite(q) || q <= 0) continue;
    allocated += q;
    await postBatchDecrease({
      batchId: line.batchId,
      quantity: q,
      reason: notes,
    });
  }
  if (allocated < decreaseQty - 0.0001) {
    throw new Error(
      `Only ${allocated} could be removed; check batch availability.`,
    );
  }
  return target;
}

export function itemStockQty(stockQty: number | string | null | undefined): number {
  const n = Number(stockQty);
  return Number.isFinite(n) ? n : 0;
}
