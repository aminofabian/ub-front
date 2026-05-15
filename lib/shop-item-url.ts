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

/** 16 raw bytes → 22-char base64url (shorter than hyphenated UUID). Uses standard base64 + URL-safe chars (no Node `base64url` encoding — older runtimes lack it). */
function bytesToBase64Url(bytes: Uint8Array): string {
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

function base64UrlToBytes(s: string): Uint8Array | null {
  const t = s.trim();
  if (!t || !/^[A-Za-z0-9_-]+$/.test(t)) return null;
  try {
    const pad = (4 - (t.length % 4)) % 4;
    const b64 = t.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
    if (typeof Buffer !== "undefined") {
      const buf = Buffer.from(b64, "base64");
      return buf.length === 16 ? new Uint8Array(buf) : null;
    }
    const bin = atob(b64);
    if (bin.length !== 16) return null;
    const u = new Uint8Array(16);
    for (let i = 0; i < 16; i++) u[i] = bin.charCodeAt(i);
    return u;
  } catch {
    return null;
  }
}

/** Compact UUID for URL suffix (~22 chars vs 36). Non-UUID ids pass through unchanged. */
export function itemIdToCompactUrlId(id: string): string {
  const bytes = uuidStringToBytes(id);
  if (!bytes) return id;
  return bytesToBase64Url(bytes);
}

/** Inverse of {@link itemIdToCompactUrlId}; accepts full UUID or base64url blob. */
export function compactUrlIdToItemId(suffix: string): string | null {
  const raw = suffix.trim();
  if (!raw) return null;
  if (ITEM_ID_UUID_RE.test(raw)) return raw;
  const bytes = base64UrlToBytes(raw);
  if (!bytes) return null;
  const uuid = bytesToUuidString(bytes);
  if (uuid && ITEM_ID_UUID_RE.test(uuid)) return uuid;
  return null;
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

/** Product detail URL path: `/{sku}` */
export function shopItemUrlSegmentFromCard(item: {
  sku: string;
}): string {
  return item.sku;
}

/** True if the URL segment matches the item's SKU. */
export function shopItemUrlSegmentIsCanonical(
  segment: string,
  item: { sku: string },
): boolean {
  return safeDecodeURIComponent(segment) === item.sku;
}

/** `/:sku` (clean storefront product URL). */
export function shopItemHrefFromSegment(segment: string): string {
  return `/${encodeURIComponent(segment.trim())}`;
}

export function shopItemPathFromCard(item: {
  sku: string;
}): string {
  return shopItemHrefFromSegment(shopItemUrlSegmentFromCard(item));
}

/** Resolve API item id from `/shop/items/:segment` (bare UUID, `…--uuid`, or `…--base64url`). */
export function resolvePublicItemIdFromShopUrlSegment(segment: string): string | null {
  const raw = safeDecodeURIComponent(segment);
  if (!raw) return null;
  if (ITEM_ID_UUID_RE.test(raw)) return raw;
  const marker = "--";
  const idx = raw.lastIndexOf(marker);
  if (idx === -1) return null;
  const suffix = raw.slice(idx + marker.length);
  const fromCompact = compactUrlIdToItemId(suffix);
  if (fromCompact) return fromCompact;
  return suffix.length > 0 ? suffix : null;
}
