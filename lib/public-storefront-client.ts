import type {
  PublicCatalogItemDetail,
  PublicCatalogListPayload,
  PublicStorefrontPayload,
} from "@/lib/public-storefront";
import { sanitizeStorefrontSlug } from "@/lib/public-storefront";

export type StorefrontItemPricePatch = {
  price: number | null;
  qtyOnHand?: number | null;
};

function catalogItemsPath(
  slug: string,
  opts?: {
    cursor?: string | null;
    limit?: number;
    q?: string | null;
    categoryId?: string | null;
  },
): string | null {
  const s = sanitizeStorefrontSlug(slug);
  if (!s) {
    return null;
  }
  const params = new URLSearchParams();
  const lim = opts?.limit;
  if (lim != null && lim > 0) {
    params.set("limit", String(Math.min(lim, 100)));
  }
  const cur = opts?.cursor?.trim();
  if (cur) {
    params.set("cursor", cur);
  }
  const q = opts?.q?.trim();
  if (q) {
    params.set("q", q);
  }
  const cat = opts?.categoryId?.trim();
  if (cat) {
    params.set("categoryId", cat);
  }
  const qs = params.toString();
  return `/api/v1/public/businesses/${encodeURIComponent(s)}/catalog/items${qs ? `?${qs}` : ""}`;
}

export async function fetchPublicCatalogPageBrowser(
  slug: string,
  opts?: {
    cursor?: string | null;
    limit?: number;
    q?: string | null;
    categoryId?: string | null;
  },
): Promise<PublicCatalogListPayload | null> {
  const path = catalogItemsPath(slug, opts);
  if (!path) {
    return null;
  }
  try {
    const res = await fetch(path, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicCatalogListPayload;
  } catch {
    return null;
  }
}

export async function fetchPublicStorefrontBrowser(
  slug: string,
): Promise<PublicStorefrontPayload | null> {
  const s = sanitizeStorefrontSlug(slug);
  if (!s) {
    return null;
  }
  try {
    const res = await fetch(
      `/api/v1/public/businesses/${encodeURIComponent(s)}/storefront`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicStorefrontPayload;
  } catch {
    return null;
  }
}

export async function fetchPublicItemDetailBrowser(
  slug: string,
  itemId: string,
): Promise<PublicCatalogItemDetail | null> {
  const s = sanitizeStorefrontSlug(slug);
  const id = itemId.trim();
  if (!s || !id) {
    return null;
  }
  try {
    const res = await fetch(
      `/api/v1/public/businesses/${encodeURIComponent(s)}/catalog/items/${encodeURIComponent(id)}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicCatalogItemDetail;
  } catch {
    return null;
  }
}

export async function fetchStorefrontItemPricePatches(
  slug: string,
  itemIds: string[],
  opts?: {
    q?: string | null;
    categoryId?: string | null;
  },
): Promise<Map<string, StorefrontItemPricePatch>> {
  const unique = [...new Set(itemIds.map((id) => id.trim()).filter(Boolean))];
  const patches = new Map<string, StorefrontItemPricePatch>();
  if (unique.length === 0) {
    return patches;
  }

  const page = await fetchPublicCatalogPageBrowser(slug, {
    limit: Math.min(Math.max(unique.length, 24), 100),
    q: opts?.q,
    categoryId: opts?.categoryId,
  });
  if (page) {
    for (const item of page.items) {
      if (unique.includes(item.id)) {
        patches.set(item.id, {
          price: item.price,
          qtyOnHand: item.qtyOnHand,
        });
      }
    }
  }

  const missing = unique.filter((id) => !patches.has(id));
  await Promise.all(
    missing.map(async (id) => {
      const detail = await fetchPublicItemDetailBrowser(slug, id);
      if (!detail) {
        return;
      }
      patches.set(id, {
        price: detail.price,
        qtyOnHand: detail.qtyOnHand,
      });
    }),
  );

  return patches;
}
