import { APP_ROUTES } from "@/lib/config";
import type {
  MarketplaceCatalogProductPreview,
  MarketplaceSupplierDetail,
} from "@/lib/marketplace-api";

const ID_MARKER = "--";

function safeDecode(segment: string): string {
  const t = segment.trim();
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}

/** Mirrors backend {@link MarketplaceSlugService.slugify}. */
export function slugifyMarketplaceSegment(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/, "");
}

export function marketplaceIdPrefix(id: string): string {
  const suffix = id.replace(/-/g, "").toLowerCase();
  return suffix.length > 8 ? suffix.slice(0, 8) : suffix;
}

export function extractMarketplaceIdPrefix(slug: string): string | null {
  const raw = safeDecode(slug);
  if (!raw) return null;

  const marker = raw.lastIndexOf(ID_MARKER);
  if (marker >= 0 && marker < raw.length - ID_MARKER.length) {
    return normalizeHexSuffix(raw.slice(marker + ID_MARKER.length));
  }

  const dash = raw.lastIndexOf("-");
  if (dash < 0 || dash >= raw.length - 1) return null;
  return normalizeHexSuffix(raw.slice(dash + 1));
}

function normalizeHexSuffix(suffix: string): string | null {
  const hex = suffix.toLowerCase();
  if (!/^[0-9a-f]{6,12}$/.test(hex)) return null;
  return hex.length > 8 ? hex.slice(0, 8) : hex;
}

export function marketplaceSupplierPath(detail: Pick<MarketplaceSupplierDetail, "slug">): string {
  if (!detail.slug?.trim()) return APP_ROUTES.marketplace;
  return APP_ROUTES.marketplaceSupplier(detail.slug);
}

export function marketplaceProductPath(
  detail: Pick<MarketplaceSupplierDetail, "slug">,
  product: Pick<MarketplaceCatalogProductPreview, "slug">,
): string {
  if (!detail.slug?.trim() || !product.slug?.trim()) {
    return marketplaceSupplierPath(detail);
  }
  return APP_ROUTES.marketplaceProduct(detail.slug, product.slug);
}

export function marketplaceSupplierSlugIsCanonical(
  segment: string,
  detail: Pick<MarketplaceSupplierDetail, "slug">,
): boolean {
  const canonical = detail.slug?.trim();
  if (!canonical) return true;
  return safeDecode(segment).toLowerCase() === canonical.toLowerCase();
}

export function marketplaceProductSlugIsCanonical(
  segment: string,
  product: Pick<MarketplaceCatalogProductPreview, "slug">,
): boolean {
  const canonical = product.slug?.trim();
  if (!canonical) return true;
  return safeDecode(segment).toLowerCase() === canonical.toLowerCase();
}

export function findMarketplaceProduct(
  detail: MarketplaceSupplierDetail,
  productSlug: string,
): MarketplaceCatalogProductPreview | null {
  const needle = safeDecode(productSlug);
  if (!needle) return null;

  const exact = detail.products.find(
    (p) => p.slug && p.slug.toLowerCase() === needle.toLowerCase(),
  );
  if (exact) return exact;

  const idPrefix = extractMarketplaceIdPrefix(needle);
  if (!idPrefix) return null;

  const candidates = detail.products.filter(
    (p) => marketplaceIdPrefix(p.id) === idPrefix,
  );
  return candidates.length === 1 ? candidates[0]! : null;
}

export function marketplaceSupplierDescription(
  detail: MarketplaceSupplierDetail,
): string {
  const parts = [
    detail.description?.trim(),
    detail.location ? `Located in ${detail.location}.` : null,
    detail.products.length
      ? `${detail.products.length} product${detail.products.length === 1 ? "" : "s"} listed.`
      : null,
    detail.listedBy ? `Listed by ${detail.listedBy}.` : null,
  ].filter(Boolean);
  return (
    parts.join(" ").slice(0, 160) ||
    `Browse products from ${detail.name} on Kiosk Marketplace.`
  );
}

export function marketplaceProductDescription(
  detail: MarketplaceSupplierDetail,
  product: MarketplaceCatalogProductPreview,
): string {
  const parts = [
    product.categoryName ? `${product.categoryName} from ${detail.name}.` : null,
    detail.location ? `Supplier in ${detail.location}.` : null,
    [product.barcode, product.sku].filter(Boolean).join(" · ") || null,
  ].filter(Boolean);
  return (
    parts.join(" ").slice(0, 160) ||
    `${product.name} from ${detail.name} on Kiosk Marketplace.`
  );
}
