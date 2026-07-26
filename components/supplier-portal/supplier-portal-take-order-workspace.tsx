"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Loader2,
  Package,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  createSupplierPortalOrder,
  fetchSupplierPortalHubShops,
  fetchSupplierPortalShopProducts,
  type SupplierPortalHubShops,
  type SupplierPortalShopProduct,
} from "@/lib/marketplace-api";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import { cn, formatMoney } from "@/lib/utils";

type CartQty = Record<string, number>;

type Props = {
  onOpenInbox?: () => void;
  onOrderCreated?: (purchaseOrderId: string) => void;
};

function normalizeParentLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

function productParentId(product: SupplierPortalShopProduct): string {
  const parent = product.parentItemName?.trim();
  if (parent) return `name:${normalizeParentLabel(parent)}`;
  const name = product.itemName?.trim() || "";
  const sep = name.indexOf(" · ");
  if (sep > 0) return `name:${normalizeParentLabel(name.slice(0, sep))}`;
  if (name) return `name:${normalizeParentLabel(name)}`;
  return product.itemId;
}

function productParentLabel(product: SupplierPortalShopProduct): string {
  const parent = product.parentItemName?.trim();
  if (parent) return parent;
  const name = product.itemName?.trim() || "Product";
  const sep = name.indexOf(" · ");
  return sep > 0 ? name.slice(0, sep) : name;
}

function unitCostOf(product: SupplierPortalShopProduct): number {
  for (const c of [product.defaultCostPrice, product.lastCostPrice]) {
    if (typeof c === "number" && Number.isFinite(c) && c > 0) return c;
  }
  return 0;
}

