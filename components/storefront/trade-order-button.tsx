"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import { applyForTradeAccount, placeTradeOrder } from "@/lib/web-cart";

/**
 * On a supplier's shop: send the cart as a trade order. Nothing is paid and nothing is held; the
 * supplier answers. Renders nothing on any other shop.
 */
export function TradeOrderButton({ className, onPlaced }: { className?: string; onPlaced?: () => void }) {
  const { slug, cart, refresh } = useShopCart();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [business, setBusiness] = useState("");
  const [notes, setNotes] = useState("");
  const [wantsAccount, setWantsAccount] = useState(false);

  if (!cart?.tradeOrders) return null;

  const submit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Enter your name and phone number");
      return;
    }
    setBusy(true);
    try {
      const placed = await placeTradeOrder(slug, cart.id, {
        buyerName: name,
        buyerPhone: phone,
        buyerBusinessName: business,
        notes,
      });
      if (wantsAccount) {
        // The order is already in. A failed account request must not look like a failed order.
        await applyForTradeAccount(slug, { buyerName: name, buyerPhone: phone, businessName: business }).catch(() => {
          toast.error("Your order was sent, but the account request was not. Ask the supplier directly.");
        });
      }
      onPlaced?.();
      router.push(APP_ROUTES.shopTradeOrder(placed.orderId));
      void refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your order");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" className={className} onClick={() => setOpen(true)}>
        Send as a trade order
      </Button>
    );
  }

  const inputClass =
    "h-10 w-full rounded-[3px] border border-black/15 bg-white px-2.5 text-sm text-[var(--storefront-ink,#141816)]";
  return (
    <div className="grid gap-2 rounded-[3px] border border-black/10 p-2.5">
      <p className="text-[11px] leading-snug text-[var(--storefront-ink-muted,#5c6560)]">
        The supplier confirms what they can supply. You pay nothing now.
      </p>
      <input className={inputClass} placeholder="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className={inputClass} placeholder="Phone number" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input className={inputClass} placeholder="Shop or business name (optional)" autoComplete="organization" value={business} onChange={(e) => setBusiness(e.target.value)} />
      <input className={inputClass} placeholder="Note for the supplier (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <label className="flex min-h-10 items-center gap-2 text-[12px] text-[var(--storefront-ink,#141816)]">
        <input type="checkbox" className="size-4" checked={wantsAccount} onChange={(e) => setWantsAccount(e.target.checked)} />
        Also ask to buy on account
      </label>
      <div className="flex gap-2">
        <Button type="button" size="sm" className="h-10 flex-1" disabled={busy} onClick={() => void submit()}>
          {busy ? "Sending…" : "Send order"}
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-10" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
