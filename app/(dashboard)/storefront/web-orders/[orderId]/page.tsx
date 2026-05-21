"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { WebOrderFulfillmentActions } from "@/components/storefront/web-order-fulfillment-actions";
import { fetchWebOrderDetail, type WebOrderDetail } from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function money(currency: string, n: number | string): string {
  const v = typeof n === "number" ? n : Number(n);
  return `${currency} ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function StorefrontWebOrderDetailPage() {
  const params = useParams();
  const orderId = typeof params.orderId === "string" ? params.orderId : "";

  const { me } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.StorefrontOrdersRead);

  const [order, setOrder] = useState<WebOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setMessage("");
    setLoading(true);
    try {
      const data = await fetchWebOrderDetail(orderId);
      setOrder(data);
    } catch (error) {
      setOrder(null);
      setMessage(error instanceof Error ? error.message : "Failed to load order.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!allowed || !orderId.trim()) {
      setLoading(false);
      return;
    }
    void load();
  }, [allowed, load, orderId]);

  if (!allowed) {
    return (
      <section className="max-w-xl space-y-2">
        <h2 className="text-xl font-semibold">Web order</h2>
        <p className="text-sm text-muted-foreground">
          You need permission{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{Permission.StorefrontOrdersRead}</code>.
        </p>
      </section>
    );
  }

  if (!orderId.trim()) {
    return <p className="text-sm text-muted-foreground">Missing order id.</p>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href={APP_ROUTES.storefrontWebOrders}>← All pickup orders</Link>
        </Button>
      </div>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : order ? (
        <div className="space-y-6">
          <header className="space-y-1">
            <h2 className="text-xl font-semibold tabular-nums">Order {order.id}</h2>
            <p className="text-sm text-muted-foreground">
              Payment <span className="text-foreground">{order.status.replace(/_/g, " ")}</span>
              {order.fulfillmentStatus ? (
                <>
                  {" "}
                  · Fulfillment{" "}
                  <span className="text-foreground">
                    {order.fulfillmentStatus.replace(/_/g, " ")}
                  </span>
                </>
              ) : null}{" "}
              · Branch{" "}
              {order.catalogBranchName} · Total{" "}
              <span className="font-semibold text-primary">{money(order.currency, order.grandTotal)}</span>
            </p>
          </header>

          <WebOrderFulfillmentActions order={order} onUpdated={setOrder} />

          <div className="rounded-lg border bg-muted/15 px-4 py-3 text-sm">
            <p className="font-medium">Customer</p>
            <p className="mt-1">
              {order.customerName} · {order.customerPhone}
              {order.customerEmail ? ` · ${order.customerEmail}` : ""}
            </p>
            {order.notes ? (
              <p className="mt-2 text-muted-foreground">
                <span className="font-medium text-foreground">Notes:</span> {order.notes}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">Cart snapshot id {order.cartId}</p>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium text-right">Qty</th>
                  <th className="px-3 py-2 font-medium text-right">Unit</th>
                  <th className="px-3 py-2 font-medium text-right">Line</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={`${line.itemId}-${line.lineIndex}`} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      {line.itemName}
                      {line.variantName ? (
                        <span className="text-muted-foreground"> · {line.variantName}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{String(line.quantity)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {money(order.currency, line.unitPrice)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {money(order.currency, line.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
