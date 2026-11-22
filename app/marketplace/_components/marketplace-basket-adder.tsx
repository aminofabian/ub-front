"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  BASKET_CHANGED_EVENT,
  readBasket,
  setBasketLine,
  type BasketLine,
} from "@/lib/marketplace-basket";
import type { MarketplaceSupplierDetail } from "@/lib/marketplace-api";

/**
 * On a supplier's marketplace page, when the supplier has its own shop: add its products to the
 * marketplace basket, to send with products from other suppliers in one go.
 */
export function MarketplaceBasketAdder({ detail }: { detail: MarketplaceSupplierDetail }) {
  const [basket, setBasket] = useState<BasketLine[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setBasket(readBasket());
    sync();
    window.addEventListener(BASKET_CHANGED_EVENT, sync);
    return () => window.removeEventListener(BASKET_CHANGED_EVENT, sync);
  }, []);

  if (!detail.shopSlug || detail.products.length === 0) return null;

  const inBasket = basket.filter((l) => l.supplierId === detail.id);
  const quantityOf = (productId: string) => basket.find((l) => l.productId === productId)?.quantity ?? 0;
  const setQuantity = (productId: string, name: string, unitPrice: number | null, currency: string | null, raw: string) => {
    const quantity = Math.max(0, Math.floor(Number(raw) || 0));
    setBasket(
      setBasketLine({ supplierId: detail.id, supplierName: detail.name, productId, name, quantity, unitPrice, currency }),
    );
  };

  return (
    <section className="mb-3 border border-black/10 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          Buying from more than one supplier? Add products to your basket and send it all at once.
          {basket.length > 0 ? ` ${basket.length} in your basket${inBasket.length ? `, ${inBasket.length} from here` : ""}.` : ""}
        </p>
        <span className="flex items-center gap-3">
          <button type="button" className="min-h-11 font-medium underline underline-offset-4 sm:min-h-9" onClick={() => setOpen((o) => !o)}>
            {open ? "Hide products" : "Add products"}
          </button>
          <Link href="/marketplace/basket" className="font-medium underline underline-offset-4">
            Open basket
          </Link>
        </span>
      </div>
      {open ? (
        <ul className="mt-2 divide-y divide-black/10">
          {detail.products.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate">{p.name}</span>
                <span className="block text-xs opacity-70">
                  {p.unitPrice != null ? `${p.currency ?? ""} ${p.unitPrice.toLocaleString()}` : "Price on request"}
                </span>
              </span>
              <input
                className="h-11 w-20 border border-black/15 bg-white px-2 text-right tabular-nums sm:h-9"
                inputMode="numeric"
                aria-label={`Quantity of ${p.name}`}
                value={quantityOf(p.id) || ""}
                placeholder="0"
                onChange={(e) => setQuantity(p.id, p.name, p.unitPrice ?? null, p.currency ?? null, e.target.value)}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
