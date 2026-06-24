import { notFound } from "next/navigation";

import ShopCartView from "@/components/storefront/shop-cart-view";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

export default async function ShopCartPage() {
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    notFound();
  }
  return <ShopCartView slug={slug} />;
}
