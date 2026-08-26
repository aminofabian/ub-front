"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { blankDropCode } from "@/components/storefront/templates/store/blank-drop-code";
import { blankDropFontVariables } from "@/components/storefront/templates/store/blank-drop-fonts";
import styles from "@/components/storefront/templates/store/blank-drop.module.css";
import { cartLineQuantity, useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { cartIsCheckoutReady } from "@/lib/web-cart";
import { cn } from "@/lib/utils";

/**
 * Utilitarian bag panel — codes, contain thumbs, black CHECKOUT.
 * Craft bar: yeezy.com bag grammar.
 */
export function BlankDropCartPanel({ onClose }: { onClose: () => void }) {
  const {
    cart,
    loading,
    error,
    changeQty,
    removeLine,
    itemCount,
    requestCheckout,
  } = useShopCart();
  const [busyId, setBusyId] = useState<string | null>(null);
  const ready = cartIsCheckoutReady(cart);

  return (
    <div className={cn(styles.root, blankDropFontVariables, styles.cartRoot)}>
      <div className={styles.cartHead}>
        <h2 className={styles.cartTitle}>Bag · {itemCount}</h2>
        <button type="button" className={styles.cartClose} onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className={styles.cartBody}>
        {loading && !cart ? (
          <div className={styles.cartEmpty}>Loading</div>
        ) : !cart || cart.lines.length === 0 ? (
          <div className={styles.cartEmpty}>Your bag is empty</div>
        ) : (
          cart.lines.map((line) => {
            const code = blankDropCode({
              sku: line.sku ?? "",
              name: line.name ?? "Item",
            });
            const busy = busyId === line.itemId;
            return (
              <div key={line.itemId} className={styles.cartLine}>
                <div className={cn(styles.cartThumb, "relative")}>
                  {line.imageUrl ? (
                    <Image
                      src={line.imageUrl}
                      alt=""
                      fill
                      unoptimized
                      sizes="72px"
                      style={{ objectFit: "contain" }}
                    />
                  ) : (
                    <span className={styles.placeholder} aria-hidden />
                  )}
                </div>
                <div className={styles.cartLineMeta}>
                  <span className={styles.cartLineCode}>{code}</span>
                  {line.unitPrice != null ? (
                    <span className={styles.cartLinePrice}>
                      {formatDisplayPrice(cart.currency, line.unitPrice)}
                    </span>
                  ) : null}
                  <div className={styles.cartQty}>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label="Decrease"
                      onClick={() => {
                        setBusyId(line.itemId);
                        const q = cartLineQuantity(line.quantity);
                        void changeQty(line.itemId, Math.max(0, q - 1)).finally(
                          () => setBusyId(null),
                        );
                      }}
                    >
                      −
                    </button>
                    <span>{cartLineQuantity(line.quantity)}</span>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label="Increase"
                      onClick={() => {
                        setBusyId(line.itemId);
                        const q = cartLineQuantity(line.quantity);
                        void changeQty(line.itemId, q + 1).finally(() =>
                          setBusyId(null),
                        );
                      }}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.cartRemove}
                    disabled={busy}
                    onClick={() => {
                      setBusyId(line.itemId);
                      void removeLine(line.itemId).finally(() => setBusyId(null));
                    }}
                  >
                    Remove
                  </button>
                </div>
                <div className={styles.cartLineTotal}>
                  {line.lineTotal != null
                    ? formatDisplayPrice(cart.currency, line.lineTotal)
                    : "—"}
                </div>
              </div>
            );
          })
        )}
        {error ? (
          <p className={styles.cartEmpty} style={{ color: "#000" }}>
            {error}
          </p>
        ) : null}
      </div>

      {cart && cart.lines.length > 0 ? (
        <div className={styles.cartFoot}>
          <div className={styles.cartSub}>
            <span>Subtotal</span>
            <span>
              {cart.subtotal != null
                ? formatDisplayPrice(cart.currency, cart.subtotal)
                : "—"}
            </span>
          </div>
          {ready ? (
            <Link
              href={APP_ROUTES.shopCheckout}
              className={styles.cartCta}
              onClick={() => {
                requestCheckout();
                onClose();
              }}
            >
              Checkout
            </Link>
          ) : (
            <button type="button" className={styles.cartCta} disabled>
              Checkout
            </button>
          )}
          <button type="button" className={styles.cartContinue} onClick={onClose}>
            Continue shopping
          </button>
        </div>
      ) : null}
    </div>
  );
}
