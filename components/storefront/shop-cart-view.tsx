"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { APP_ROUTES, shopItemPath } from "@/lib/config";
import { Button } from "@/components/ui/button";
import {
  WEB_CART_CHANGED_EVENT,
  clearWebCartHandle,
  deleteWebCartLine,
  fetchWebCart,
  notifyWebCartChanged,
  readWebCartHandle,
  type PublicWebCart,
  upsertWebCartLine,
} from "@/lib/web-cart";
import { formatDisplayPrice } from "@/lib/public-storefront";

export default function ShopCartView({ slug }: { slug: string }) {
  const [cart, setCart] = useState<PublicWebCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError(null);
    const s = slug.trim();
    if (!s) {
      setCart(null);
      setLoading(false);
      return;
    }
    const h = readWebCartHandle();
    if (!h || h.slug !== s) {
      setCart(null);
      setLoading(false);
      return;
    }
    const data = await fetchWebCart(s, h.cartId);
    if (!data) {
      clearWebCartHandle();
      setCart(null);
      setLoading(false);
      return;
    }
    setCart(data);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChange = () => void load();
    window.addEventListener(WEB_CART_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(WEB_CART_CHANGED_EVENT, onChange);
  }, [load]);

  async function changeQty(itemId: string, nextQty: number) {
    const h = readWebCartHandle();
    const s = slug.trim();
    if (!h || h.slug !== s || !cart) {
      return;
    }
    setError(null);
    if (nextQty <= 0) {
      const next = await deleteWebCartLine(s, h.cartId, itemId);
      if (!next) {
        clearWebCartHandle();
        setCart(null);
        setError("Your cart expired or was reset.");
        notifyWebCartChanged();
        return;
      }
      setCart(next);
      notifyWebCartChanged();
      return;
    }
    try {
      const next = await upsertWebCartLine(s, h.cartId, itemId, nextQty);
      if (!next) {
        clearWebCartHandle();
        setCart(null);
        setError("Your cart expired or was reset.");
        notifyWebCartChanged();
        return;
      }
      setCart(next);
      notifyWebCartChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update quantity.");
    }
  }

  async function remove(itemId: string) {
    const h = readWebCartHandle();
    const s = slug.trim();
    if (!h || h.slug !== s || !cart) {
      return;
    }
    setError(null);
    const next = await deleteWebCartLine(s, h.cartId, itemId);
    if (!next) {
      clearWebCartHandle();
      setCart(null);
      setError("Your cart expired or was reset.");
      notifyWebCartChanged();
      return;
    }
    setCart(next);
    notifyWebCartChanged();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading cart…</p>;
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Link
          href={APP_ROUTES.shop}
          className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const subtotalLabel = formatDisplayPrice(cart.currency, cart.subtotal);

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="space-y-4">
        {cart.lines.map((line) => {
          const title = line.variantName ? `${line.name} · ${line.variantName}` : line.name;
          const unit = formatDisplayPrice(cart.currency, line.unitPrice);
          const lineTotal = formatDisplayPrice(cart.currency, line.lineTotal);
          return (
            <li
              key={line.itemId}
              className="flex gap-4 rounded-xl border border-border/70 bg-card/50 p-3 sm:p-4"
            >
              <Link
                href={shopItemPath(line.itemId)}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-24"
              >
                {line.imageUrl ? (
                  <Image src={line.imageUrl} alt={title} fill className="object-cover" sizes="96px" />
                ) : (
                  <span className="flex h-full items-center justify-center text-lg text-muted-foreground">
                    {line.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </Link>
              <div className="min-w-0 flex-1 space-y-2">
                <Link href={shopItemPath(line.itemId)} className="font-medium hover:underline">
                  {title}
                </Link>
                <p className="text-sm text-muted-foreground">{unit} each</p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center rounded-lg border border-border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 px-2"
                      aria-label="Decrease quantity"
                      onClick={() =>
                        void changeQty(line.itemId, line.quantity > 1 ? line.quantity - 1 : 0)
                      }
                    >
                      −
                    </Button>
                    <span className="min-w-8 px-2 text-center text-sm tabular-nums">{line.quantity}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 px-2"
                      aria-label="Increase quantity"
                      onClick={() => void changeQty(line.itemId, line.quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-destructive hover:text-destructive"
                    onClick={() => void remove(line.itemId)}
                  >
                    Remove
                  </Button>
                </div>
                <p className="text-sm font-semibold tabular-nums text-primary sm:hidden">{lineTotal}</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold tabular-nums text-primary">{lineTotal}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-lg font-semibold tabular-nums">
          Subtotal <span className="text-primary">{subtotalLabel}</span>
        </p>
        <div className="flex flex-col gap-3 sm:items-end">
          {cart.subtotal != null ? (
            <Button asChild className="w-full sm:w-auto">
              <Link href={APP_ROUTES.shopCheckout}>Proceed to checkout</Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Subtotal unavailable until every item has a storefront price at this branch.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Online payment is coming next — checkout submits a pickup request for{" "}
            <span className="text-foreground">{cart.catalogBranchName}</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
