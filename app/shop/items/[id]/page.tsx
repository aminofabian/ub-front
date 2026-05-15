import { permanentRedirect } from "next/navigation";

import { resolvePublicItemIdFromShopUrlSegment } from "@/lib/shop-item-url";
import { fetchPublicItemDetail } from "@/lib/public-storefront";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

type PageProps = { params: Promise<{ id: string }> };

export default async function OldShopItemPage({ params }: PageProps) {
  const { id: segment } = await params;
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    permanentRedirect("/shop");
  }
  const itemId = resolvePublicItemIdFromShopUrlSegment(segment);
  if (!itemId) {
    permanentRedirect("/shop");
  }
  const item = await fetchPublicItemDetail(slug, itemId);
  if (!item) {
    permanentRedirect("/shop");
  }
  permanentRedirect(`/${encodeURIComponent(item.sku)}`);
}
