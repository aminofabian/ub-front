"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/config";
import { Button } from "@/components/ui/button";
import {
  cartLineQuantity,
  findCartLine,
  useShopCartOptional,
} from "@/hooks/use-shop-cart";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  itemId: string;
  /** Weighed / counter-only SKUs — browseable but not web-cartable. */
  inStoreOnly?: boolean;
  /** Compact mode for sticky bottom bar — hides the cart label and extra text */
  compact?: boolean;
  className?: string;
};

export default function ShopAddToCart({
  slug,
  itemId,
  inStoreOnly = false,
  compact,
  className,
}: Props) {
  const [pickQty, setPickQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cartCtx = useShopCartOptional();

  const cartLine = findCartLine(cartCtx?.cart ?? null, itemId);
  const inCartQty = cartLine ? cartLineQuantity(cartLine.quantity) : 0;
  const inCart = inCartQty > 0;
  const displayQty = inCart ? inCartQty : pickQty;

  useEffect(() => {
    if (!inCart) {
      setPickQty(1);
    }
  }, [inCart]);

  if (inStoreOnly) {
    if (compact) {
      return (
        <p
          className={cn(
            "text-center text-xs font-medium text-sky-800/80 dark:text-sky-300/90",
            className,
          )}
        >
          Available in store only
        </p>
      );
    }
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed border-sky-500/30 bg-sky-500/5 px-4 py-4 text-sm text-foreground/90",
          className,
        )}
      >
        <p className="font-semibold text-sky-900 dark:text-sky-200">
          Available in store only
        </p>
        <p className="mt-1 text-muted-foreground">
          Weighed cuts and custom portions are sold at the butcher counter. Pre-packed
          trays and fixed packs can be ordered online.
        </p>
      </div>
    );
  }

  async function add() {
    const id = itemId.trim();
    if (!id) return;
    if (!cartCtx) {
      setError("Cart unavailable.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const q = inCart ? inCartQty + pickQty : pickQty;
      await cartCtx.setLineQty(id, q);
      cartCtx.notifyAdded(id);
      setMessage(
        compact ? "Added to cart" : `Added ${inCart ? pickQty : q} to your cart.`,
      );
      setPickQty(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update cart.");
    } finally {
      setBusy(false);
    }
  }

  async function adjustCart(delta: number) {
    if (!cartCtx || !inCart) return;
    setBusy(true);
    setError(null);
    try {
      await cartCtx.setLineQty(itemId, inCartQty + delta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update cart.");
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <div className="flex w-full items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background px-2">
          <button
            type="button"
            onClick={() =>
              inCart ? void adjustCart(-1) : setPickQty((q) => Math.max(1, q - 1))
            }
            className="flex size-7 items-center justify-center rounded-lg text-sm hover:bg-muted"
            disabled={busy || (!inCart && pickQty <= 1)}
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">
            {displayQty}
          </span>
          <button
            type="button"
            onClick={() =>
              inCart ? void adjustCart(1) : setPickQty((q) => q + 1)
            }
            className="flex size-7 items-center justify-center rounded-lg text-sm hover:bg-muted"
            disabled={busy}
          >
            +
          </button>
        </div>
        <Button
          type="button"
          onClick={() => void add()}
          disabled={busy}
          className="h-11 flex-1 rounded-xl text-sm font-semibold"
        >
          {busy ? "Adding…" : inCart ? "Add more" : "Add to cart"}
        </Button>
        {cartCtx ? (
          <button
            type="button"
            onClick={cartCtx.openDrawer}
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            View cart
          </button>
        ) : (
          <Link
            href={APP_ROUTES.shopCart}
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            Cart
          </Link>
        )}
        {error && (
          <p className="absolute -top-8 left-0 text-xs text-destructive">
            {error}
          </p>
        )}
        {message && (
          <p className="absolute -top-8 left-0 text-xs text-emerald-600">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mt-6 space-y-3 rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <p className="text-sm font-medium">Qty</p>
        <div className="flex h-11 items-center rounded-md border border-border bg-background">
          <button
            type="button"
            onClick={() =>
              inCart ? void adjustCart(-1) : setPickQty((q) => Math.max(1, q - 1))
            }
            className="flex h-full w-10 items-center justify-center text-lg font-semibold leading-none hover:bg-muted disabled:opacity-60"
            disabled={busy || (!inCart && pickQty <= 1)}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center text-base font-medium tabular-nums">
            {displayQty}
          </span>
          <button
            type="button"
            onClick={() =>
              inCart ? void adjustCart(1) : setPickQty((q) => q + 1)
            }
            className="flex h-full w-10 items-center justify-center text-lg font-semibold leading-none hover:bg-muted disabled:opacity-60"
            disabled={busy}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>
      <div
        className={cn(
          "grid gap-3",
          inCart ? "sm:grid-cols-2" : "grid-cols-1",
        )}
      >
        <Button
          type="button"
          variant={inCart ? "outline" : "default"}
          onClick={() => void add()}
          disabled={busy}
          className={cn(
            "h-11 rounded-full text-sm font-semibold",
            !inCart && "shadow-md ring-2 ring-primary/25",
          )}
        >
          {busy ? "Adding…" : "Add to Cart"}
        </Button>
        {inCart ? (
          <Link href={APP_ROUTES.shopCheckout} className="block">
            <Button className="h-11 w-full rounded-full text-sm font-semibold">
              Buy It Now
            </Button>
          </Link>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
    </div>
  );
}
