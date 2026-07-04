"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Truck } from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchStockTakeRestockOrders,
  postStockTakeRestockMarkOrdered,
  postStockTakeRestockMarkReceived,
  type RestockOrderSummaryRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function num(v: number | string | null | undefined): string {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n.toLocaleString() : String(v);
}

export default function StockTakeRestockOrdersPage() {
  const { me } = useDashboard();
  const canApprove = hasPermission(me?.permissions, Permission.StocktakeApprove);

  const [orders, setOrders] = useState<RestockOrderSummaryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await fetchStockTakeRestockOrders({ status: "all" }));
    } catch (e) {
      setOrders([]);
      setError(e instanceof Error ? e.message : "Orders not available");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canApprove) void loadOrders();
  }, [canApprove, loadOrders]);

  const runAction = async (
    orderNumber: string,
    action: "ordered" | "received",
  ) => {
    setActionId(orderNumber);
    setError(null);
    try {
      if (action === "ordered") {
        await postStockTakeRestockMarkOrdered(orderNumber);
      } else {
        await postStockTakeRestockMarkReceived(orderNumber);
      }
      await loadOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionId(null);
    }
  };

  if (!canApprove) {
    return (
      <DashboardAccessDenied
        title="Restock orders"
        description="You need stock take approval access to view restock orders."
      />
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX, "mx-auto space-y-4 px-4 pb-12 pt-4")}>
      <Link
        href={APP_ROUTES.inventoryStockTakeRestock}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Restock review
      </Link>

      <DashboardPageHero
        icon={Truck}
        eyebrow="Stock Take"
        title="Restock orders"
        description="Supplier order drafts generated from approved daily audit restock suggestions."
      />

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading orders…
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No restock orders yet.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order.orderNumber} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{order.supplierName}</h2>
                  <p className="text-sm text-muted-foreground">{order.orderNumber}</p>
                  <p className="mt-1 text-sm">
                    {order.itemCount} items · KES {num(order.supplierSubtotal)} ·{" "}
                    <span className="capitalize">{order.status.replace("_", " ")}</span>
                  </p>
                  {order.orderDraftedAt ? (
                    <p className="text-xs text-muted-foreground">
                      Drafted {new Date(order.orderDraftedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {order.status === "order_drafted" ? (
                    <Button
                      size="sm"
                      disabled={actionId === order.orderNumber}
                      onClick={() => void runAction(order.orderNumber, "ordered")}
                    >
                      Mark ordered
                    </Button>
                  ) : null}
                  {order.status === "ordered" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionId === order.orderNumber}
                      onClick={() => void runAction(order.orderNumber, "received")}
                    >
                      Mark received
                    </Button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
