"use client";

import { ShoppingBag, X } from "lucide-react";

import { ShopCartPanelBody } from "@/components/storefront/shop-cart-panel-body";
import styles from "@/components/storefront/templates/store/comilmart.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { cn } from "@/lib/utils";

type Props = {
  onClose: () => void;
  compactHeader?: boolean;
  onExpand?: () => void;
  className?: string;
};

/**
 * Comilmart cart shell — navy header rail; line list reuses shared cart body.
 */
export function ComilmartCartPanel({
  onClose,
  compactHeader,
  onExpand,
  className,
}: Props) {
  const { itemCount, cartViewMode } = useShopCart();
  const focusMode = compactHeader && cartViewMode === "focus";

  return (
    <div className={cn(styles.cartShell, className)}>
      <header className={styles.cartHead}>
        <div className={styles.cartHeadMain}>
          <span className={styles.cartHeadIcon} aria-hidden>
            <ShoppingBag className="size-[18px]" strokeWidth={2} />
          </span>
          <div className={styles.cartHeadCopy}>
            <p className={styles.cartHeadTitle}>
              {focusMode ? "Just added" : "Your cart"}
            </p>
            <p className={styles.cartHeadMeta}>
              {itemCount > 0
                ? `${itemCount} ${itemCount === 1 ? "item" : "items"}`
                : "Nothing added yet"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={styles.cartCloseBtn}
          aria-label="Close cart"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>
      <ShopCartPanelBody
        onClose={onClose}
        compactHeader={compactHeader}
        onExpand={onExpand}
        hideHeader
      />
    </div>
  );
}
