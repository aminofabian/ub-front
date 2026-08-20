import { APP_ROUTES } from "@/lib/config";
import type {
  MarketplaceCatalogProductPreview,
  MarketplaceSupplierDetail,
} from "@/lib/marketplace-api";
import { marketplaceWholesaleSupplierDescription } from "@/lib/supplier-passport-seo";

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

export function marketplaceSupplierPath(
  detail: Pick<MarketplaceSupplierDetail, "slug">,
  productSlug?: string | null,
): string {
  if (!detail.slug?.trim()) return APP_ROUTES.marketplace;
  const base = APP_ROUTES.marketplaceSupplier(detail.slug);
  const product = productSlug?.trim();
  if (!product) return base;
  return `${base}?p=${encodeURIComponent(product)}`;
}

/** Passport URL for a supplier catalogue product (shelf + selection), not the old /p/ page. */
export function marketplacePassportProductPath(
  supplierSlug: string | null | undefined,
  productSlug: string | null | undefined,
): string | null {
  if (!supplierSlug?.trim()) return null;
  const base = APP_ROUTES.marketplaceSupplier(supplierSlug.trim());
  if (!productSlug?.trim()) return base;
  return `${base}?p=${encodeURIComponent(productSlug.trim())}`;
}

export function marketplaceProductPath(
  detail: Pick<MarketplaceSupplierDetail, "slug">,
  product: Pick<MarketplaceCatalogProductPreview, "slug">,
): string {
  // Prefer the supplier passport with the product selected.
  return marketplaceSupplierPath(detail, product.slug);
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

export function supplierPortalClaimPath(phone?: string | null): string {
  const trimmed = phone?.trim();
  if (!trimmed) return APP_ROUTES.supplierPortalClaim;
  return `${APP_ROUTES.supplierPortalClaim}?phone=${encodeURIComponent(trimmed)}`;
}

export function marketplaceSupplierDescription(
  detail: MarketplaceSupplierDetail,
): string {
  return marketplaceWholesaleSupplierDescription(detail);
}

export function marketplaceProductDescription(
  detail: MarketplaceSupplierDetail,
  product: MarketplaceCatalogProductPreview,
): string {
  const parts = [
    product.categoryName
      ? `Wholesale ${product.categoryName.toLowerCase()} from ${detail.name}.`
      : `Wholesale ${product.name} from ${detail.name}.`,
    detail.location || detail.deliveryRegions[0]
      ? `Supplier covering ${detail.deliveryRegions[0] || detail.location}.`
      : null,
    [product.barcode, product.sku].filter(Boolean).join(" · ") || null,
  ].filter(Boolean);
  return (
    parts.join(" ").slice(0, 160) ||
    `Order wholesale ${product.name} from ${detail.name} on Kiosk.`
  );
}
