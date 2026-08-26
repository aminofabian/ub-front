/** UUID v4 pattern for item ids in storefront URLs. */
const ITEM_ID_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeDecodeURIComponent(segment: string): string {
  const t = segment.trim();
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}

function uuidStringToBytes(uuid: string): Uint8Array | null {
  const hex = uuid.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return null;
  const u = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    u[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return u;
}

function bytesToUuidString(bytes: Uint8Array): string | null {
  if (bytes.length !== 16) return null;
  let h = "";
  for (let i = 0; i < 16; i++) {
    h += bytes[i]!.toString(16).padStart(2, "0");
  }
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** 16 raw bytes → 22-char base64url (shorter than hyphenated UUID). */
export function itemIdToCompactUrlId(id: string): string {
  const bytes = uuidStringToBytes(id);
  if (!bytes) return id;
  let b64: string;
  if (typeof Buffer !== "undefined") {
    b64 = Buffer.from(bytes).toString("base64");
  } else {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]!);
    }
    b64 = btoa(bin);
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/** Inverse of {@link itemIdToCompactUrlId}; accepts full UUID or base64url blob. */
export function compactUrlIdToItemId(suffix: string): string | null {
  const raw = suffix.trim();
  if (!raw) return null;
  if (ITEM_ID_UUID_RE.test(raw)) return raw;
  try {
    const pad = (4 - (raw.length % 4)) % 4;
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
    let bytes: Uint8Array;
    if (typeof Buffer !== "undefined") {
      const buf = Buffer.from(b64, "base64");
      if (buf.length !== 16) return null;
      bytes = new Uint8Array(buf);
    } else {
      const bin = atob(b64);
      if (bin.length !== 16) return null;
      bytes = new Uint8Array(16);
      for (let i = 0; i < 16; i++) bytes[i] = bin.charCodeAt(i);
    }
    const uuid = bytesToUuidString(bytes);
    if (uuid && ITEM_ID_UUID_RE.test(uuid)) return uuid;
    return null;
  } catch {
    return null;
  }
}

export function slugifyStorefrontItemSegment(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export type ShopItemUrlFields = {
  id?: string | null;
  sku: string;
  name?: string | null;
};

/** Pretty Shopify-style handle from the product name (falls back to SKU). */
export function shopItemHandleFromCard(item: ShopItemUrlFields): string {
  const fromName = item.name ? slugifyStorefrontItemSegment(item.name) : "";
  if (fromName) return fromName;
  const fromSku = slugifyStorefrontItemSegment(item.sku);
  return fromSku || item.sku.trim();
}

/** Variant token for `?variant=` — compact item id, else SKU. */
export function shopItemVariantFromCard(item: ShopItemUrlFields): string {
  const id = item.id?.trim();
  if (id) return itemIdToCompactUrlId(id);
  return item.sku.trim();
}

/**
 * Canonical product URL — matches Shopify shape:
 * `/products/{name-slug}?variant={id}`
 */
export function shopItemPathFromCard(item: ShopItemUrlFields): string {
  const handle = shopItemHandleFromCard(item);
  const variant = shopItemVariantFromCard(item);
  return `/products/${encodeURIComponent(handle)}?variant=${encodeURIComponent(variant)}`;
}

/** @deprecated Prefer {@link shopItemPathFromCard}. SKU-only helper. */
export function shopItemUrlSegmentFromCard(item: { sku: string }): string {
  return item.sku;
}

/** True when the URL handle (+ optional variant) matches the item. */
export function shopItemUrlSegmentIsCanonical(
  handle: string,
  item: ShopItemUrlFields,
  variant?: string | null,
): boolean {
  const decoded = safeDecodeURIComponent(handle);
  if (decoded !== shopItemHandleFromCard(item)) return false;
  if (variant == null || variant === "") return true;
  const v = safeDecodeURIComponent(variant);
  const id = item.id?.trim();
  if (id && (v === id || compactUrlIdToItemId(v) === id)) return true;
  return v === item.sku;
}

/** Resolve API item id / sku from a variant query or legacy URL segment. */
export function resolvePublicItemIdFromShopUrlSegment(segment: string): string | null {
  const raw = safeDecodeURIComponent(segment);
  if (!raw) return null;
  if (ITEM_ID_UUID_RE.test(raw)) return raw;
  const fromCompact = compactUrlIdToItemId(raw);
  if (fromCompact) return fromCompact;
  const marker = "--";
  const idx = raw.lastIndexOf(marker);
  if (idx !== -1) {
    const suffix = raw.slice(idx + marker.length);
    const compact = compactUrlIdToItemId(suffix);
    if (compact) return compact;
    if (suffix.length > 0) return suffix;
  }
  return null;
}

/**
 * Prefer `?variant=` (compact id / uuid / sku), else legacy `--id` in the
 * path, else the raw handle (sku or name slug for backend fallback).
 */
export function resolveShopProductLookupKey(
  handle: string,
  variant?: string | null,
): string {
  const v = variant?.trim();
  if (v) {
    return (
      resolvePublicItemIdFromShopUrlSegment(v) ||
      safeDecodeURIComponent(v) ||
      v
    );
  }
  const fromHandle = resolvePublicItemIdFromShopUrlSegment(handle);
  if (fromHandle) return fromHandle;
  return safeDecodeURIComponent(handle) || handle.trim();
}
