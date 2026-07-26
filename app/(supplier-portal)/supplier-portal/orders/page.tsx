"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import {
  mktChip,
  mktChipActive,
  mktPosHeader,
  spBtnGhost,
  spBtnPrimary,
  spEyebrow,
  spPage,
  spPanel,
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

export default function SupplierPortalOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<SupplierPortalOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupplierPortalOrderDetail | null>(null);
  const [lineDrafts, setLineDrafts] = useState<LineDraft[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trackingNote, setTrackingNote] = useState("");

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
    void loadOrders();
  }, [router, loadOrders]);

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
      <div className={cn(spPage, "grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]")}>
        <section className={spPanel}>
          <div className={mktPosHeader}>
            <span>1 · Orders inbox</span>
            <span>{orders.length}</span>
          </div>
          <div className="border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-4 py-4">
            <p className={spEyebrow}>portal · sell → orders</p>
            <h2 className={cn(spSerifTitle, "mt-1 text-3xl sm:text-[2rem]")}>Orders</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Purchase orders sent from connected businesses.
            </p>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading inbox…
            </div>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]">
              {orders.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No purchase orders yet.
                </li>
              ) : (
                orders.map((order) => (
                  <li key={order.purchaseOrderId}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full flex-col gap-1.5 px-4 py-3 text-left transition hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,transparent)]",
                        selectedId === order.purchaseOrderId &&
                          "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)]",
                      )}
                      onClick={() => void openOrder(order.purchaseOrderId)}
                    >
                      <span className="font-medium text-[var(--pos-ink,#1c1915)]">
                        {order.poNumber} · {order.businessName}
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        <span className={mktChip}>{order.lineCount} lines</span>
                        <span className={mktChip}>{order.status}</span>
                        {order.deliveryStatus ? (
                          <span className={mktChip}>{order.deliveryStatus}</span>
                        ) : null}
                        {!order.supplierResponseAt ? (
                          <span className={cn(mktChip, mktChipActive)}>Awaiting response</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </section>

        <aside className={spPanel}>
          <div className={mktPosHeader}>
            <span>2 · Order detail</span>
            <span>{selectedId ? "1" : "0"}</span>
          </div>
          <div className="p-4">
          {!selectedId ? (
            <p className="text-sm text-muted-foreground">Select an order to review lines.</p>
          ) : detailLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading order…
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[var(--pos-ink,#1c1915)]">
                  {detail.poNumber}
                </h3>
                <p className="text-sm text-muted-foreground">{detail.businessName}</p>
                {detail.notes ? (
                  <p className="mt-2 text-sm text-muted-foreground">{detail.notes}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                {lineDrafts.map((line, index) => {
                  const item = detail.lines[index];
                  return (
                    <div
                      key={line.purchaseOrderLineId}
                      className="border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)] p-3 text-sm"
                    >
                      <p className="font-medium text-[var(--pos-ink,#1c1915)]">{item?.itemName}</p>
                      <p className="text-xs text-muted-foreground">
                        Ordered {item?.qtyOrdered}
                        {item?.unitEstimatedCost != null
                          ? ` · ${formatMoney(item.unitEstimatedCost, "KES")}`
                          : ""}
                      </p>
                      <div className="mt-2 grid gap-2">
                        <select
                          className="h-9 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-background px-2 text-sm"
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
                    </div>
                  );
                })}
              </div>

              {!detail.supplierResponseAt ? (
                <button
                  type="button"
                  className={cn(spBtnPrimary, "w-full")}
                  disabled={submitting}
                  onClick={() => void onRespond()}
                >
                  Submit response
                </button>
              ) : (
                <p className="text-xs text-[var(--pos-primary,#0f766e)]">
                  Response submitted
                  {detail.supplierResponseAt
                    ? ` · ${new Date(detail.supplierResponseAt).toLocaleString()}`
                    : ""}
                </p>
              )}

              {detail.supplierResponseAt ? (
                <div className="space-y-2 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] pt-4">
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
                      onClick={() => void onShip("in_transit")}
                    >
                      In transit
                    </button>
                    <button
                      type="button"
                      className={spBtnPrimary}
                      disabled={submitting}
                      onClick={() => void onShip("delivered")}
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
              ) : null}
            </div>
          ) : null}
          </div>
        </aside>
      </div>
    </SupplierPortalShell>
  );
}
