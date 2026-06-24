"use client";

import { ShopCheckoutExperience } from "@/components/storefront/shop-checkout-experience";
import { useMediaMd } from "@/hooks/use-media-md";
import { useShopCart } from "@/hooks/use-shop-cart";

/** Desktop checkout sheet opened from the cart (catalog stays visible behind). */
export function ShopCheckoutDrawer() {
  const isMd = useMediaMd();
  const { slug, checkoutOpen } = useShopCart();

  if (!isMd || !checkoutOpen) {
    return null;
  }

  return <ShopCheckoutExperience slug={slug} mode="drawer" />;
}
