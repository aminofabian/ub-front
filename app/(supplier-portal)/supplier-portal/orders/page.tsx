"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import {
  mktChip,
  mktChipActive,
  mktPosAccentBar,
  mktPosHeader,
  mktPosSearch,
  mktPosTile,
  spBtnGhost,
  spBtnPrimary,
  spEyebrow,
  spPage,
  spPanel,
  spSerifTitle,
} from "@/components/supplier-portal/supplier-portal-ui";
import { APP_ROUTES } from "@/lib/config";
import {
  createSupplierPortalOrder,
  fetchSupplierPortalHubShops,
  fetchSupplierPortalOrder,
  fetchSupplierPortalOrders,
  fetchSupplierPortalShopProducts,
  respondSupplierPortalOrder,
  shipSupplierPortalOrder,
  type SupplierPortalHubShops,
  type SupplierPortalOrderDetail,
  type SupplierPortalOrderRow,
  type SupplierPortalShopProduct,
} from "@/lib/marketplace-api";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";
import { cn, formatMoney } from "@/lib/utils";

type LineDraft = {
  purchaseOrderLineId: string;
  supplierLineStatus: string;
  qtyAccepted: string;
  supplierNote: string;
};

type CartLine = {
  itemId: string;
  name: string;
  qty: number;
  unitCost: number;
  thumbnailUrl: string | null;
};

type ComposerStep = "shop" | "products" | "review";

