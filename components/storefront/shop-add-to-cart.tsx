"use client";

import Link from "next/link";
import { useState } from "react";

import { APP_ROUTES } from "@/lib/config";
import { Button } from "@/components/ui/button";
import {
  clearWebCartHandle,
  ensureWebCartId,
  notifyWebCartChanged,
  upsertWebCartLine,
} from "@/lib/web-cart";

type Props = {
  slug: string;
  itemId: string;
};

export default function ShopAddToCart({ slug, itemId }: Props) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const s = slug.trim();
    const id = itemId.trim();
    if (!s || !id) {
      return;
    }
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
        setMessage(`Added ${qty} to your cart.`);
        setQty(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update cart.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-3 rounded-xl border border-border/70 bg-card/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cart</p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Qty</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={qty}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              setQty(Number.isFinite(n) && n >= 1 ? n : 1);
            }}
            className="h-10 w-20 rounded-lg border border-border bg-background px-2 text-sm tabular-nums"
          />
        </label>
        <Button type="button" onClick={() => void add()} disabled={busy} className="h-10 min-w-[9rem]">
          {busy ? "Adding…" : "Add to cart"}
        </Button>
        <Link
          href={APP_ROUTES.shopCart}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          View cart
        </Link>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <p className="text-xs text-muted-foreground">
        Prices reflect the storefront branch when you view your cart.{" "}
        <Link href={APP_ROUTES.shop} className="text-primary underline-offset-2 hover:underline">
          Continue shopping
        </Link>
      </p>
    </div>
  );
}
