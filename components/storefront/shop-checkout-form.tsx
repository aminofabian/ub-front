"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { formatDisplayPrice } from "@/lib/public-storefront";
import {
  WEB_CART_CHANGED_EVENT,
  clearWebCartHandle,
  fetchWebCart,
  notifyWebCartChanged,
  readWebCartHandle,
  submitWebCheckout,
  type PublicCheckoutResult,
  type PublicWebCart,
} from "@/lib/web-cart";

export default function ShopCheckoutForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [cart, setCart] = useState<PublicWebCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PublicCheckoutResult | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
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
    if (!data || data.lines.length === 0) {
      clearWebCartHandle();
      setCart(null);
      setLoading(false);
      return;
    }
    setCart(data);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load updates after fetch
    void load();
  }, [load]);

  useEffect(() => {
    const onChange = () => void load();
    window.addEventListener(WEB_CART_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(WEB_CART_CHANGED_EVENT, onChange);
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim();
    const h = readWebCartHandle();
    if (!h || h.slug !== s || !cart || cart.subtotal == null) {
      setError("Your cart is missing prices or expired. Return to the shop.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await submitWebCheckout(s, h.cartId, {
        customerName,
        customerPhone,
        customerEmail: customerEmail.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      clearWebCartHandle();
      notifyWebCartChanged();
      setDone(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (done) {
    const total = formatDisplayPrice(done.currency, done.grandTotal);
    return (
      <div className="space-y-4 rounded-xl border border-border/70 bg-card/40 p-6">
        <h2 className="text-lg font-semibold">Order received</h2>
        <p className="text-sm text-muted-foreground">
          Reference <span className="font-mono text-foreground">{done.orderId}</span> · Total{" "}
          <span className="font-semibold text-primary">{total}</span>
          <span className="text-muted-foreground">
            {" "}
            · Pickup at {done.catalogBranchName}. Status: {done.status.replace(/_/g, " ")}.
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          You&apos;ll complete payment with the store when supported — we&apos;ll hold your request as pending payment.
        </p>
        <Button type="button" onClick={() => router.push(APP_ROUTES.shop)}>
          Continue shopping
        </Button>
      </div>
    );
  }

  if (!cart) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">No active cart. Add items before checkout.</p>
        <Link
          href={APP_ROUTES.shopCart}
          className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Go to cart
        </Link>
      </div>
    );
  }

  if (cart.subtotal == null) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Some lines are missing storefront prices. Remove those items or contact the branch before checkout.
        </p>
        <Link href={APP_ROUTES.shopCart} className="inline-flex text-sm font-medium text-primary hover:underline">
          Edit cart
        </Link>
      </div>
    );
  }

  const subtotalLabel = formatDisplayPrice(cart.currency, cart.subtotal);

  return (
    <form className="space-y-6" onSubmit={(ev) => void onSubmit(ev)}>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm">
        <p className="font-medium text-foreground">Order summary</p>
        <p className="mt-1 text-muted-foreground">
          Subtotal <span className="tabular-nums text-foreground">{subtotalLabel}</span> ·{" "}
          {cart.catalogBranchName}
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Full name</span>
        <input
          required
          className="rounded-md border bg-background px-3 py-2"
          autoComplete="name"
          value={customerName}
          onChange={(ev) => setCustomerName(ev.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Phone</span>
        <input
          required
          className="rounded-md border bg-background px-3 py-2"
          autoComplete="tel"
          inputMode="tel"
          value={customerPhone}
          onChange={(ev) => setCustomerPhone(ev.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Email (optional)</span>
        <input
          type="email"
          className="rounded-md border bg-background px-3 py-2"
          autoComplete="email"
          value={customerEmail}
          onChange={(ev) => setCustomerEmail(ev.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Notes (optional)</span>
        <textarea
          className="min-h-[88px] rounded-md border bg-background px-3 py-2"
          value={notes}
          onChange={(ev) => setNotes(ev.target.value)}
          placeholder="Pickup time, allergies…"
        />
      </label>

      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? "Submitting…" : "Submit pickup request"}
      </Button>
    </form>
  );
}
