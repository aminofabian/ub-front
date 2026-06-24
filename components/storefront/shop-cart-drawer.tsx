"use client";

import { ShopCartMobileFloat } from "@/components/storefront/shop-cart-mobile-float";
import { ShopCartPanelBody } from "@/components/storefront/shop-cart-panel-body";
import { ShopSlideOver } from "@/components/storefront/shop-slide-over";
import { useMediaMd } from "@/hooks/use-media-md";
import { useShopCart } from "@/hooks/use-shop-cart";

function ShopCartDesktopDrawer() {
  const { drawerOpen, closeDrawer } = useShopCart();

  return (
    <ShopSlideOver
      variant="floating"
      open={drawerOpen}
      onClose={closeDrawer}
      ariaLabel="Your cart"
    >
      <ShopCartPanelBody onClose={closeDrawer} />
    </ShopSlideOver>
  );
}

/** Desktop slide-out (md+); mobile uses floating panel. */
export function ShopCartDrawer() {
  const isMd = useMediaMd();

  if (isMd) {
    return <ShopCartDesktopDrawer />;
  }

  return <ShopCartMobileFloat />;
}
