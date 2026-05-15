import { redirect } from "next/navigation";

import { fetchPublicCategories } from "@/lib/public-storefront";
import {
  findCategoryForStorefrontPath,
  shopCategoryListPath,
  storefrontCategoryPathSlug,
} from "@/lib/shop-url";

/** If `categoryId` matches a published category, redirect to `/shop/c/:slug`. */
export async function redirectLegacyShopCategoryQuery(opts: {
  storefrontSlug: string;
  categoryId: string;
  q?: string;
}): Promise<void> {
  const cats = await fetchPublicCategories(opts.storefrontSlug);
  const list = cats?.categories ?? [];
  const hit = findCategoryForStorefrontPath(list, opts.categoryId.trim());
  if (!hit) return;
  const seg = storefrontCategoryPathSlug(hit);
  const q = opts.q?.trim();
  redirect(shopCategoryListPath(seg, q ? { q } : undefined));
}
