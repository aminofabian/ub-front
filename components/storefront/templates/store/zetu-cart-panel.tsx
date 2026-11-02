"use client";

import { ShoppingBag, X } from "lucide-react";

import { zetuFontVariables } from "@/app/fonts/zetu";
import { ShopCartPanelBody } from "@/components/storefront/shop-cart-panel-body";
import styles from "@/components/storefront/templates/store/zetu.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { cn } from "@/lib/utils";

type Props = {
  onClose: () => void;
  compactHeader?: boolean;
  onExpand?: () => void;
  className?: string;
};

/** Zetu bag panel — black rail, lime bag badge, paper line list. */
export function ZetuCartPanel({
  onClose,
  compactHeader,
  onExpand,
  className,
}: Props) {
  const { itemCount, cartViewMode } = useShopCart();
  const focusMode = compactHeader && cartViewMode === "focus";

  return (
    <div className={cn(styles.cartShell, zetuFontVariables, className)}>
      <header className={styles.cartHead}>
        <div className={styles.cartHeadMain}>
          <span className={styles.cartHeadIcon} aria-hidden>
            <ShoppingBag className="size-[18px]" strokeWidth={2} />
          </span>
          <div className={styles.cartHeadCopy}>
            <p className={styles.cartHeadTitle}>
              {focusMode ? "Just added" : "Your bag"}
            </p>
            <p className={styles.cartHeadMeta}>
              {itemCount > 0
                ? `${itemCount} ${itemCount === 1 ? "piece" : "pieces"} ready to wear`
                : "Nothing in the bag yet"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={styles.cartCloseBtn}
          aria-label="Close bag"
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
