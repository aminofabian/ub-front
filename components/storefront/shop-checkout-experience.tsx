"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import ShopCheckoutForm from "@/components/storefront/shop-checkout-form";
import { ShopCheckoutDrawerChrome } from "@/components/storefront/shop-checkout-drawer-chrome";
import { ShopSlideOver } from "@/components/storefront/shop-slide-over";
import { useShopCartOptional } from "@/hooks/use-shop-cart";
import { useMediaMd } from "@/hooks/use-media-md";
import { APP_ROUTES } from "@/lib/config";

type Props = {
  slug: string;
  /** Drawer from cart vs dedicated `/shop/checkout` route */
  mode: "drawer" | "page";
};

export function ShopCheckoutExperience({ slug, mode }: Props) {
  const isMd = useMediaMd();
  const router = useRouter();
  const cart = useShopCartOptional();
  const [orderPlaced, setOrderPlaced] = useState(false);

  const onClose = () => {
    if (mode === "drawer") {
      cart?.closeCheckout();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(APP_ROUTES.shop);
  };

  const form = (
    <ShopCheckoutForm
      slug={slug}
      embedded={isMd}
      onOrderPlacedChange={setOrderPlaced}
    />
  );

  if (!isMd) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{form}</div>
    );
  }

  const open = mode === "drawer" ? Boolean(cart?.checkoutOpen) : true;

  if (mode === "drawer" && !open) {
    return null;
  }

  return (
    <ShopSlideOver
      variant="panel"
      open={open}
      onClose={onClose}
      ariaLabel="Checkout"
      zIndex={74}
    >
      <ShopCheckoutDrawerChrome onClose={onClose} orderPlaced={orderPlaced}>
        {form}
      </ShopCheckoutDrawerChrome>
    </ShopSlideOver>
  );
}
