import {
  fetchAllocationPreview,
  fetchItemById,
  postBatchDecrease,
  postStockIncrease,
  type MeResponse,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

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

function parseQty(raw: number | string | null | undefined): number | null {
  if (raw == null || String(raw).trim() === "") {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export type StockHolderResolution = {
  /** Catalog / linked SKU the user is editing. */
  catalogItemId: string;
  /** Item that owns inventory batches / current_stock. */
  holderItemId: string;
  /** Absolute on-hand on the holder (base units). */
  holderCurrent: number;
  /**
   * Qty shown for this catalog row (packages for package variants, else holder units).
   */
  displayCurrent: number;
  /**
   * Multiply a display-unit target by this to get holder-unit target.
   * 1 for normal SKUs; packaging units per sale for package variants.
   */
  displayToHolderFactor: number;
};

/**
 * Resolve where on-hand stock lives for a catalog SKU (package/option children
 * hold stock on the parent base product).
 */
export async function resolveStockHolderForEdit(opts: {
  itemId: string;
  branchId: string;
}): Promise<StockHolderResolution> {
  const catalogItemId = opts.itemId.trim();
  const branchId = opts.branchId.trim();
  if (!catalogItemId || !branchId) {
    throw new Error("Item and branch are required to update stock.");
  }

  const detail = await fetchItemById(catalogItemId, { branchId });
  const parentId = detail.variantOfItemId?.trim() || null;
  const units = parseQty(detail.packageUnitsPerSale);
  const isPackage =
    detail.packageVariant === true ||
    (units != null && units > 0 && Boolean(parentId));
  const unstockedChild =
    detail.isStocked === false && Boolean(parentId);

  const holderItemId =
    (isPackage || unstockedChild) && parentId ? parentId : catalogItemId;

  let holderCurrent = 0;
  let displayCurrent = 0;
  let displayToHolderFactor = 1;

  if (holderItemId !== catalogItemId) {
    const holder =
      holderItemId === catalogItemId
        ? detail
        : await fetchItemById(holderItemId, { branchId });
    const base =
      parseQty(detail.baseStockQty) ??
      parseQty(holder.stockQty) ??
      parseQty(holder.currentStock) ??
      0;
    holderCurrent = base;
    if (isPackage && units != null && units > 0) {
      displayToHolderFactor = units;
      displayCurrent =
        parseQty(detail.stockQty) ??
        Math.floor(base / units);
    } else {
      displayCurrent = base;
    }
  } else {
    holderCurrent =
      parseQty(detail.stockQty) ?? parseQty(detail.currentStock) ?? 0;
    displayCurrent = holderCurrent;
  }

  return {
    catalogItemId,
    holderItemId,
    holderCurrent,
    displayCurrent,
    displayToHolderFactor,
  };
}

/**
 * Set absolute on-hand qty for an item at a branch via increase or batch decrease.
 * Pass the inventory holder id (base product for package variants).
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

/**
 * Set on-hand for a catalog SKU, resolving package/base holders automatically.
 * {@code target} is in the same units shown for that catalog row (packages or each).
 * Returns the display qty after the update.
 */
export async function setCatalogOnHandStock(opts: {
  itemId: string;
  branchId: string;
  /** Display-unit target (packages for package variants). */
  targetDisplay: number;
  unitCost?: number;
  notes?: string;
}): Promise<number> {
  const resolved = await resolveStockHolderForEdit({
    itemId: opts.itemId,
    branchId: opts.branchId,
  });
  const factor = resolved.displayToHolderFactor;
  const holderTarget =
    Math.round(opts.targetDisplay * factor * 10000) / 10000;
  await setOnHandStock({
    itemId: resolved.holderItemId,
    branchId: opts.branchId,
    current: resolved.holderCurrent,
    target: holderTarget,
    unitCost: opts.unitCost,
    notes: opts.notes,
  });
  return opts.targetDisplay;
}
