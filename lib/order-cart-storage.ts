/**
 * Browser-local order cart for /order.
 * Survives refresh and navigation so mid-build order lists are not lost
 * before Place order commits a Path A purchase order.
 */

export const ORDER_CART_STORAGE_PREFIX = "palmart:orderCart:v1:";

export type OrderCartQty = Record<string, number>;

/** Buyer-opted pack choice on a cart line (same shape as marketplace). */
export type OrderCartPackSelection = {
  packOptionId: string | null;
  size: number;
  unit: string;
  /** Price for ONE pack; null when unknown. */
  price: number | null;
};

export type OrderCartPackMeta = Record<string, OrderCartPackSelection>;

/** Buyer-adjusted price for one cart line (unit or pack, matching the qty unit). */
export type OrderCartPriceMeta = Record<string, number>;

export type OrderCartPersisted = {
  v: 1;
  updatedAt: number;
  businessId: string;
  branchId: string;
  selectedSupplierId: string | null;
  cartsBySupplier: Record<string, OrderCartQty>;
  /** Optional pack choices keyed like cartsBySupplier. */
  packsBySupplier?: Record<string, OrderCartPackMeta>;
  /** Optional unit/pack price overrides keyed like cartsBySupplier. */
  pricesBySupplier?: Record<string, OrderCartPriceMeta>;
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

function sanitizePackMeta(
  packs: OrderCartPackMeta | undefined | null,
): OrderCartPackMeta {
  if (!packs || typeof packs !== "object") return {};
  const next: OrderCartPackMeta = {};
  for (const [itemId, pack] of Object.entries(packs)) {
    const id = itemId.trim();
    if (!id || !pack || typeof pack !== "object") continue;
    const size = Number(pack.size);
    if (!Number.isFinite(size) || size <= 1) continue;
    const priceRaw = pack.price;
    const price =
      priceRaw == null
        ? null
        : typeof priceRaw === "number"
          ? priceRaw
          : Number(priceRaw);
    next[id] = {
      packOptionId:
        typeof pack.packOptionId === "string" && pack.packOptionId.trim()
          ? pack.packOptionId.trim()
          : null,
      size,
      unit:
        typeof pack.unit === "string" && pack.unit.trim()
          ? pack.unit.trim()
          : "pack",
      price: price != null && Number.isFinite(price) && price >= 0 ? price : null,
    };
  }
  return next;
}

function sanitizePriceMeta(
  prices: OrderCartPriceMeta | undefined | null,
): OrderCartPriceMeta {
  if (!prices || typeof prices !== "object") return {};
  const next: OrderCartPriceMeta = {};
  for (const [itemId, raw] of Object.entries(prices)) {
    const id = itemId.trim();
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!id || !Number.isFinite(n) || n < 0) continue;
    next[id] = Math.round(n * 10000) / 10000;
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
    packsBySupplier: Object.fromEntries(
      Object.entries(draft.packsBySupplier ?? {}).map(([supplierId, packs]) => [
        supplierId,
        sanitizePackMeta(packs),
      ]),
    ),
    pricesBySupplier: Object.fromEntries(
      Object.entries(draft.pricesBySupplier ?? {}).map(([supplierId, prices]) => [
        supplierId,
        sanitizePriceMeta(prices),
      ]),
    ),
  };
}

export function writeOrderCartDraft(input: {
  businessId: string;
  branchId: string;
  selectedSupplierId: string | null;
  cartsBySupplier: Record<string, OrderCartQty>;
  packsBySupplier?: Record<string, OrderCartPackMeta>;
  pricesBySupplier?: Record<string, OrderCartPriceMeta>;
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
  const packsBySupplier: Record<string, OrderCartPackMeta> = {};
  for (const [supplierId, packs] of Object.entries(
    input.packsBySupplier ?? {},
  )) {
    if (!cartsBySupplier[supplierId]) continue;
    const clean = sanitizePackMeta(packs);
    // Drop pack entries for items no longer in the cart.
    const pruned: OrderCartPackMeta = {};
    for (const [itemId, pack] of Object.entries(clean)) {
      if (cartsBySupplier[supplierId][itemId] != null) pruned[itemId] = pack;
    }
    if (Object.keys(pruned).length === 0) continue;
    packsBySupplier[supplierId] = pruned;
  }
  const pricesBySupplier: Record<string, OrderCartPriceMeta> = {};
  for (const [supplierId, prices] of Object.entries(
    input.pricesBySupplier ?? {},
  )) {
    if (!cartsBySupplier[supplierId]) continue;
    const clean = sanitizePriceMeta(prices);
    const pruned: OrderCartPriceMeta = {};
    for (const [itemId, price] of Object.entries(clean)) {
      if (cartsBySupplier[supplierId][itemId] != null) pruned[itemId] = price;
    }
    if (Object.keys(pruned).length === 0) continue;
    pricesBySupplier[supplierId] = pruned;
  }
  writeJson(storageKey(businessId, branchId), {
    v: 1,
    updatedAt: Date.now(),
    businessId,
    branchId,
    selectedSupplierId: input.selectedSupplierId,
    cartsBySupplier,
    packsBySupplier:
      Object.keys(packsBySupplier).length > 0 ? packsBySupplier : undefined,
    pricesBySupplier:
      Object.keys(pricesBySupplier).length > 0 ? pricesBySupplier : undefined,
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
  const packsBySupplier = { ...(draft.packsBySupplier ?? {}) };
  delete packsBySupplier[input.supplierId];
  const pricesBySupplier = { ...(draft.pricesBySupplier ?? {}) };
  delete pricesBySupplier[input.supplierId];
  writeOrderCartDraft({
    businessId: input.businessId,
    branchId: input.branchId,
    selectedSupplierId: draft.selectedSupplierId,
    cartsBySupplier,
    packsBySupplier,
    pricesBySupplier,
  });
}