export function SupplierPortalTakeOrderWorkspace({
  onOpenInbox,
  onOrderCreated,
}: Props) {
  const [hub, setHub] = useState<SupplierPortalHubShops | null>(null);
  const [loadingShops, setLoadingShops] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopQuery, setShopQuery] = useState("");
  const [products, setProducts] = useState<SupplierPortalShopProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [parentFilterId, setParentFilterId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartQty>({});
  const [placing, setPlacing] = useState(false);
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);
  const [shopPickerOpen, setShopPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingShops(true);
    void fetchSupplierPortalHubShops()
      .then((rows) => {
        if (cancelled) return;
        setHub(rows);
        setShopId((current) => {
          if (current && rows.shops.some((s) => s.localSupplierId === current)) {
            return current;
          }
          return rows.shops[0]?.localSupplierId ?? null;
        });
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Could not load shops",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingShops(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!shopId) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    setLoadingProducts(true);
    setParentFilterId(null);
    setProductQuery("");
    setCart({});
    void fetchSupplierPortalShopProducts(shopId)
      .then((rows) => {
        if (!cancelled) setProducts(rows);
      })
      .catch((error) => {
        if (!cancelled) {
          setProducts([]);
          toast.error(
            error instanceof Error ? error.message : "Could not load products",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  const shops = hub?.shops ?? [];
  const currency = hub?.currency?.trim() || "KES";
  const activeShop = shops.find((s) => s.localSupplierId === shopId) ?? null;

  const filteredShops = useMemo(() => {
    const q = shopQuery.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter((s) => s.shopName.toLowerCase().includes(q));
  }, [shops, shopQuery]);

  const parentOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of products) {
      const id = productParentId(product);
      if (!map.has(id)) map.set(id, productParentLabel(product));
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  const showFamilies = parentOptions.length >= 2;

  const visibleProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    let rows = products;
    if (parentFilterId) {
      rows = rows.filter((p) => productParentId(p) === parentFilterId);
    }
    if (q) {
      rows = rows.filter((p) => {
        const hay = [p.itemName, p.sku, p.barcode, p.variantName, p.parentItemName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return [...rows].sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [products, productQuery, parentFilterId]);

  const cartLines = useMemo(
    () =>
      products
        .filter((p) => (cart[p.itemId] ?? 0) > 0)
        .map((p) => ({ product: p, qty: cart[p.itemId] ?? 0 })),
    [products, cart],
  );

  const cartUnits = cartLines.reduce((sum, line) => sum + line.qty, 0);
  const cartTotal = cartLines.reduce(
    (sum, line) => sum + unitCostOf(line.product) * line.qty,
    0,
  );

  const setQty = (itemId: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[itemId];
      else next[itemId] = qty;
      return next;
    });
  };

  const placeOrder = async () => {
    if (!shopId || !activeShop) {
      toast.error("Pick a shop first");
      return;
    }
    if (cartLines.length === 0) {
      toast.error("Add products to the order");
      return;
    }
    setPlacing(true);
    try {
      const created = await createSupplierPortalOrder({
        localSupplierId: shopId,
        lines: cartLines.map((line) => ({
          itemId: line.product.itemId,
          qtyOrdered: line.qty,
          unitEstimatedCost: unitCostOf(line.product) || undefined,
        })),
      });
      setCart({});
      setMobileOrderOpen(false);
      toast.success(`Order ${created.poNumber} created`);
      onOrderCreated?.(created.purchaseOrderId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create order",
      );
    } finally {
      setPlacing(false);
    }
  };

  const cartLinesPanel = (
    <>
      {cartLines.length === 0 ? (
        <p className="px-4 py-12 text-center text-[13px] text-muted-foreground">
          Tap products to build your order.
        </p>
      ) : (
        cartLines.map(({ product, qty }) => {
          const cost = unitCostOf(product);
          const thumb = posTileThumbUrl(product.itemName, product.thumbnailUrl);
          return (
            <div
              key={product.itemId}
              className="flex gap-3 border-b border-border/60 px-3 py-3 last:border-b-0"
            >
              <div className="relative size-12 shrink-0 overflow-hidden bg-muted/50">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-contain p-1"
                    unoptimized
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <Package className="size-4 opacity-30" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-snug">
                  {product.itemName}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center border border-border">
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center"
                      onClick={() => setQty(product.itemId, qty - 1)}
                    >
                      −
                    </button>
                    <span className="min-w-7 text-center font-mono text-[12px]">
                      {qty}
                    </span>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center"
                      onClick={() => setQty(product.itemId, qty + 1)}
                    >
                      +
                    </button>
                  </div>
                  <p className="font-mono text-[13px] font-semibold tabular-nums">
                    {cost > 0 ? formatMoney(cost * qty, currency) : "—"}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </>
  );

  const placeFooter = (
    <div className="shrink-0 space-y-2.5 border-t border-border bg-background px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-baseline justify-between">
        <p className="text-[12px] text-muted-foreground">
          {cartUnits} item{cartUnits === 1 ? "" : "s"}
        </p>
        <p className="font-mono text-[18px] font-semibold tabular-nums">
          {formatMoney(cartTotal, currency)}
        </p>
      </div>
      <button
        type="button"
        disabled={placing || cartLines.length === 0}
        onClick={() => void placeOrder()}
        className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[var(--pos-primary,#0f766e)] text-sm font-semibold text-white disabled:opacity-40"
      >
        {placing ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Placing…
          </>
        ) : (
          <>
            <ShoppingCart className="size-4" />
            Place order
          </>
        )}
      </button>
    </div>
  );

  return (
    <div
      className={cn(
        "relative flex w-full flex-col overflow-hidden border border-border bg-background font-sans",
        "h-[calc(100dvh-10.5rem)] min-h-[22rem] sm:h-[min(72dvh,48rem)]",
      )}
      style={{ ["--pos-primary" as string]: "#0f766e" }}
    >
      <div className="flex shrink-0 items-stretch border-b border-border">
        <button
          type="button"
          onClick={() => {
            setShopPickerOpen(true);
            setShopQuery("");
          }}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2.5 text-left active:bg-muted/40 lg:pointer-events-none"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Shop
            </p>
            <p className="truncate text-[14px] font-semibold leading-tight">
              {activeShop?.shopName ?? "Select shop"}
            </p>
          </div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground lg:hidden" />
        </button>
        {onOpenInbox ? (
          <button
            type="button"
            onClick={onOpenInbox}
            className="inline-flex shrink-0 items-center gap-1.5 border-l border-border px-3 text-[12px] font-medium text-[var(--pos-primary,#0f766e)]"
          >
            <ClipboardList className="size-3.5" />
            Inbox
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="hidden w-52 shrink-0 flex-col border-r border-border lg:flex xl:w-56">
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-10 w-full bg-transparent pl-8 pr-2 text-[13px] outline-none placeholder:text-muted-foreground/60"
              placeholder="Find shop"
              value={shopQuery}
              onChange={(e) => setShopQuery(e.target.value)}
            />
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto p-1">
            {loadingShops ? (
              <p className="px-2 py-8 text-center text-[12px] text-muted-foreground">
                <Loader2 className="mr-1 inline size-3.5 animate-spin" />
                Loading
              </p>
            ) : shops.length === 0 ? (
              <p className="px-2 py-8 text-center text-[12px] text-muted-foreground">
                No connected shops yet.
              </p>
            ) : (
              filteredShops.map((shop) => (
                <button
                  key={shop.localSupplierId}
                  type="button"
                  onClick={() => setShopId(shop.localSupplierId)}
                  className={cn(
                    "mb-0.5 w-full px-2.5 py-2.5 text-left text-[13px] font-medium",
                    shopId === shop.localSupplierId
                      ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_14%,transparent)]"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {shop.shopName}
                </button>
              ))
            )}
          </nav>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative shrink-0 border-b border-border">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-11 w-full bg-transparent pl-10 pr-3 text-[16px] outline-none placeholder:text-muted-foreground/55 sm:h-10 sm:text-[14px]"
              placeholder="Search products"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              enterKeyHint="search"
            />
          </div>

          {showFamilies ? (
            <div className="shrink-0 border-b border-border">
              <div className="flex gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setParentFilterId(null)}
                  className={cn(
                    "shrink-0 border-r border-border px-3.5 py-2 text-[12px] font-medium",
                    !parentFilterId
                      ? "bg-[var(--pos-primary,#0f766e)] text-white"
                      : "bg-transparent text-muted-foreground",
                  )}
                >
                  All
                </button>
                {parentOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setParentFilterId(
                        parentFilterId === opt.id ? null : opt.id,
                      )
                    }
                    className={cn(
                      "max-w-[10rem] shrink-0 truncate border-r border-border px-3.5 py-2 text-[12px] font-medium",
                      parentFilterId === opt.id
                        ? "bg-[var(--pos-primary,#0f766e)] text-white"
                        : "text-muted-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-2.5">
            {!shopId ? (
              <p className="py-16 text-center text-[13px] text-muted-foreground">
                Choose a shop to start.
              </p>
            ) : loadingProducts ? (
              <p className="flex items-center justify-center gap-2 py-16 text-[13px] text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </p>
            ) : visibleProducts.length === 0 ? (
              <p className="py-16 text-center text-[13px] text-muted-foreground">
                {parentFilterId
                  ? "Nothing in this family."
                  : "No linked products."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {visibleProducts.map((product) => {
                  const qty = cart[product.itemId] ?? 0;
                  const stock = product.currentStock;
                  const cost = unitCostOf(product);
                  const thumb = posTileThumbUrl(
                    product.itemName,
                    product.thumbnailUrl,
                  );
                  return (
                    <div
                      key={product.itemId}
                      className={cn(
                        "flex flex-col overflow-hidden border bg-card",
                        qty > 0
                          ? "border-[var(--pos-primary,#0f766e)]"
                          : "border-border",
                      )}
                    >
                      <button
                        type="button"
                        className="relative aspect-square w-full touch-manipulation bg-muted/40"
                        onClick={() => setQty(product.itemId, qty + 1)}
                        aria-label={`Add ${product.itemName}`}
                      >
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 48vw, 140px"
                            className="object-contain p-2"
                            unoptimized
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <Package
                              className="size-5 opacity-25"
                              strokeWidth={1.5}
                            />
                          </span>
                        )}
                        {qty > 0 ? (
                          <span className="absolute left-0 top-0 z-[1] inline-flex h-5 min-w-5 items-center justify-center bg-[var(--pos-primary,#0f766e)] px-1 font-mono text-[10px] font-bold text-white">
                            {qty}
                          </span>
                        ) : null}
                        {stock != null ? (
                          <span className="absolute bottom-0 right-0 z-[1] bg-foreground/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-white">
                            {stock}
                          </span>
                        ) : null}
                      </button>
                      <div className="flex flex-1 flex-col gap-1.5 p-2">
                        <p className="line-clamp-2 min-h-[2.25rem] text-[12px] font-medium leading-snug">
                          {product.itemName}
                        </p>
                        <div className="mt-auto flex items-center justify-between gap-1">
                          <p className="font-mono text-[12px] font-semibold tabular-nums">
                            {cost > 0 ? formatMoney(cost, currency) : "—"}
                          </p>
                          {qty > 0 ? (
                            <div className="inline-flex items-center border border-border">
                              <button
                                type="button"
                                className="flex size-7 items-center justify-center touch-manipulation"
                                onClick={() => setQty(product.itemId, qty - 1)}
                              >
                                −
                              </button>
                              <span className="min-w-5 text-center font-mono text-[11px]">
                                {qty}
                              </span>
                              <button
                                type="button"
                                className="flex size-7 items-center justify-center touch-manipulation"
                                onClick={() => setQty(product.itemId, qty + 1)}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="px-1.5 py-1 text-[11px] font-semibold text-[var(--pos-primary,#0f766e)] touch-manipulation"
                              onClick={() => setQty(product.itemId, 1)}
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="hidden w-72 shrink-0 flex-col border-l border-border lg:flex xl:w-80">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
            <p className="text-[12px] font-medium text-muted-foreground">
              Order list
            </p>
            <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
              {cartUnits}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{cartLinesPanel}</div>
          {placeFooter}
        </aside>
      </div>

      <button
        type="button"
        onClick={() => setMobileOrderOpen(true)}
        className="flex w-full shrink-0 items-center justify-between gap-3 border-t border-border bg-[var(--pos-primary,#0f766e)] px-3 py-3 text-white lg:hidden active:brightness-95"
      >
        <span className="text-left">
          <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-white/75">
            Your order
          </span>
          <span className="text-[14px] font-semibold">
            {cartUnits === 0
              ? "No items yet"
              : `${cartUnits} item${cartUnits === 1 ? "" : "s"}`}
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="font-mono text-[15px] font-semibold tabular-nums">
            {formatMoney(cartTotal, currency)}
          </span>
          <ChevronUp className="size-4 opacity-90" />
        </span>
      </button>

      {shopPickerOpen ? (
        <div className="absolute inset-0 z-50 flex flex-col lg:hidden">
          <button
            type="button"
            className="min-h-0 flex-[0.2] bg-black/40"
            aria-label="Close shops"
            onClick={() => setShopPickerOpen(false)}
          />
          <div className="flex max-h-[80%] min-h-[50%] flex-col border-t border-border bg-background">
            <div className="flex items-center justify-between border-b border-border px-3 py-3">
              <p className="text-[15px] font-semibold">Shops</p>
              <button
                type="button"
                className="flex size-9 items-center justify-center text-muted-foreground"
                onClick={() => setShopPickerOpen(false)}
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="relative border-b border-border">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                className="h-11 w-full bg-transparent pl-10 pr-3 text-[16px] outline-none"
                placeholder="Search shops"
                value={shopQuery}
                onChange={(e) => setShopQuery(e.target.value)}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {filteredShops.map((shop) => (
                <button
                  key={shop.localSupplierId}
                  type="button"
                  onClick={() => {
                    setShopId(shop.localSupplierId);
                    setShopPickerOpen(false);
                    setShopQuery("");
                  }}
                  className={cn(
                    "flex w-full border-b border-border/70 px-3 py-3.5 text-left text-[14px] font-medium",
                    shopId === shop.localSupplierId
                      ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)]"
                      : "",
                  )}
                >
                  {shop.shopName}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {mobileOrderOpen ? (
        <div className="absolute inset-0 z-50 flex flex-col lg:hidden">
          <button
            type="button"
            className="min-h-0 flex-1 bg-black/40"
            aria-label="Dismiss order"
            onClick={() => setMobileOrderOpen(false)}
          />
          <div className="flex max-h-[88%] min-h-[45%] flex-col border-t border-border bg-background">
            <div className="flex items-center justify-between border-b border-border px-3 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Order list
                </p>
                <p className="truncate text-[15px] font-semibold">
                  {activeShop?.shopName ?? "Shop"}
                </p>
              </div>
              <button
                type="button"
                className="flex size-9 items-center justify-center text-muted-foreground"
                onClick={() => setMobileOrderOpen(false)}
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {cartLinesPanel}
            </div>
            {placeFooter}
          </div>
        </div>
      ) : null}
    </div>
  );
}
