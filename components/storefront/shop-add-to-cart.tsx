"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  clearWebCartHandle,
  ensureWebCartId,
  fetchWebCart,
  notifyWebCartChanged,
  readWebCartHandle,
  upsertWebCartLine,
  WEB_CART_CHANGED_EVENT,
} from "@/lib/web-cart";

type Props = {
  slug: string;
  itemId: string;
  /** Compact mode for sticky bottom bar — hides the cart label and extra text */
  compact?: boolean;
  className?: string;
};

export default function ShopAddToCart({
  slug,
  itemId,
  compact,
  className,
}: Props) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inCart, setInCart] = useState(false);

  const refreshInCart = useCallback(async () => {
    const s = slug.trim();
    const id = itemId.trim();
    if (!s || !id) {
      setInCart(false);
      return;
    }
    const handle = readWebCartHandle();
    if (!handle || handle.slug !== s) {
      setInCart(false);
      return;
    }
    const cart = await fetchWebCart(s, handle.cartId);
    if (!cart) {
      setInCart(false);
      return;
    }
    setInCart(cart.lines.some((l) => l.itemId === id));
  }, [slug, itemId]);

  useEffect(() => {
    void refreshInCart();
  }, [refreshInCart]);

  useEffect(() => {
    const onChange = () => void refreshInCart();
    window.addEventListener(WEB_CART_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(WEB_CART_CHANGED_EVENT, onChange);
  }, [refreshInCart]);

  async function add() {
    const s = slug.trim();
    const id = itemId.trim();
    if (!s || !id) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      let cartId = (await ensureWebCartId(s)) ?? null;
      if (!cartId) {
        setError("Could not start a cart. Try again.");
        return;
      }
      try {
        let updated = await upsertWebCartLine(s, cartId, id, qty);
        if (!updated) {
          clearWebCartHandle();
          cartId = (await ensureWebCartId(s)) ?? null;
          if (!cartId) {
            setError("Could not start a cart. Try again.");
            return;
          }
          updated = await upsertWebCartLine(s, cartId, id, qty);
        }
        if (!updated) {
          setError("Could not update cart. Try again.");
          return;
        }
        notifyWebCartChanged();
        setInCart(true);
        setMessage(compact ? "Added to cart" : `Added ${qty} to your cart.`);
        setQty(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update cart.");
      }
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
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex size-7 items-center justify-center rounded-lg text-sm hover:bg-muted"
            disabled={busy}
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
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
          {busy ? "Adding…" : `Add to cart`}
        </Button>
        <Link
          href={APP_ROUTES.shopCart}
          className="shrink-0 text-sm font-medium text-primary hover:underline"
        >
          Cart
        </Link>
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
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-full w-10 items-center justify-center text-lg font-semibold leading-none hover:bg-muted disabled:opacity-60"
            disabled={busy}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center text-base font-medium tabular-nums">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
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
