"use client";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ShopCartMobileFloat } from "@/components/storefront/shop-cart-mobile-float";
import { ShopCartPanelBody } from "@/components/storefront/shop-cart-panel-body";
import { useMediaLg } from "@/hooks/use-media-lg";
import { useShopCart } from "@/hooks/use-shop-cart";

function ShopCartDesktopDrawer() {
  const { drawerOpen, closeDrawer } = useShopCart();

  return (
    <Dialog open={drawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <DialogContent
        side="right"
        className="flex h-[100dvh] max-h-[100dvh] gap-0 overflow-hidden p-0 sm:max-w-md"
        overlayClassName="bg-black/40"
      >
        <ShopCartPanelBody onClose={closeDrawer} />
      </DialogContent>
    </Dialog>
  );
}

/** Desktop slide-out (lg+); mobile uses floating panel. */
export function ShopCartDrawer() {
  const isLg = useMediaLg();

  if (isLg) {
    return <ShopCartDesktopDrawer />;
  }

  return <ShopCartMobileFloat />;
}
