import { APP_ROUTES } from "@/lib/config";
import type { PublicCategory } from "@/lib/public-storefront";

/** Public shop category URLs: `/shop/c/:slug`. */
export const SHOP_CATEGORY_PATH_PREFIX = `${APP_ROUTES.shop}/c/` as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Fallback segment when slug is missing (DB requires slug; this is defensive). */
export function slugifyStorefrontCategorySegment(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "category";
}

export function storefrontCategoryPathSlug(
  c: Pick<PublicCategory, "slug" | "name">,
): string {
  const raw = c.slug?.trim();
  if (raw) return raw;
  return slugifyStorefrontCategorySegment(c.name);
}

/**
 * Resolve a category from the `/shop/c/:segment` path or a legacy `categoryId` UUID.
 */
export function findCategoryForStorefrontPath(
  categories: PublicCategory[],
  pathSegment: string,
): PublicCategory | null {
  const decoded = decodeURIComponent(pathSegment.trim());
  if (!decoded) return null;
  if (UUID_RE.test(decoded)) {
    const byId = categories.find((c) => c.id === decoded);
    if (byId) return byId;
  }
  for (const c of categories) {
    const seg = storefrontCategoryPathSlug(c);
    if (seg === decoded) return c;
    if (seg.toLowerCase() === decoded.toLowerCase()) return c;
  }
  const want = decoded.toLowerCase();
  for (const c of categories) {
    if (slugifyStorefrontCategorySegment(c.name) === want) return c;
  }
  return null;
}

/** Pathname segment after `/shop/c/` (no leading slash), or "" if not on a category URL. */
export function activeStorefrontCategorySlugFromPathname(pathname: string): string {
  if (!pathname.startsWith(SHOP_CATEGORY_PATH_PREFIX)) return "";
  return pathname.slice(SHOP_CATEGORY_PATH_PREFIX.length).split("/")[0] ?? "";
}

export type ShopListQuery = {
  q?: string;
  /** Prefer {@link categoryPathSlug} — kept for internal redirects / old links. */
  categoryId?: string;
  /** Segment for `/shop/c/:slug` */
  categoryPathSlug?: string;
  cursor?: string;
};

export function shopCategoryListPath(
  categorySlug: string,
  query?: { q?: string; cursor?: string },
): string {
  const seg = encodeURIComponent(categorySlug.trim());
  const p = new URLSearchParams();
  const q = query?.q?.trim();
  const cursor = query?.cursor?.trim();
  if (q) p.set("q", q);
  if (cursor) p.set("cursor", cursor);
  const qs = p.toString();
  return qs
    ? `${SHOP_CATEGORY_PATH_PREFIX}${seg}?${qs}`
    : `${SHOP_CATEGORY_PATH_PREFIX}${seg}`;
}

export function shopListPath(query: ShopListQuery): string {
  const pathSlug = query.categoryPathSlug?.trim();
  if (pathSlug) {
    return shopCategoryListPath(pathSlug, {
      q: query.q,
      cursor: query.cursor,
    });
  }
  const p = new URLSearchParams();
  const q = query.q?.trim();
  const categoryId = query.categoryId?.trim();
  const cursor = query.cursor?.trim();
  if (q) {
    p.set("q", q);
  }
  if (categoryId) {
    p.set("categoryId", categoryId);
  }
  if (cursor) {
    p.set("cursor", cursor);
  }
  const qs = p.toString();
  return qs ? `${APP_ROUTES.shop}?${qs}` : APP_ROUTES.shop;
}

/** E.164 without + preferred (e.g. 2547…). When unset, PDP hides the WhatsApp CTA. */
export function whatsAppProductLink(productTitle: string): string | null {
  const raw = process.env.NEXT_PUBLIC_STOREFRONT_WHATSAPP?.replace(/\D/g, "") ?? "";
  if (!raw) {
    return null;
  }
  const text = encodeURIComponent(`Hi! I'm interested in: ${productTitle}`);
  return `https://wa.me/${raw}?text=${text}`;
}