function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function unitCostOf(product: SupplierPortalShopProduct): number {
  const candidates = [product.defaultCostPrice, product.lastCostPrice];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c) && c > 0) return c;
  }
  return 0.01;
}

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

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState<ComposerStep>("shop");
  const [hub, setHub] = useState<SupplierPortalHubShops | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [products, setProducts] = useState<SupplierPortalShopProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [creating, setCreating] = useState(false);

  const [shopFilterId, setShopFilterId] = useState<string | null>(null);
  const [shopQuery, setShopQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "awaiting" | "responded" | "in_transit" | "delivered"
  >("all");
  const [orderSearch, setOrderSearch] = useState("");

  const shopOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const order of orders) {
      const id = order.businessId;
      const existing = map.get(id);
      if (existing) {
        existing.count += 1;
        continue;
      }
      map.set(id, {
        id,
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
      if (statusFilter === "awaiting" && order.supplierResponseAt) return false;
      if (statusFilter === "responded" && !order.supplierResponseAt) return false;
      if (
        statusFilter === "in_transit" &&
        order.deliveryStatus !== "in_transit"
      ) {
        return false;
      }
      if (
        statusFilter === "delivered" &&
        order.deliveryStatus !== "delivered"
      ) {
        return false;
      }
      if (!q) return true;
      return (
        order.poNumber.toLowerCase().includes(q) ||
        order.businessName.toLowerCase().includes(q) ||
        order.status.toLowerCase().includes(q)
      );
    });
  }, [orders, shopFilterId, statusFilter, orderSearch]);

  const selectedShopName =
    shopOptions.find((s) => s.id === shopFilterId)?.name ?? null;

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

  const openComposer = async () => {
    setComposerOpen(true);
    setComposerStep("shop");
    setShopId(null);
    setProducts([]);
    setCart([]);
    setOrderNotes("");
    setProductQuery("");
    try {
      const shops = await fetchSupplierPortalHubShops();
      setHub(shops);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load shops");
    }
  };

  const selectShop = async (localSupplierId: string) => {
    setShopId(localSupplierId);
    setComposerStep("products");
    setProductsLoading(true);
    setCart([]);
    setProductQuery("");
    try {
      const rows = await fetchSupplierPortalShopProducts(localSupplierId);
      setProducts(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load products");
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.itemName.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.variantName ?? "").toLowerCase().includes(q),
    );
  }, [products, productQuery]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.qty * line.unitCost, 0),
    [cart],
  );

  const selectedShop = hub?.shops.find((s) => s.localSupplierId === shopId) ?? null;

  const addToCart = (product: SupplierPortalShopProduct) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.itemId === product.itemId);
      if (existing) {
        return prev.map((l) =>
          l.itemId === product.itemId ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          itemId: product.itemId,
          name: product.itemName,
          qty: 1,
          unitCost: unitCostOf(product),
          thumbnailUrl: product.thumbnailUrl,
        },
      ];
    });
  };

  const setCartQty = (itemId: string, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((l) => l.itemId !== itemId);
      return prev.map((l) => (l.itemId === itemId ? { ...l, qty } : l));
    });
  };

  const submitOrder = async () => {
    if (!shopId || cart.length === 0) return;
    setCreating(true);
    try {
      const created = await createSupplierPortalOrder({
        localSupplierId: shopId,
        notes: orderNotes.trim() || undefined,
        lines: cart.map((line) => ({
          itemId: line.itemId,
          qtyOrdered: line.qty,
          unitEstimatedCost: line.unitCost,
        })),
      });
      toast.success(`Order ${created.poNumber} created`);
      setComposerOpen(false);
      await loadOrders();
      await openOrder(created.purchaseOrderId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create order");
    } finally {
      setCreating(false);
    }
  };

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
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <p className={spEyebrow}>portal · sell → orders</p>
            <h2 className={cn(spSerifTitle, "mt-0.5 text-2xl sm:text-3xl")}>Orders</h2>
          </div>
          <button type="button" className={spBtnPrimary} onClick={() => void openComposer()}>
            <ShoppingBag className="size-3.5" />
            Take order
          </button>
        </header>

        {composerOpen ? (
          <TakeOrderComposer
            step={composerStep}
            hub={hub}
            shopId={shopId}
            selectedShop={selectedShop}
            products={filteredProducts}
            productsLoading={productsLoading}
            productQuery={productQuery}
            cart={cart}
            cartTotal={cartTotal}
            orderNotes={orderNotes}
            creating={creating}
            currency={hub?.currency ?? "KES"}
            onClose={() => setComposerOpen(false)}
            onStep={setComposerStep}
            onSelectShop={(id) => void selectShop(id)}
            onQuery={setProductQuery}
            onAdd={addToCart}
            onSetQty={setCartQty}
            onNotes={setOrderNotes}
            onSubmit={() => void submitOrder()}
          />
        ) : null}

        <div
          className={cn(
            "flex min-h-[min(72dvh,40rem)] flex-col overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
            "bg-[color-mix(in_srgb,var(--card)_92%,#f7f3eb)] lg:flex-row",
          )}
          style={{ ["--pos-primary" as string]: "#0f766e" }}
        >
          {/* Parent filter · shops */}
          <aside className="flex max-h-[28%] w-full shrink-0 flex-col overflow-hidden border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] lg:max-h-none lg:w-52 lg:border-b-0 lg:border-r xl:w-56">
            <div className={mktPosHeader}>
              <span>Shops</span>
              <span className="font-mono tabular-nums opacity-80">
                {shopOptions.length}
              </span>
            </div>
            <div className="relative border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]">
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
                    : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)] hover:text-foreground",
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
                      : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)] hover:text-foreground",
                  )}
                >
                  <span className="min-w-0 truncate">{shop.name}</span>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums opacity-70">
                    {shop.count}
                  </span>
                </button>
              ))}
              {!loading && shopOptions.length === 0 ? (
                <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
                  No shops in inbox yet.
                </p>
              ) : null}
            </nav>
          </aside>

          {/* Order list */}
          <aside className="flex max-h-[36%] w-full shrink-0 flex-col overflow-hidden border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] lg:max-h-none lg:w-[17.5rem] lg:border-b-0 lg:border-r xl:w-[19rem]">
            <div className={mktPosHeader}>
              <span>Orders</span>
              <span className="font-mono tabular-nums opacity-80">
                {filteredOrders.length}
              </span>
            </div>
            <div className="relative border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-9 w-full bg-transparent pl-8 pr-2 text-[13px] outline-none placeholder:text-muted-foreground/60"
                placeholder="Search PO or shop"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>
            <div className="flex shrink-0 gap-0 overflow-x-auto border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(
                [
                  ["all", "All"],
                  ["awaiting", "Awaiting"],
                  ["responded", "Responded"],
                  ["in_transit", "In transit"],
                  ["delivered", "Delivered"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  className={cn(
                    "shrink-0 border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-2.5 py-1.5 text-[11px] font-medium",
                    statusFilter === id
                      ? "bg-[var(--pos-primary,#0f766e)] text-white"
                      : "text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1">
              {loading ? (
                <p className="px-2 py-8 text-center text-[12px] text-muted-foreground">
                  <Loader2 className="mr-1 inline size-3.5 animate-spin" />
                  Loading inbox…
                </p>
              ) : filteredOrders.length === 0 ? (
                <p className="px-2 py-10 text-center text-[12px] text-muted-foreground">
                  {orders.length === 0
                    ? "No purchase orders yet. Take an order to get started."
                    : "No orders match this filter."}
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
                        : "border-transparent hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]",
                    )}
                  >
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {order.poNumber} · {order.status}
                    </span>
                    <span className="w-full truncate text-[12px] font-semibold text-[var(--pos-ink,#1c1915)]">
                      {order.businessName}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {order.lineCount} lines
                      </span>
                      {!order.supplierResponseAt ? (
                        <span className="text-[10px] font-semibold text-[var(--pos-primary,#0f766e)]">
                          · awaiting
                        </span>
                      ) : order.deliveryStatus ? (
                        <span className="text-[10px] text-muted-foreground">
                          · {order.deliveryStatus}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* Order detail */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-3 py-2">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Order detail
                  {selectedShopName ? ` · ${selectedShopName}` : ""}
                </p>
                <h3 className="truncate text-[15px] font-semibold text-[var(--pos-ink,#1c1915)]">
                  {detail
                    ? `${detail.poNumber} · ${detail.businessName}`
                    : "Select an order"}
                </h3>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              {!selectedId ? (
                <p className="py-16 text-center text-[12px] text-muted-foreground">
                  Pick an order from the list to review lines.
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
      </div>
    </SupplierPortalShell>
  );
}

function TakeOrderComposer({
  step,
  hub,
  shopId,
  selectedShop,
  products,
  productsLoading,
  productQuery,
  cart,
  cartTotal,
  orderNotes,
  creating,
  currency,
  onClose,
  onStep,
  onSelectShop,
  onQuery,
  onAdd,
  onSetQty,
  onNotes,
  onSubmit,
}: {
  step: ComposerStep;
  hub: SupplierPortalHubShops | null;
  shopId: string | null;
  selectedShop: SupplierPortalHubShops["shops"][number] | null;
  products: SupplierPortalShopProduct[];
  productsLoading: boolean;
  productQuery: string;
  cart: CartLine[];
  cartTotal: number;
  orderNotes: string;
  creating: boolean;
  currency: string;
  onClose: () => void;
  onStep: (step: ComposerStep) => void;
  onSelectShop: (id: string) => void;
  onQuery: (q: string) => void;
  onAdd: (product: SupplierPortalShopProduct) => void;
  onSetQty: (itemId: string, qty: number) => void;
  onNotes: (notes: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className={spPanel}>
      <div className={mktPosHeader}>
        <span>Take order</span>
        <button type="button" className="opacity-90 hover:opacity-100" onClick={onClose}>
          <X className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-3 py-2.5">
        {(
          [
            ["shop", "1 · Shop"],
            ["products", "2 · Products"],
            ["review", "3 · Review"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={cn(mktChip, step === key && mktChipActive)}
            onClick={() => {
              if (key === "shop") onStep("shop");
              if (key === "products" && shopId) onStep("products");
              if (key === "review" && cart.length > 0) onStep("review");
            }}
          >
            {label}
          </button>
        ))}
        {cart.length > 0 ? (
          <span className={cn(mktChip, "ml-auto")}>
            {cart.reduce((n, l) => n + l.qty, 0)} in bag · {formatMoney(cartTotal, currency)}
          </span>
        ) : null}
      </div>

      {step === "shop" ? (
        <div className="p-3">
          <p className="mb-3 text-sm text-muted-foreground">
            Choose the shop this order is for.
          </p>
          {!hub ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading shops…
            </div>
          ) : hub.shops.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No connected shops yet. Link a shop from Profile, then try again.
            </p>
          ) : (
            <div className="grid gap-px bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] sm:grid-cols-2">
              {hub.shops.map((shop) => (
                <button
                  key={shop.localSupplierId}
                  type="button"
                  className="relative bg-[color-mix(in_srgb,var(--card)_96%,#f7f3eb)] px-4 py-4 text-left transition hover:bg-card"
                  onClick={() => onSelectShop(shop.localSupplierId)}
                >
                  <span className={mktPosAccentBar} />
                  <p className="pl-2 font-medium text-[var(--pos-ink,#1c1915)]">{shop.shopName}</p>
                  <p className="mt-1 pl-2 text-xs text-muted-foreground">Tap to pick products</p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {step === "products" ? (
        <div className="space-y-3 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className={spEyebrow}>ordering for</p>
              <p className="font-medium text-[var(--pos-ink,#1c1915)]">
                {selectedShop?.shopName ?? "Shop"}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className={spBtnGhost} onClick={() => onStep("shop")}>
                Change shop
              </button>
              <button
                type="button"
                className={spBtnPrimary}
                disabled={cart.length === 0}
                onClick={() => onStep("review")}
              >
                Review bag ({cart.reduce((n, l) => n + l.qty, 0)})
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={productQuery}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search linked products…"
              className={cn(
                mktPosSearch,
                "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_96%,#f7f3eb)]",
              )}
            />
          </div>

          {productsLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading linked products…
            </div>
          ) : products.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No linked products for this shop yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-px bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => {
                const inCart = cart.find((l) => l.itemId === product.itemId);
                const thumb = posTileThumbUrl(product.itemName, product.thumbnailUrl);
                const hue = hueFromId(product.itemId);
                return (
                  <article
                    key={product.itemId}
                    className={cn(mktPosTile, "bg-[color-mix(in_srgb,var(--card)_96%,#f7f3eb)]")}
                  >
                    <ProductThumb name={product.itemName} src={thumb} hue={hue} />
                    <div className="flex flex-1 flex-col gap-1 px-2 pb-2 pt-1.5">
                      <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)]">
                        {product.itemName}
                      </p>
                      <p className="font-mono text-[11px] font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
                        {formatMoney(unitCostOf(product), currency)}
                      </p>
                      {product.currentStock != null ? (
                        <p className="text-[9px] text-muted-foreground">
                          Shop stock {product.currentStock}
                        </p>
                      ) : null}
                      {inCart ? (
                        <div className="mt-auto flex items-center gap-1 pt-1">
                          <button
                            type="button"
                            className={cn(spBtnGhost, "h-7 flex-1 px-1")}
                            onClick={() => onSetQty(product.itemId, inCart.qty - 1)}
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
                            {inCart.qty}
                          </span>
                          <button
                            type="button"
                            className={cn(spBtnGhost, "h-7 flex-1 px-1")}
                            onClick={() => onSetQty(product.itemId, inCart.qty + 1)}
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={cn(spBtnPrimary, "mt-auto h-7 w-full text-[9px]")}
                          onClick={() => onAdd(product)}
                        >
                          <Plus className="size-3" />
                          Add
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {step === "review" ? (
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className={spEyebrow}>review</p>
              <p className="font-medium text-[var(--pos-ink,#1c1915)]">
                {selectedShop?.shopName ?? "Shop"} · {cart.length} products
              </p>
            </div>
            <button type="button" className={spBtnGhost} onClick={() => onStep("products")}>
              Edit products
            </button>
          </div>

          <ul className="divide-y divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]">
            {cart.map((line) => (
              <li key={line.itemId} className="flex items-center gap-3 px-3 py-2.5">
                <div className="relative size-10 shrink-0 overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-muted/30">
                  {line.thumbnailUrl ? (
                    <Image
                      src={line.thumbnailUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-contain p-0.5"
                    />
                  ) : (
                    <Package className="absolute inset-0 m-auto size-4 opacity-40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--pos-ink,#1c1915)]">
                    {line.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(line.unitCost, currency)} × {line.qty}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className={cn(spBtnGhost, "h-7 w-7 px-0")}
                    onClick={() => onSetQty(line.itemId, line.qty - 1)}
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
                    {line.qty}
                  </span>
                  <button
                    type="button"
                    className={cn(spBtnGhost, "h-7 w-7 px-0")}
                    onClick={() => onSetQty(line.itemId, line.qty + 1)}
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
                <p className="min-w-[4.5rem] text-right text-sm font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
                  {formatMoney(line.unitCost * line.qty, currency)}
                </p>
              </li>
            ))}
          </ul>

          <Input
            placeholder="Note for the shop (optional)"
            value={orderNotes}
            onChange={(e) => onNotes(e.target.value)}
            className="rounded-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Total{" "}
              <span className="font-semibold text-[var(--pos-ink,#1c1915)]">
                {formatMoney(cartTotal, currency)}
              </span>
            </p>
            <button
              type="button"
              className={spBtnPrimary}
              disabled={creating || cart.length === 0}
              onClick={onSubmit}
            >
              {creating ? <Loader2 className="size-3.5 animate-spin" /> : <ShoppingBag className="size-3.5" />}
              {creating ? "Creating…" : "Create order"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ProductThumb({
  name,
  src,
  hue,
}: {
  name: string;
  src: string | null;
  hue: number;
}) {
  const [failed, setFailed] = useState(false);
  const show = Boolean(src && !failed);
  return (
    <div
      className="relative aspect-square w-full overflow-hidden border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]"
      style={
        show
          ? undefined
          : {
              background: `linear-gradient(145deg, hsl(${hue} 22% 88%), hsl(${(hue + 32) % 360} 16% 76%))`,
            }
      }
    >
      {show ? (
        <Image
          src={src!}
          alt={name}
          fill
          unoptimized
          className="object-contain p-1"
          sizes="160px"
          onError={() => setFailed(true)}
        />
      ) : (
        <Package className="absolute inset-0 m-auto size-5 opacity-40" />
      )}
    </div>
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
              {!detail.supplierResponseAt ? (
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
      ) : null}
    </div>
  );
}
