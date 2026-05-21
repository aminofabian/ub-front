"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag, Tag, Truck } from "lucide-react";
import { useState } from "react";

import { ShopCartLines } from "@/components/storefront/shop-cart-lines";
import { Button } from "@/components/ui/button";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import { cartIsCheckoutReady } from "@/lib/web-cart";
import { formatDisplayPrice } from "@/lib/public-storefront";

export default function ShopCartView({ slug }: { slug: string }) {
  const { cart, loading, error, changeQty, removeLine } = useShopCart();
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [promo, setPromo] = useState("");

  async function handleChangeQty(itemId: string, nextQty: number) {
    setBusyItemId(itemId);
    try {
      await changeQty(itemId, nextQty);
    } finally {
      setBusyItemId(null);
    }
  }

  if (slug.trim() === "") {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading cart">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <ShoppingBag className="size-9" strokeWidth={1.5} aria-hidden />
        </div>
        <h2 className="mt-6 text-xl font-semibold tracking-tight">Your cart is empty</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Discover fresh picks in the shop and add items with one tap — no product page
          required.
        </p>
        <Button asChild className="mt-8 h-11 rounded-xl px-8">
          <Link href={APP_ROUTES.shop}>Browse the shop</Link>
        </Button>
      </div>
    );
  }

  const subtotalLabel = formatDisplayPrice(cart.currency, cart.subtotal);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-4">
        {error ? (
          <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <ShopCartLines
          cart={cart}
          busyItemId={busyItemId}
          onChangeQty={handleChangeQty}
          onRemove={removeLine}
        />
      </div>

      <aside className="lg:sticky lg:top-6">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm ring-1 ring-black/[0.02]">
          <h2 className="text-base font-semibold">Order summary</h2>

          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 text-xs text-muted-foreground">
            <Truck className="size-3.5 shrink-0 text-foreground/70" aria-hidden />
            Pickup branch:{" "}
            <span className="font-semibold text-foreground">{cart.catalogBranchName}</span>
          </div>

          <div className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold tabular-nums">{subtotalLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                Free
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-3">
            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Tag className="size-3.5" aria-hidden />
                Promo code
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  placeholder="Coming soon"
                  disabled
                  className="h-10 flex-1 rounded-lg border border-border bg-background/60 px-3 text-sm opacity-70"
                />
                <Button type="button" variant="outline" size="sm" className="h-10 shrink-0" disabled>
                  Apply
                </Button>
              </div>
            </label>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Discount codes will be available in a future update.
            </p>
          </div>

          {cartIsCheckoutReady(cart) ? (
            <Button asChild className="h-11 w-full rounded-xl text-sm font-semibold">
              <Link href={APP_ROUTES.shopCheckout} className="gap-2">
                Proceed to checkout
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Checkout is available once every item in your cart has a price at this
              store. Remove items shown as &quot;See in store&quot; or ask the branch to set
              a shelf price.
            </p>
          )}

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Checkout submits a pickup request. Pay using the instructions shown at checkout.
          </p>
        </div>
      </aside>
    </div>
  );
}
