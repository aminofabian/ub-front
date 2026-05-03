/**
 * Phase 15 — public storefront catalog (no JWT). Server components use BACKEND_ORIGIN.
 */

export type PublicCatalogItemCard = {
  id: string;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  price: number | null;
};

export type PublicStorefrontPayload = {
  businessName: string;
  slug: string;
  currency: string;
  catalogBranchId: string;
  catalogBranchName: string;
  label: string | null;
  announcement: string | null;
  featured: PublicCatalogItemCard[];
};

export type PublicItemImage = {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type PublicCatalogVariant = {
  id: string;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  price: number | null;
};

export type PublicCatalogItemDetail = {
  id: string;
  name: string;
  description: string | null;
  variantName: string | null;
  parentItemId: string | null;
  currency: string;
  price: number | null;
  images: PublicItemImage[];
  variants: PublicCatalogVariant[];
};

export type PublicCatalogListPayload = {
  currency: string;
  items: PublicCatalogItemCard[];
  nextCursor: string | null;
};

export type PublicCategory = {
  id: string;
  name: string;
  parentId: string | null;
  slug: string;
};

export type PublicCategoryListPayload = {
  categories: PublicCategory[];
};

export type PublicHostResolvePayload = {
  slug: string;
  businessId: string;
  businessName: string;
  storefrontEnabled: boolean;
};

const DEFAULT_REVALIDATE_SEC = 60;
const HOST_RESOLVE_REVALIDATE_SEC = 30;

export function storefrontSlugFromEnv(): string | null {
  const s = process.env.NEXT_PUBLIC_STOREFRONT_SLUG?.trim();
  return s || null;
}

export function formatDisplayPrice(currency: string, amount: number | null): string {
  if (amount == null) {
    return "See in store";
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.length === 3 ? currency : "KES",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function backendOrigin(): string | null {
  const a = process.env.BACKEND_ORIGIN?.trim();
  const b = process.env.API_BACKEND_ORIGIN?.trim();
  const raw = a || b || "";
  return raw.replace(/\/+$/, "") || null;
}

export async function fetchPublicStorefront(
  slug: string,
): Promise<PublicStorefrontPayload | null> {
  const base = backendOrigin();
  const s = slug.trim();
  if (!base || !s) {
    return null;
  }
  const url = `${base}/api/v1/public/businesses/${encodeURIComponent(s)}/storefront`;
  try {
    const res = await fetch(url, {
      next: { revalidate: DEFAULT_REVALIDATE_SEC },
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicStorefrontPayload;
  } catch {
    return null;
  }
}

export async function fetchPublicCatalogItems(
  slug: string,
  opts?: { cursor?: string | null; limit?: number; q?: string | null; categoryId?: string | null },
): Promise<PublicCatalogListPayload | null> {
  const base = backendOrigin();
  const s = slug.trim();
  if (!base || !s) {
    return null;
  }
  const u = new URL(
    `${base}/api/v1/public/businesses/${encodeURIComponent(s)}/catalog/items`,
  );
  const lim = opts?.limit;
  if (lim != null && lim > 0) {
    u.searchParams.set("limit", String(Math.min(lim, 100)));
  }
  const cur = opts?.cursor?.trim();
  if (cur) {
    u.searchParams.set("cursor", cur);
  }
  const q = opts?.q?.trim();
  if (q) {
    u.searchParams.set("q", q);
  }
  const cat = opts?.categoryId?.trim();
  if (cat) {
    u.searchParams.set("categoryId", cat);
  }
  try {
    const res = await fetch(u.toString(), {
      next: { revalidate: DEFAULT_REVALIDATE_SEC },
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicCatalogListPayload;
  } catch {
    return null;
  }
}

export async function fetchPublicCategories(
  slug: string,
): Promise<PublicCategoryListPayload | null> {
  const base = backendOrigin();
  const s = slug.trim();
  if (!base || !s) {
    return null;
  }
  const url = `${base}/api/v1/public/businesses/${encodeURIComponent(s)}/catalog/categories`;
  try {
    const res = await fetch(url, {
      next: { revalidate: DEFAULT_REVALIDATE_SEC },
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicCategoryListPayload;
  } catch {
    return null;
  }
}

export async function fetchPublicHostResolve(
  host: string,
): Promise<PublicHostResolvePayload | null> {
  const base = backendOrigin();
  const h = host.trim();
  if (!base || !h) {
    return null;
  }
  const u = new URL(`${base}/api/v1/public/host/resolve`);
  u.searchParams.set("host", h);
  try {
    const res = await fetch(u.toString(), {
      next: { revalidate: HOST_RESOLVE_REVALIDATE_SEC },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicHostResolvePayload;
  } catch {
    return null;
  }
}

export async function fetchPublicItemDetail(
  slug: string,
  itemId: string,
): Promise<PublicCatalogItemDetail | null> {
  const base = backendOrigin();
  const s = slug.trim();
  const id = itemId.trim();
  if (!base || !s || !id) {
    return null;
  }
  const url = `${base}/api/v1/public/businesses/${encodeURIComponent(s)}/catalog/items/${encodeURIComponent(id)}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: DEFAULT_REVALIDATE_SEC },
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicCatalogItemDetail;
  } catch {
    return null;
  }
}
