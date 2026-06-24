"use client";

import type { ItemSummaryRecord } from "@/lib/api";

const STORAGE_PREFIX = "palmart:topProducts:v1:";
const MAX_ENTRIES = 60;

export type TopProductRecord = {
  id: string;
  name: string;
  sku?: string;
  thumbnailUrl?: string | null;
  /** Last seen branch on-hand when this row was updated from catalog (optional). */
  stockQty?: number | string | null;
  /** Number of separate cart-add events. */
  count: number;
  /** Sum of quantities sold (rounded to 4 decimals). */
  qty: number;
  /** Epoch ms of last cart-add or sale event. */
  lastUsedAt: number;
};

type Store = {
  entries: Record<string, TopProductRecord>;
  updatedAt: number;
};

function emptyStore(): Store {
  return { entries: {}, updatedAt: 0 };
}

function storageKey(businessId: string | undefined | null): string {
  return `${STORAGE_PREFIX}${businessId?.trim() || "default"}`;
}

function readStore(businessId: string | undefined | null): Store {
  if (typeof window === "undefined") {
    return emptyStore();
  }
  try {
    const raw = window.localStorage.getItem(storageKey(businessId));
    if (!raw) {
      return emptyStore();
    }
    const parsed = JSON.parse(raw) as Store;
    if (parsed && typeof parsed === "object" && parsed.entries) {
      return parsed;
    }
  } catch {
    // ignore corrupt JSON
  }
  return emptyStore();
}

function writeStore(businessId: string | undefined | null, store: Store): void {
  if (typeof window === "undefined") {
    return;
  }
  let toPersist = store;
  const entries = Object.values(store.entries);
  if (entries.length > MAX_ENTRIES) {
    entries.sort(
      (a, b) =>
        b.count - a.count || b.qty - a.qty || b.lastUsedAt - a.lastUsedAt,
    );
    const trimmed: Record<string, TopProductRecord> = {};
    for (const e of entries.slice(0, MAX_ENTRIES)) {
      trimmed[e.id] = e;
    }
    toPersist = { entries: trimmed, updatedAt: store.updatedAt };
  }
  try {
    window.localStorage.setItem(storageKey(businessId), JSON.stringify(toPersist));
  } catch {
    // localStorage may be full or unavailable; safe to ignore.
  }
}

type ItemLike = Pick<ItemSummaryRecord, "id" | "name" | "sku" | "thumbnailUrl" | "stockQty">;

function mergeMeta(existing: TopProductRecord | undefined, item: ItemLike): {
  name: string;
  sku?: string;
  thumbnailUrl: string | null;
  stockQty?: number | string | null;
} {
  const stockQty =
    item.stockQty !== undefined ? item.stockQty : existing?.stockQty;
  return {
    name: item.name?.trim() || existing?.name || "Item",
    sku: item.sku?.trim() || existing?.sku,
    thumbnailUrl: item.thumbnailUrl ?? existing?.thumbnailUrl ?? null,
    ...(stockQty !== undefined ? { stockQty } : {}),
  };
}

/** Bump usage for a single item (e.g. a single cart add). */
export function recordItemUsage(
  businessId: string | undefined | null,
  item: ItemLike,
  qty = 1,
): void {
  const id = item.id?.trim();
  if (!id) {
    return;
  }
  const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
  const store = readStore(businessId);
  const existing = store.entries[id];
  const meta = mergeMeta(existing, item);
  store.entries[id] = {
    id,
    ...meta,
    count: (existing?.count ?? 0) + 1,
    qty: Math.round(((existing?.qty ?? 0) + safeQty) * 10000) / 10000,
    lastUsedAt: Date.now(),
  };
  store.updatedAt = Date.now();
  writeStore(businessId, store);
}

/** Bump usage for many items at once (e.g. on completed sale). */
export function recordSaleLines(
  businessId: string | undefined | null,
  lines: ReadonlyArray<{ item: ItemLike; qty: number }>,
): void {
  if (lines.length === 0) {
    return;
  }
  const store = readStore(businessId);
  const now = Date.now();
  for (const { item, qty } of lines) {
    const id = item.id?.trim();
    if (!id) {
      continue;
    }
    const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
    const existing = store.entries[id];
    const meta = mergeMeta(existing, item);
    store.entries[id] = {
      id,
      ...meta,
      count: (existing?.count ?? 0) + 1,
      qty: Math.round(((existing?.qty ?? 0) + safeQty) * 10000) / 10000,
      lastUsedAt: now,
    };
  }
  store.updatedAt = now;
  writeStore(businessId, store);
}

/**
 * Return the top products by count, then qty, then recency.
 * Only includes rows with real activity (cart adds / completed sales on this browser).
 * Data lives in localStorage under {@link storageKey}; it is not the server catalog.
 */
/** Drop a cached frequent item (e.g. after server reports the catalog row is gone). */
export function removeTopProduct(
  businessId: string | undefined | null,
  itemId: string,
): boolean {
  const id = itemId?.trim();
  if (!id) {
    return false;
  }
  const store = readStore(businessId);
  if (!store.entries[id]) {
    return false;
  }
  delete store.entries[id];
  store.updatedAt = Date.now();
  writeStore(businessId, store);
  return true;
}

export function getTopProducts(
  businessId: string | undefined | null,
  limit = 8,
): TopProductRecord[] {
  const store = readStore(businessId);
  const list = Object.values(store.entries).filter((e) => e.count > 0 || e.qty > 0);
  list.sort(
    (a, b) =>
      b.count - a.count || b.qty - a.qty || b.lastUsedAt - a.lastUsedAt,
  );
  return list.slice(0, Math.max(1, limit));
}

/** Stable hue (0-359) derived from the item id for tile gradients. */
export function tileHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}
