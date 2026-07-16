import {
  fetchAllocationPreview,
  postBatchDecrease,
  postStockIncrease,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import type { MeResponse } from "@/lib/api";

/** Owner/admin with inventory.write — direct on-hand stock edits. */
export function canAdminEditOnHandStock(
  me: MeResponse | null | undefined,
): boolean {
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  if (roleKey !== "owner" && roleKey !== "admin") {
    return false;
  }
  return hasPermission(me?.permissions, Permission.InventoryWrite);
}

/**
 * Set absolute on-hand qty for an item at a branch via increase or batch decrease.
 */
export async function setOnHandStock(opts: {
  itemId: string;
  branchId: string;
  current: number;
  target: number;
  unitCost?: number;
  notes?: string;
}): Promise<void> {
  const itemId = opts.itemId.trim();
  const branchId = opts.branchId.trim();
  if (!itemId || !branchId) {
    throw new Error("Item and branch are required to update stock.");
  }
  if (!Number.isFinite(opts.target) || opts.target < 0) {
    throw new Error("On-hand quantity must be zero or a positive number.");
  }
  const current = Number.isFinite(opts.current) ? opts.current : 0;
  const delta = Math.round((opts.target - current) * 10000) / 10000;
  if (Math.abs(delta) < 0.0001) {
    return;
  }

  const notes = opts.notes?.trim() || "Stock set from supplies";

  if (delta > 0) {
    const unitCost =
      opts.unitCost != null && Number.isFinite(opts.unitCost) && opts.unitCost >= 0
        ? opts.unitCost
        : 0;
    await postStockIncrease({
      branchId,
      itemId,
      quantity: delta,
      unitCost,
      notes,
    });
    return;
  }

  const decreaseQty = Math.abs(delta);
  const allocations = await fetchAllocationPreview({
    itemId,
    branchId,
    quantity: decreaseQty,
  });
  if (!allocations.length) {
    throw new Error("No batches available to reduce stock.");
  }
  let allocated = 0;
  for (const line of allocations) {
    const q = Number(line.quantity);
    if (!Number.isFinite(q) || q <= 0) {
      continue;
    }
    allocated += q;
    await postBatchDecrease({
      batchId: line.batchId,
      quantity: q,
      reason: notes,
    });
  }
  if (allocated < decreaseQty - 0.0001) {
    throw new Error(`Only ${allocated} could be removed from batches.`);
  }
}
