"use client";

import type { PublicWebCart } from "@/lib/web-cart";
import { ShopCartLines } from "@/components/storefront/shop-cart-lines";

type Props = {
  cart: PublicWebCart;
  busyItemId: string | null;
  onChangeQty: (itemId: string, nextQty: number) => void | Promise<void>;
  onRemove: (itemId: string) => void | Promise<void>;
  /** Reserved for mobile float layout tweaks. */
  compact?: boolean;
};

/** Line list; scrolling is handled by the parent panel region. */
export function ShopCartLinesScroll({
  cart,
  busyItemId,
  onChangeQty,
  onRemove,
}: Props) {
  return (
    <ShopCartLines
      cart={cart}
      compact
      busyItemId={busyItemId}
      onChangeQty={onChangeQty}
      onRemove={onRemove}
    />
  );
}
