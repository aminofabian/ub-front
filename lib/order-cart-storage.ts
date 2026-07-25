/**
 * Browser-local order cart for /order.
 * Survives refresh and navigation so mid-build order lists are not lost
 * before Place order commits a Path A purchase order.
 */

export const ORDER_CART_STORAGE_PREFIX = "palmart:orderCart:v1:";

export type OrderCartQty = Record<string, number>;

export type OrderCartPersisted = {
  v: 1;
  updatedAt: number;
  businessId: string;
  branchId: string;
  selectedSupplierId: string | null;
  cartsBySupplier: Record<string, OrderCartQty>;
};

function storageKey(businessId: string, branchId: string): string {
  return `${ORDER_CART_STORAGE_PREFIX}${businessId.trim()}:${branchId.trim() || "none"}`;
}

function readJson(key: string): OrderCartPersisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrderCartPersisted;
    if (parsed?.v !== 1 || typeof parsed.cartsBySupplier !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: OrderCartPersisted): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

function sanitizeCart(cart: OrderCartQty | undefined | null): OrderCartQty {
  if (!cart || typeof cart !== "object") return {};
  const next: OrderCartQty = {};
  for (const [itemId, qty] of Object.entries(cart)) {
    const id = itemId.trim();
    const n = typeof qty === "number" ? qty : Number.parseFloat(String(qty));
    if (!id || !Number.isFinite(n) || n <= 0) continue;
    next[id] = n;
  }
  return next;
}

export function readOrderCartDraft(
  businessId: string,
  branchId: string,
): OrderCartPersisted | null {
  const bid = businessId.trim();
  if (!bid) return null;
  const draft = readJson(storageKey(bid, branchId));
  if (!draft) return null;
  if (draft.businessId !== bid) return null;
  if ((draft.branchId || "") !== (branchId.trim() || "")) return null;
  return {
    ...draft,
    cartsBySupplier: Object.fromEntries(
      Object.entries(draft.cartsBySupplier).map(([supplierId, cart]) => [
        supplierId,
        sanitizeCart(cart),
      ]),
    ),
  };
}

export function writeOrderCartDraft(input: {
  businessId: string;
  branchId: string;
  selectedSupplierId: string | null;
  cartsBySupplier: Record<string, OrderCartQty>;
}): void {
  const businessId = input.businessId.trim();
  if (!businessId) return;
  const branchId = input.branchId.trim();
  const cartsBySupplier: Record<string, OrderCartQty> = {};
  for (const [supplierId, cart] of Object.entries(input.cartsBySupplier)) {
    const clean = sanitizeCart(cart);
    if (Object.keys(clean).length === 0) continue;
    cartsBySupplier[supplierId] = clean;
  }
  writeJson(storageKey(businessId, branchId), {
    v: 1,
    updatedAt: Date.now(),
    businessId,
    branchId,
    selectedSupplierId: input.selectedSupplierId,
    cartsBySupplier,
  });
}

export function clearOrderCartForSupplier(input: {
  businessId: string;
  branchId: string;
  supplierId: string;
}): void {
  const draft = readOrderCartDraft(input.businessId, input.branchId);
  if (!draft) return;
  const cartsBySupplier = { ...draft.cartsBySupplier };
  delete cartsBySupplier[input.supplierId];
  writeOrderCartDraft({
    businessId: input.businessId,
    branchId: input.branchId,
    selectedSupplierId: draft.selectedSupplierId,
    cartsBySupplier,
  });
}
