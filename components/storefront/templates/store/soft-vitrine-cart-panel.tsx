"use client";

import { X } from "lucide-react";

import { ShopCartPanelBody } from "@/components/storefront/shop-cart-panel-body";
import { softVitrineFontVariables } from "@/components/storefront/templates/store/soft-vitrine-fonts";
import styles from "@/components/storefront/templates/store/soft-vitrine.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { cn } from "@/lib/utils";

type Props = {
  onClose: () => void;
  compactHeader?: boolean;
  onExpand?: () => void;
  className?: string;
};

/** Soft vitrine cart panel — taupe rail, paper body, quiet type. */
export function SoftVitrineCartPanel({
  onClose,
  compactHeader,
  onExpand,
  className,
}: Props) {
  const { itemCount, cartViewMode } = useShopCart();
  const focusMode = compactHeader && cartViewMode === "focus";

  return (
    <div className={cn(styles.cartShell, softVitrineFontVariables, className)}>
      <header className={styles.cartHead}>
        <div className={styles.cartHeadCopy}>
          <p className={styles.cartHeadTitle}>
            {focusMode ? "Added" : "Cart"}
          </p>
          <p className={styles.cartHeadMeta}>
            {itemCount > 0
              ? `${itemCount} ${itemCount === 1 ? "item" : "items"}`
              : "Your cart is empty"}
          </p>
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
