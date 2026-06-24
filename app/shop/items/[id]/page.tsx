import { notFound, permanentRedirect } from "next/navigation";

import { fetchPublicItemDetail } from "@/lib/public-storefront";
import {
  resolvePublicItemIdFromShopUrlSegment,
  shopItemPathFromCard,
} from "@/lib/shop-item-url";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Legacy `/shop/items/:segment` URLs → canonical `/{sku}` product page. */
export default async function LegacyShopItemRedirectPage({ params }: PageProps) {
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    notFound();
  }

  const { id } = await params;
  const segment = id.trim();
  const itemId = resolvePublicItemIdFromShopUrlSegment(segment) || segment;
  const item = await fetchPublicItemDetail(slug, itemId);
  if (!item) {
    notFound();
  }

  permanentRedirect(shopItemPathFromCard(item));
}
