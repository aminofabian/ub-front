/**
 * Fallback storefront SEO when a tenant has not set branding.metaTitle /
 * branding.metaDescription. Kept shopper-facing (not platform/POS copy).
 * Admins override these under Business → Branding → Search & social.
 */

export function defaultStorefrontMetaTitle(displayName: string): string {
  const name = displayName.trim() || "Neighborhood Shop";
  return `${name} | Neighborhood Shop`;
}

export function defaultStorefrontMetaDescription(displayName: string): string {
  const name = displayName.trim() || "Your neighborhood shop";
  return `${name} — your neighborhood shop. Browse products, check prices and stock, then pick up in store or get delivery. Fresh stock and fair prices.`;
}

export function defaultStorefrontMetaKeywords(displayName: string): string {
  const name = displayName.trim();
  return [
    name || undefined,
    "neighborhood shop",
    "local store",
    "shop online",
    "pick up in store",
    "delivery",
    "fair prices",
    "in stock",
  ]
    .filter(Boolean)
    .join(", ");
}
