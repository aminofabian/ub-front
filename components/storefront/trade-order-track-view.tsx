"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/config";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { fetchTradeOrder, tradeOrderStatusLabel, type TradeOrderTracking } from "@/lib/web-cart";

const POLL_MS = 30_000;

function qty(value: number): string {
  return String(Number(value.toFixed(4)));
}

/** The buyer's page for a trade order: what was asked for and what the supplier has agreed to. */
export default function TradeOrderTrackView({ slug }: { slug: string }) {
  const params = useParams<{ id: string }>();
  const orderId = decodeURIComponent(params?.id ?? "").trim();
  const [order, setOrder] = useState<TradeOrderTracking | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let alive = true;
    const load = () =>
      fetchTradeOrder(slug, orderId)
        .then((found) => {
          if (!alive) return;
          setOrder(found);
          setMissing(found == null);
        })
        .catch(() => {
          // A dropped connection is not "no such order": keep what is on screen.
        });
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [slug, orderId]);

  if (missing) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-xl font-semibold">We could not find that order</h1>
        <p className="mt-2 text-sm text-[var(--storefront-ink-muted,#5c6560)]">
          Check the link you were given when you placed it.
        </p>
        <Link href={APP_ROUTES.shop} className="mt-6 inline-block text-sm font-medium underline underline-offset-4">
          Back to the shop
        </Link>
      </main>
    );
  }
  if (!order) {
    return <main className="mx-auto max-w-xl px-4 py-12 text-sm">Loading your order…</main>;
  }

  const answered = order.status !== "placed";
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <p className="text-xs text-[var(--storefront-ink-muted,#5c6560)]">Trade order {order.orderCode}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{tradeOrderStatusLabel(order.status)}</h1>
      <p className="mt-2 text-sm text-[var(--storefront-ink-muted,#5c6560)]">
        {order.status === "placed"
          ? "The supplier has your order and has not answered yet. Nothing is charged and nothing is held until they accept."
          : order.status === "cancelled"
            ? "This order was cancelled."
            : order.status === "rejected"
              ? "The supplier could not supply this order."
              : "This is what the supplier agreed to supply."}
      </p>

      <ul className="mt-6 divide-y divide-black/10 border-y border-black/10">
        {order.lines.map((line, index) => (
          <li key={index} className="flex items-start justify-between gap-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{line.itemName}</p>
              <p className="mt-0.5 text-xs text-[var(--storefront-ink-muted,#5c6560)]">
                Asked for {qty(line.quantity)}
                {answered && line.acceptedQty != null
                  ? line.acceptedQty > 0
                    ? ` · accepted ${qty(line.acceptedQty)}`
                    : " · not supplied"
                  : ""}
                {" · "}
                {formatDisplayPrice(order.currency, line.unitPrice)} each
              </p>
            </div>
            <p className="shrink-0 tabular-nums">{formatDisplayPrice(order.currency, line.lineTotal)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-end justify-between">
        <span className="text-sm text-[var(--storefront-ink-muted,#5c6560)]">
          {answered ? "Total for what was accepted" : "Total asked for"}
        </span>
        <span className="text-lg font-bold tabular-nums">{formatDisplayPrice(order.currency, order.total)}</span>
      </div>

      <p className="mt-6 text-xs text-[var(--storefront-ink-muted,#5c6560)]">
        Keep this page&apos;s link. It is how you get back to this order.
      </p>
      <Link href={APP_ROUTES.shop} className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
        Back to the shop
      </Link>
    </main>
  );
}
