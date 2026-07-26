"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Search, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { SupplierPortalTakeOrderWorkspace } from "@/components/supplier-portal/supplier-portal-take-order-workspace";
import {
  mktPosHeader,
  spBtnGhost,
  spBtnPrimary,
  spEyebrow,
  spPage,
  spSerifTitle,
} from "@/components/supplier-portal/supplier-portal-ui";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalOrder,
  fetchSupplierPortalOrders,
  respondSupplierPortalOrder,
  shipSupplierPortalOrder,
  type SupplierPortalOrderDetail,
  type SupplierPortalOrderRow,
} from "@/lib/marketplace-api";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";
import { cn, formatMoney } from "@/lib/utils";

type LineDraft = {
  purchaseOrderLineId: string;
  supplierLineStatus: string;
  qtyAccepted: string;
  supplierNote: string;
};

type PageMode = "take" | "inbox";

export default function SupplierPortalOrdersPage() {
  const router = useRouter();
  const [mode, setMode] = useState<PageMode>("take");
  const [orders, setOrders] = useState<SupplierPortalOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupplierPortalOrderDetail | null>(null);
  const [lineDrafts, setLineDrafts] = useState<LineDraft[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trackingNote, setTrackingNote] = useState("");
  const [shopFilterId, setShopFilterId] = useState<string | null>(null);
  const [shopQuery, setShopQuery] = useState("");
  const [orderSearch, setOrderSearch] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchSupplierPortalOrders();
      setOrders(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
  }, [router]);

  useEffect(() => {
    if (mode === "inbox") void loadOrders();
  }, [mode, loadOrders]);

  const shopOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const order of orders) {
      const existing = map.get(order.businessId);
      if (existing) {
        existing.count += 1;
        continue;
      }
      map.set(order.businessId, {
        id: order.businessId,
        name: order.businessName?.trim() || "Shop",
        count: 1,
      });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  const filteredShops = useMemo(() => {
    const q = shopQuery.trim().toLowerCase();
    if (!q) return shopOptions;
    return shopOptions.filter((s) => s.name.toLowerCase().includes(q));
  }, [shopOptions, shopQuery]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((order) => {
      if (shopFilterId && order.businessId !== shopFilterId) return false;
      if (!q) return true;
      return (
        order.poNumber.toLowerCase().includes(q) ||
        order.businessName.toLowerCase().includes(q) ||
        order.status.toLowerCase().includes(q)
      );
    });
  }, [orders, shopFilterId, orderSearch]);

  const openOrder = async (purchaseOrderId: string) => {
    setSelectedId(purchaseOrderId);
    setDetailLoading(true);
    try {
      const row = await fetchSupplierPortalOrder(purchaseOrderId);
      setDetail(row);
      setLineDrafts(
        row.lines.map((line) => ({
          purchaseOrderLineId: line.lineId,
          supplierLineStatus: line.supplierLineStatus ?? "accepted",
          qtyAccepted: String(line.qtyAccepted ?? line.qtyOrdered),
          supplierNote: line.supplierNote ?? "",
        })),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load order");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const onRespond = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const updated = await respondSupplierPortalOrder(
        selectedId,
        lineDrafts.map((line) => ({
          purchaseOrderLineId: line.purchaseOrderLineId,
          supplierLineStatus: line.supplierLineStatus,
          qtyAccepted:
            line.supplierLineStatus === "rejected"
              ? 0
              : Number(line.qtyAccepted),
          supplierNote: line.supplierNote.trim() || undefined,
        })),
      );
      setDetail(updated);
      toast.success("Response submitted");
      await loadOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Response failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onShip = async (deliveryStatus: "in_transit" | "delivered") => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const updated = await shipSupplierPortalOrder(selectedId, {
        deliveryStatus,
        trackingNote: trackingNote.trim() || undefined,
      });
      setDetail(updated);
      toast.success(
        deliveryStatus === "delivered" ? "Marked as delivered" : "Marked in transit",
      );
      await loadOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SupplierPortalShell>
      <div className={cn(spPage, "space-y-3")}>
        {mode === "take" ? (
          <div className="-mx-3 -my-5 sm:mx-0 sm:my-0">
            <header className="mb-2 hidden sm:block">
              <p className={spEyebrow}>portal · sell → orders</p>
              <h2 className={cn(spSerifTitle, "mt-0.5 text-2xl sm:text-3xl")}>
                Take order
              </h2>
            </header>
            <SupplierPortalTakeOrderWorkspace
              onOpenInbox={() => setMode("inbox")}
              onOrderCreated={(id) => {
                setMode("inbox");
                void openOrder(id);
              }}
            />
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-end justify-between gap-2">
              <div className="min-w-0">
                <p className={spEyebrow}>portal · sell → orders</p>
                <h2 className={cn(spSerifTitle, "mt-0.5 text-2xl sm:text-3xl")}>
                  Orders inbox
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={spBtnGhost}
                  onClick={() => setMode("take")}
                >
                  <ArrowLeft className="size-3.5" />
                  Take order
                </button>
                <button
                  type="button"
                  className={spBtnPrimary}
                  onClick={() => setMode("take")}
                >
                  <ShoppingBag className="size-3.5" />
                  New order
                </button>
              </div>
            </header>

            <div
              className={cn(
                "flex min-h-[min(72dvh,40rem)] flex-col overflow-hidden border border-border bg-background lg:flex-row",
              )}
              style={{ ["--pos-primary" as string]: "#0f766e" }}
            >
              <aside className="flex max-h-[28%] w-full shrink-0 flex-col overflow-hidden border-b border-border lg:max-h-none lg:w-52 lg:border-b-0 lg:border-r xl:w-56">
                <div className={mktPosHeader}>
                  <span>Shops</span>
                  <span className="font-mono tabular-nums opacity-80">
                    {shopOptions.length}
                  </span>
                </div>
                <div className="relative border-b border-border">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="h-9 w-full bg-transparent pl-8 pr-2 text-[13px] outline-none placeholder:text-muted-foreground/60"
                    placeholder="Find shop"
                    value={shopQuery}
                    onChange={(e) => setShopQuery(e.target.value)}
                  />
                </div>
                <nav className="min-h-0 flex-1 overflow-y-auto p-1">
                  <button
                    type="button"
                    onClick={() => setShopFilterId(null)}
                    className={cn(
                      "mb-0.5 flex w-full items-center justify-between px-2.5 py-2 text-left text-[13px] font-medium",
                      !shopFilterId
                        ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_14%,transparent)]"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <span>All shops</span>
                    <span className="font-mono text-[10px] tabular-nums opacity-70">
                      {orders.length}
                    </span>
                  </button>
                  {filteredShops.map((shop) => (
                    <button
                      key={shop.id}
                      type="button"
                      onClick={() => setShopFilterId(shop.id)}
                      className={cn(
                        "mb-0.5 flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-[13px] font-medium",
                        shopFilterId === shop.id
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_14%,transparent)]"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      )}
                    >
                      <span className="min-w-0 truncate">{shop.name}</span>
                      <span className="shrink-0 font-mono text-[10px] tabular-nums opacity-70">
                        {shop.count}
                      </span>
                    </button>
                  ))}
                </nav>
              </aside>

              <aside className="flex max-h-[36%] w-full shrink-0 flex-col overflow-hidden border-b border-border lg:max-h-none lg:w-[17.5rem] lg:border-b-0 lg:border-r xl:w-[19rem]">
                <div className={mktPosHeader}>
                  <span>Orders</span>
                  <span className="font-mono tabular-nums opacity-80">
                    {filteredOrders.length}
                  </span>
                </div>
                <div className="relative border-b border-border">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="h-9 w-full bg-transparent pl-8 pr-2 text-[13px] outline-none placeholder:text-muted-foreground/60"
                    placeholder="Search PO or shop"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                  />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-1">
                  {loading ? (
                    <p className="px-2 py-8 text-center text-[12px] text-muted-foreground">
                      <Loader2 className="mr-1 inline size-3.5 animate-spin" />
                      Loading…
                    </p>
                  ) : filteredOrders.length === 0 ? (
                    <p className="px-2 py-10 text-center text-[12px] text-muted-foreground">
                      No orders in inbox.
                    </p>
                  ) : (
                    filteredOrders.map((order) => (
                      <button
                        key={order.purchaseOrderId}
                        type="button"
                        onClick={() => void openOrder(order.purchaseOrderId)}
                        className={cn(
                          "mb-0.5 flex w-full flex-col items-start gap-0.5 border px-2 py-2 text-left",
                          selectedId === order.purchaseOrderId
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)]"
                            : "border-transparent hover:bg-muted/40",
                        )}
                      >
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {order.poNumber} · {order.status}
                        </span>
                        <span className="w-full truncate text-[12px] font-semibold">
                          {order.businessName}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {order.lineCount} lines
                          {!order.supplierResponseAt ? " · awaiting" : ""}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </aside>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Order detail
                    </p>
                    <h3 className="truncate text-[15px] font-semibold">
                      {detail
                        ? `${detail.poNumber} · ${detail.businessName}`
                        : "Select an order"}
                    </h3>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                  {!selectedId ? (
                    <p className="py-16 text-center text-[12px] text-muted-foreground">
                      Pick an order to respond or ship.
                    </p>
                  ) : detailLoading ? (
                    <p className="flex items-center justify-center gap-2 py-16 text-[12px] text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading order…
                    </p>
                  ) : detail ? (
                    <OrderDetailPanel
                      detail={detail}
                      lineDrafts={lineDrafts}
                      setLineDrafts={setLineDrafts}
                      submitting={submitting}
                      trackingNote={trackingNote}
                      setTrackingNote={setTrackingNote}
                      onRespond={() => void onRespond()}
                      onShip={(status) => void onShip(status)}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </SupplierPortalShell>
  );
}

function OrderDetailPanel({
  detail,
  lineDrafts,
  setLineDrafts,
  submitting,
  trackingNote,
  setTrackingNote,
  onRespond,
  onShip,
}: {
  detail: SupplierPortalOrderDetail;
  lineDrafts: LineDraft[];
  setLineDrafts: React.Dispatch<React.SetStateAction<LineDraft[]>>;
  submitting: boolean;
  trackingNote: string;
  setTrackingNote: (v: string) => void;
  onRespond: () => void;
  onShip: (status: "in_transit" | "delivered") => void;
}) {
  return (
    <div className="space-y-4">
      {detail.notes ? (
        <p className="text-sm text-muted-foreground">{detail.notes}</p>
      ) : null}

      <div className="space-y-2">
        {lineDrafts.map((line, index) => {
          const item = detail.lines[index];
          return (
            <div
              key={line.purchaseOrderLineId}
              className="border border-border bg-muted/20 p-3 text-sm"
            >
              <p className="font-medium">{item?.itemName}</p>
              <p className="text-xs text-muted-foreground">
                Ordered {item?.qtyOrdered}
                {item?.unitEstimatedCost != null
                  ? ` · ${formatMoney(item.unitEstimatedCost, "KES")}`
                  : ""}
              </p>
              {!detail.supplierResponseAt ? (
                <div className="mt-2 grid gap-2">
                  <select
                    className="h-9 border border-border bg-background px-2 text-sm"
                    value={line.supplierLineStatus}
                    onChange={(e) =>
                      setLineDrafts((rows) =>
                        rows.map((row, i) =>
                          i === index
                            ? { ...row, supplierLineStatus: e.target.value }
                            : row,
                        ),
                      )
                    }
                  >
                    <option value="accepted">Accept</option>
                    <option value="partially_accepted">Partial</option>
                    <option value="rejected">Reject</option>
                  </select>
                  {line.supplierLineStatus !== "rejected" ? (
                    <Input
                      placeholder="Qty accepted"
                      value={line.qtyAccepted}
                      onChange={(e) =>
                        setLineDrafts((rows) =>
                          rows.map((row, i) =>
                            i === index ? { ...row, qtyAccepted: e.target.value } : row,
                          ),
                        )
                      }
                    />
                  ) : null}
                  <Input
                    placeholder="Note (optional)"
                    value={line.supplierNote}
                    onChange={(e) =>
                      setLineDrafts((rows) =>
                        rows.map((row, i) =>
                          i === index ? { ...row, supplierNote: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </div>
              ) : (
                <p className="mt-1 text-xs text-[var(--pos-primary,#0f766e)]">
                  {line.supplierLineStatus}
                  {line.qtyAccepted ? ` · qty ${line.qtyAccepted}` : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!detail.supplierResponseAt ? (
        <button
          type="button"
          className={cn(spBtnPrimary, "w-full")}
          disabled={submitting}
          onClick={onRespond}
        >
          Submit response
        </button>
      ) : (
        <div className="space-y-2 border-t border-border pt-4">
          <Input
            placeholder="Tracking note (optional)"
            value={trackingNote}
            onChange={(e) => setTrackingNote(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={spBtnGhost}
              disabled={submitting}
              onClick={() => onShip("in_transit")}
            >
              In transit
            </button>
            <button
              type="button"
              className={spBtnPrimary}
              disabled={submitting}
              onClick={() => onShip("delivered")}
            >
              Delivered
            </button>
          </div>
          {detail.deliveryStatus ? (
            <p className="text-xs text-muted-foreground">
              Delivery status: {detail.deliveryStatus}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
