"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  FileDown,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { kioskPlaceholderWashClass } from "@/components/cashier/kiosk-listing-styles";
import { TelLink } from "@/components/tel-link";
import { APP_ROUTES } from "@/lib/config";
import type {
  MarketplaceCatalogProductPreview,
  MarketplaceSupplierDetail,
} from "@/lib/marketplace-api";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import { formatPaymentMethodLabel } from "@/lib/sale-payment-filter";
import { cn, formatMoney } from "@/lib/utils";

import {
  buildMarketplaceOrderPdf,
  buildWhatsAppOrderUrl,
  normalizeWhatsAppPhone,
  shareOrDownloadOrderPdf,
} from "../_lib/marketplace-order-pdf";
import { mktBtn, mktBtnGhost } from "./marketplace-ui";

type CartQty = Record<string, number>;
type OrderLayout = "default" | "shelf";

const SHELF_TILE = cn(
  "group relative flex h-full flex-col overflow-hidden border",
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
  "bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)] text-left",
  "transition-[border-color,background-color,box-shadow] duration-150",
  "hover:z-[1] hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_32%,transparent)] hover:bg-card",
  "hover:shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
);

const PARENT_RAIL_BASE = cn(
  "relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden border",
  "text-center text-[10px] font-semibold leading-tight transition touch-manipulation",
);

const PARENT_RAIL_HEADER = cn(
  "flex h-8 shrink-0 items-center justify-center",
  "bg-[var(--pos-primary,#0f766e)] px-1.5 text-center text-[10px] font-bold uppercase tracking-[0.14em]",
  "text-[var(--pos-primary-ink,#fff)]",
);

type ParentOption = {
  id: string | null;
  label: string;
  thumbnailUrl: string | null;
};

/** Parent id for filtering: variant parent, else the catalog item itself. */
function productParentId(product: MarketplaceCatalogProductPreview): string {
  const variant = product.variantOfItemId?.trim();
  if (variant) return variant;
  const itemId = product.itemId?.trim();
  if (itemId) return itemId;
  return product.id;
}

function productParentLabel(product: MarketplaceCatalogProductPreview): string {
  const parent = product.parentItemName?.trim();
  if (parent) return parent;
  const name = product.name?.trim() || product.sku?.trim() || "Product";
  const sep = name.indexOf(" · ");
  return sep > 0 ? name.slice(0, sep) : name;
}

function parentRailClass(active: boolean, hasImage: boolean): string {
  if (hasImage) {
    return cn(
      PARENT_RAIL_BASE,
      "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_60%,transparent)]",
      active &&
        "border-[var(--pos-primary,#0f766e)] shadow-[inset_0_0_0_2px_var(--pos-primary,#0f766e)]",
    );
  }
  return active
    ? cn(
        PARENT_RAIL_BASE,
        "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] px-1 text-[var(--pos-primary-ink,#fff)]",
      )
    : cn(
        PARENT_RAIL_BASE,
        "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-1",
        "bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)] text-[var(--pos-ink,#1c1915)]",
        "hover:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,var(--card))]",
      );
}

function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function isJunkLocation(value: string): boolean {
  return /^(optional|n\/a|na|none|-)$/i.test(value.trim());
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
}

function ProductImage({
  src,
  alt,
  hue,
  className,
  iconClassName = "size-5",
}: {
  src: string | null | undefined;
  alt: string;
  hue: number;
  className?: string;
  iconClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src && !failed);

  return (
    <div
      className={cn("relative overflow-hidden bg-muted/40", className)}
      style={
        showImage
          ? undefined
          : {
              background: `linear-gradient(145deg, hsl(${hue} 18% 88%), hsl(${(hue + 28) % 360} 14% 78%))`,
            }
      }
    >
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          unoptimized
          className="object-contain p-2"
          sizes="(max-width: 640px) 50vw, 240px"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-foreground/60">
          <Package className={iconClassName} />
        </span>
      )}
    </div>
  );
}

function QtyControl({
  qty,
  onChange,
  compact = false,
}: {
  qty: number;
  onChange: (qty: number) => void;
  compact?: boolean;
}) {
  if (qty <= 0) {
    return (
      <button
        type="button"
        className={cn(mktBtnGhost, compact ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-xs")}
        onClick={(e) => {
          e.stopPropagation();
          onChange(1);
        }}
      >
        <Plus className="size-3.5" />
        Add
      </button>
    );
  }
  return (
    <div
      className="inline-flex items-center border border-border"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={cn(
          "flex items-center justify-center hover:bg-muted",
          compact ? "size-8" : "size-9",
        )}
        onClick={() => onChange(qty - 1)}
        aria-label="Decrease quantity"
      >
        <Minus className="size-3.5" />
      </button>
      <span
        className={cn(
          "text-center text-sm font-semibold tabular-nums",
          compact ? "min-w-7" : "min-w-8",
        )}
      >
        {qty}
      </span>
      <button
        type="button"
        className={cn(
          "flex items-center justify-center hover:bg-muted",
          compact ? "size-8" : "size-9",
        )}
        onClick={() => onChange(qty + 1)}
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function MarketplaceOrderWorkspace({
  detail,
  selectedProductSlug,
  layout = "default",
}: {
  detail: MarketplaceSupplierDetail;
  selectedProductSlug?: string | null;
  layout?: OrderLayout;
}) {
  const isShelf = layout === "shelf";
  const selected = isShelf
    ? null
    : (detail.products.find(
        (p) =>
          selectedProductSlug &&
          p.slug?.toLowerCase() === selectedProductSlug.toLowerCase(),
      ) ??
      detail.products[0] ??
      null);

  const [cart, setCart] = useState<CartQty>(() =>
    !isShelf && selected ? { [selected.id]: 1 } : {},
  );
  const [sendingOrder, setSendingOrder] = useState(false);
  const [filter, setFilter] = useState("");
  const [parentFilterId, setParentFilterId] = useState<string | null>(null);
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);

  // Opening a product page starts a fresh order with only that product.
  // Related rows stay at Add (0) until the buyer chooses them.
  useEffect(() => {
    if (isShelf) return;
    setCart(selected ? { [selected.id]: 1 } : {});
  }, [selected?.id, isShelf]);

  const setQty = (productId: string, qty: number, announce = false) => {
    setCart((prev) => {
      const next = { ...prev };
      const prevQty = prev[productId] ?? 0;
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      if (announce && prevQty === 0 && qty > 0) {
        queueMicrotask(() => toast.message("Added to order"));
      }
      return next;
    });
  };

  const cartLines = useMemo(
    () =>
      detail.products
        .filter((p) => (cart[p.id] ?? 0) > 0)
        .map((p) => ({ product: p, qty: cart[p.id] ?? 0 })),
    [cart, detail.products],
  );

  const cartUnits = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.qty, 0),
    [cartLines],
  );

  const cartTotal = useMemo(
    () =>
      cartLines.reduce((sum, line) => {
        if (line.product.unitPrice == null) return sum;
        return sum + line.product.unitPrice * line.qty;
      }, 0),
    [cartLines],
  );

  const cartCurrency =
    cartLines.find((l) => l.product.currency)?.product.currency ?? "KES";

  const otherProducts = detail.products.filter((p) => p.id !== selected?.id);
  const supplierHref = detail.slug
    ? APP_ROUTES.marketplaceSupplier(detail.slug)
    : APP_ROUTES.marketplace;

  const areaLabel = [detail.location, ...detail.locations]
    .map((l) => l?.trim())
    .filter((l): l is string => typeof l === "string" && l.length > 0 && !isJunkLocation(l))
    .filter((l, i, arr) => arr.indexOf(l) === i)
    .join(" · ");

  // Location already shown under the product title — don't repeat in contact.
  const showAreaInContact = !selected;

  const parentOptions = useMemo((): ParentOption[] => {
    const map = new Map<string, { label: string; thumbnailUrl: string | null }>();
    for (const product of detail.products) {
      const id = productParentId(product);
      if (map.has(id)) continue;
      map.set(id, {
        label: productParentLabel(product),
        thumbnailUrl:
          product.parentImageUrl?.trim() ||
          (product.variantOfItemId ? null : product.imageUrl?.trim() || null) ||
          null,
      });
    }
    const sorted = [...map.entries()]
      .map(([id, row]) => ({
        id,
        label: row.label,
        thumbnailUrl: row.thumbnailUrl,
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, "en", { sensitivity: "base" }),
      );
    return [{ id: null, label: "All", thumbnailUrl: null }, ...sorted];
  }, [detail.products]);

  const showParentRail = parentOptions.length > 2;

  useEffect(() => {
    if (
      parentFilterId &&
      !parentOptions.some((p) => p.id === parentFilterId)
    ) {
      setParentFilterId(null);
    }
  }, [parentFilterId, parentOptions]);

  const shelfProducts = useMemo(() => {
    const byParent = parentFilterId
      ? detail.products.filter((p) => productParentId(p) === parentFilterId)
      : detail.products;
    const q = filter.trim().toLowerCase();
    if (!q) return byParent;
    return byParent.filter((p) => {
      const hay = [
        p.name,
        p.sku,
        p.barcode,
        p.categoryName,
        p.parentItemName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [detail.products, filter, parentFilterId]);

  const activeParentLabel = parentFilterId
    ? parentOptions.find((p) => p.id === parentFilterId)?.label ?? "Shelf"
    : "Shelf";

  const sendOrder = async () => {
    if (cartLines.length === 0) {
      toast.error("Add at least one product to the order.");
      return;
    }
    setSendingOrder(true);
    try {
      const lines = cartLines.map(({ product, qty }) => ({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        qty,
        unitPrice: product.unitPrice,
        currency: product.currency,
      }));
      const filename = `order-${detail.name.replace(/\s+/g, "-").toLowerCase().slice(0, 40)}.pdf`;
      const blob = buildMarketplaceOrderPdf({
        supplierName: detail.name,
        supplierPhone: detail.contactPhone,
        location: areaLabel || detail.location,
        listedBy: detail.listedBy,
        lines,
      });
      const wa = buildWhatsAppOrderUrl({
        phone: detail.contactPhone,
        supplierName: detail.name,
        lines,
        filename,
      });
      if (!wa && !detail.contactPhone) {
        toast.message("No WhatsApp number on this supplier — downloading PDF.");
      }
      const mode = await shareOrDownloadOrderPdf(blob, filename, wa);
      toast.success(
        mode === "shared"
          ? "Order shared — pick WhatsApp to send the PDF."
          : wa
            ? "PDF downloaded and WhatsApp opened with your order."
            : "PDF downloaded. Attach it in WhatsApp to the supplier.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not build order",
      );
    } finally {
      setSendingOrder(false);
    }
  };

  const orderActions = (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <ShoppingCart className="size-3.5" />
          {cartUnits === 0
            ? "Empty"
            : `${cartUnits} unit${cartUnits === 1 ? "" : "s"} · ${cartLines.length} line${cartLines.length === 1 ? "" : "s"}`}
        </span>
        <span
          className={cn(
            "font-semibold tabular-nums",
            isShelf ? "font-mono text-[1.05rem]" : "font-heading text-lg",
          )}
        >
          {formatMoney(cartTotal, cartCurrency)}
        </span>
      </div>
      <button
        type="button"
        className={cn(
          isShelf
            ? "inline-flex h-11 w-full items-center justify-center gap-2 bg-[var(--pos-primary,#0f766e)] px-4 text-sm font-semibold text-[var(--pos-primary-ink,#fff)] transition hover:opacity-95 disabled:pointer-events-none disabled:opacity-50"
            : cn(mktBtn, "w-full"),
        )}
        disabled={sendingOrder || cartLines.length === 0}
        onClick={() => void sendOrder()}
      >
        {sendingOrder ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Preparing…
          </>
        ) : (
          <>
            <FileDown className="size-4" />
            Download PDF & open WhatsApp
          </>
        )}
      </button>
      <p className="text-center text-[11px] text-muted-foreground">
        Downloads an order sheet, then opens WhatsApp with the supplier.
      </p>
    </div>
  );

  const orderFooter = (
    <div
      className={cn(
        "sticky bottom-0 space-y-2 border p-3 sm:p-4",
        isShelf
          ? "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,#faf8f4_94%,transparent)]"
          : "border-border/60 bg-card",
      )}
    >
      {orderActions}
    </div>
  );

  if (isShelf) {
    return (
      <div className="relative flex w-full flex-col overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_92%,#f7f3eb)] lg:min-h-[70vh]">
        <div className="flex min-h-0 flex-1 items-stretch overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]">
            <section className="relative shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2.5 pb-2 pt-2 sm:px-3">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1 bg-[var(--pos-primary,#0f766e)]"
              />
              <div className="pl-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Order
                </p>
                <h2 className="mt-0.5 text-[1.05rem] font-semibold leading-none text-[var(--pos-ink,#1c1915)]">
                  {detail.name}
                </h2>
                {areaLabel ? (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="size-3" />
                    {areaLabel}
                  </p>
                ) : null}
              </div>
            </section>

            <div className="relative shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-9 w-full border-0 bg-transparent pl-8 pr-3 text-[13px] shadow-none outline-none placeholder:text-muted-foreground/50"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Find a product…"
              />
            </div>

            <SupplierContactSection
              detail={detail}
              areaLabel=""
              className="border-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)] px-3 py-3 sm:px-4"
            />

            {showParentRail ? (
              <div className="flex gap-1 overflow-x-auto border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)] p-1 scrollbar-none lg:hidden">
                {parentOptions.map((parent) => (
                  <ParentFolderButton
                    key={parent.id ?? "all"}
                    parent={parent}
                    active={parentFilterId === parent.id}
                    className="size-[3.75rem] shrink-0"
                    onSelect={() => setParentFilterId(parent.id)}
                  />
                ))}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-y-contain px-1.5 py-2 pb-24 sm:px-2.5 lg:pb-2">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <h3 className="flex items-baseline gap-2 text-[0.9rem] font-semibold leading-none text-[var(--pos-ink,#1c1915)]">
                  {activeParentLabel}
                  <span className="font-mono text-[10px] font-medium tabular-nums tracking-normal text-muted-foreground">
                    {shelfProducts.length}
                  </span>
                </h3>
              </div>

              {shelfProducts.length === 0 ? (
                <div className="border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] py-10 text-center text-[11px] text-muted-foreground">
                  {detail.products.length === 0
                    ? "No linked products yet."
                    : parentFilterId
                      ? "No products under this parent."
                      : "No products match your search."}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {shelfProducts.map((product) => (
                    <ShelfProductTile
                      key={product.id}
                      product={product}
                      supplierSlug={detail.slug}
                      qty={cart[product.id] ?? 0}
                      onAdd={() =>
                        setQty(product.id, (cart[product.id] ?? 0) + 1, true)
                      }
                      onSetQty={(qty) => setQty(product.id, qty)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {showParentRail ? (
            <aside className="hidden min-h-0 w-[6.5rem] shrink-0 flex-col border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)] lg:flex xl:w-[7.25rem]">
              <div className={PARENT_RAIL_HEADER}>Parent</div>
              <nav
                aria-label="Filter by parent product"
                className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-0.5"
              >
                {parentOptions.map((parent) => (
                  <ParentFolderButton
                    key={parent.id ?? "all"}
                    parent={parent}
                    active={parentFilterId === parent.id}
                    onSelect={() => setParentFilterId(parent.id)}
                  />
                ))}
              </nav>
            </aside>
          ) : null}

          <div className="hidden min-h-0 w-[min(100%,20rem)] shrink-0 lg:flex xl:w-[22rem]">
            <OrderManifestPanel
              supplierName={detail.name}
              lines={cartLines}
              currency={cartCurrency}
              sending={sendingOrder}
              onSetQty={(productId, qty) => setQty(productId, qty)}
              onRemove={(productId) => setQty(productId, 0)}
              onSend={() => void sendOrder()}
            />
          </div>
        </div>

        <button
          type="button"
          className={cn(
            "fixed bottom-3 right-3 z-30 flex h-12 items-center gap-2 px-3.5 lg:hidden",
            "bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]",
            "shadow-[0_10px_24px_-10px_color-mix(in_srgb,var(--pos-primary,#0f766e)_70%,transparent)]",
          )}
          onClick={() => setMobileOrderOpen(true)}
        >
          <ShoppingCart className="size-4" />
          <span className="text-[13px] font-semibold">
            Order
            {cartUnits > 0 ? (
              <span className="ml-1.5 font-mono tabular-nums">
                · {cartUnits}
              </span>
            ) : null}
          </span>
        </button>

        {mobileOrderOpen ? (
          <div className="fixed inset-0 z-40 flex flex-col bg-[color-mix(in_srgb,#e7e1d6_92%,transparent)] p-3 lg:hidden">
            <OrderManifestPanel
              supplierName={detail.name}
              lines={cartLines}
              currency={cartCurrency}
              sending={sendingOrder}
              onSetQty={(productId, qty) => setQty(productId, qty)}
              onRemove={(productId) => setQty(productId, 0)}
              onSend={() => void sendOrder()}
              onClose={() => setMobileOrderOpen(false)}
              className="h-full max-h-full"
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-3 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <Link
          href={APP_ROUTES.marketplace}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Marketplace
        </Link>
        <p className="text-xs text-muted-foreground">
          {detail.name}
          {detail.products.length ? ` · ${detail.products.length} products` : ""}
        </p>
      </div>

      {selected ? (
        <section className="border border-border/55 bg-muted/10 p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
            <ProductImage
              src={selected.imageUrl}
              alt={selected.name}
              hue={hueFromId(selected.id)}
              className="aspect-square border border-border/50"
              iconClassName="size-6 opacity-50"
            />
            <div className="min-w-0">
              {selected.categoryName ? (
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {selected.categoryName}
                </p>
              ) : null}
              <h1 className="font-heading text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
                {selected.name}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                <Link href={supplierHref} className="underline underline-offset-2">
                  {detail.name}
                </Link>
                {areaLabel ? ` · ${areaLabel}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="font-heading text-xl font-semibold tabular-nums sm:text-2xl">
                  {selected.unitPrice != null
                    ? formatMoney(selected.unitPrice, selected.currency ?? "KES")
                    : "Ask price"}
                </p>
                <QtyControl
                  qty={cart[selected.id] ?? 0}
                  onChange={(qty) => setQty(selected.id, qty, true)}
                />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="border border-border/55 bg-muted/10 p-4">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {detail.name}
          </h1>
          {areaLabel ? (
            <p className="mt-1.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {areaLabel}
            </p>
          ) : null}
          {detail.description ? (
            <p className="mt-2 text-sm text-muted-foreground">{detail.description}</p>
          ) : null}
        </section>
      )}

      <SupplierContactSection
        detail={detail}
        areaLabel={showAreaInContact ? areaLabel : ""}
      />

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">
            {selected ? `More from ${detail.name}` : `Products from ${detail.name}`}
          </h2>
          <span className="text-xs text-muted-foreground">
            {(selected ? otherProducts : detail.products).length}
          </span>
        </div>
        {(selected ? otherProducts : detail.products).length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {selected
              ? "This is the only linked product for this supplier."
              : "No linked products yet."}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {(selected ? otherProducts : detail.products).map((product) => (
              <CatalogueOrderRow
                key={product.id}
                product={product}
                supplierSlug={detail.slug}
                qty={cart[product.id] ?? 0}
                onSetQty={(qty) => setQty(product.id, qty, true)}
              />
            ))}
          </ul>
        )}
      </section>

      {orderFooter}
    </div>
  );
}

function SupplierContactSection({
  detail,
  areaLabel,
  className,
}: {
  detail: MarketplaceSupplierDetail;
  areaLabel: string;
  className?: string;
}) {
  const paymentLabel = detail.paymentMethodPreferred
    ? formatPaymentMethodLabel(detail.paymentMethodPreferred)
    : null;
  const paymentDetails = detail.paymentDetails?.trim() || null;
  const paymentCopyValue = [paymentLabel, paymentDetails].filter(Boolean).join(" · ");

  const payoutLine =
    detail.payoutType && detail.payoutPhone
      ? `${formatPaymentMethodLabel(detail.payoutType)} ${detail.payoutPhone}`
      : detail.payoutPhone?.trim() || null;

  const seenPhones = new Set<string>();
  const contactLines: { label: string; phone?: string; email?: string }[] = [];

  const addContact = (
    label: string,
    phone?: string | null,
    email?: string | null,
  ) => {
    const digits = phone?.replace(/\D/g, "") ?? "";
    if (digits && seenPhones.has(digits)) return;
    if (digits) seenPhones.add(digits);
    if (!phone?.trim() && !email?.trim()) return;
    contactLines.push({
      label,
      phone: phone?.trim() || undefined,
      email: email?.trim() || undefined,
    });
  };

  const primary =
    detail.contacts.find((c) => c.primaryContact) ?? detail.contacts[0];
  if (primary) {
    addContact(
      [primary.name, primary.roleLabel].filter(Boolean).join(" · ") || "Contact",
      primary.phone ?? detail.contactPhone,
      primary.email ?? detail.contactEmail,
    );
  } else {
    addContact("Contact", detail.contactPhone, detail.contactEmail);
  }

  for (const c of detail.contacts) {
    if (c === primary) continue;
    addContact(
      [c.name, c.roleLabel].filter(Boolean).join(" · ") || "Contact",
      c.phone,
      c.email,
    );
  }

  if (
    contactLines.length === 0 &&
    !paymentCopyValue &&
    !payoutLine &&
    !areaLabel &&
    !detail.listedBy
  ) {
    return null;
  }

  return (
    <section
      className={cn(
        className ?? "border border-border/55 bg-muted/5 px-3 py-3 sm:px-4",
      )}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          {contactLines.map((line) => (
            <div key={`${line.label}-${line.phone ?? line.email}`} className="text-sm">
              <p className="text-[11px] text-muted-foreground">{line.label}</p>
              {line.phone ? (
                <PhoneLink phone={line.phone} showWhatsApp className="text-sm" />
              ) : null}
              {line.email ? (
                <a
                  href={`mailto:${line.email}`}
                  className="block text-sm underline underline-offset-2"
                >
                  {line.email}
                </a>
              ) : null}
            </div>
          ))}
          {areaLabel ? (
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {areaLabel}
            </p>
          ) : null}
        </div>

        <div className="min-w-0 space-y-2 text-sm">
          {paymentCopyValue ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">Payment</p>
                <CopyButton value={paymentCopyValue} label="Payment details" />
              </div>
              {paymentLabel ? (
                <p className="font-medium leading-snug">{paymentLabel}</p>
              ) : null}
              {paymentDetails ? (
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {paymentDetails}
                </p>
              ) : null}
            </div>
          ) : null}
          {payoutLine && payoutLine !== paymentCopyValue ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">Payout</p>
                <CopyButton value={payoutLine} label="Payout details" />
              </div>
              <p className="leading-snug">{payoutLine}</p>
            </div>
          ) : null}
          {detail.listedBy ? (
            <p className="text-xs text-muted-foreground">
              Listed by {detail.listedBy}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      onClick={() => {
        void copyText(value, label).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function PhoneLink({
  phone,
  showWhatsApp = false,
  className,
}: {
  phone: string;
  showWhatsApp?: boolean;
  className?: string;
}) {
  const wa = normalizeWhatsAppPhone(phone);
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-0.5", className)}>
      <TelLink phone={phone} className="underline underline-offset-2 hover:text-foreground/80" />
      {showWhatsApp && wa ? (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          <MessageCircle className="size-3" />
          WhatsApp
        </a>
      ) : null}
    </span>
  );
}

function ParentFolderButton({
  parent,
  active,
  className,
  onSelect,
}: {
  parent: ParentOption;
  active: boolean;
  className?: string;
  onSelect: () => void;
}) {
  const thumb = parent.thumbnailUrl?.trim() || null;
  const hasImage = Boolean(thumb);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(parentRailClass(active, hasImage), className)}
      title={parent.label}
    >
      {thumb ? (
        <>
          <Image
            src={thumb}
            alt=""
            fill
            sizes="80px"
            className="object-cover"
            unoptimized
          />
          <span className="absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/80 via-black/45 to-transparent px-0.5 pb-0.5 pt-4 text-[9px] font-semibold leading-tight text-white">
            <span className="line-clamp-2">{parent.label}</span>
          </span>
        </>
      ) : (
        <span className="line-clamp-3 px-0.5">{parent.label}</span>
      )}
    </button>
  );
}

function OrderManifestPanel({
  supplierName,
  lines,
  currency,
  sending,
  onSetQty,
  onRemove,
  onSend,
  onClose,
  className,
}: {
  supplierName: string;
  lines: { product: MarketplaceCatalogProductPreview; qty: number }[];
  currency: string;
  sending: boolean;
  onSetQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onSend: () => void;
  onClose?: () => void;
  className?: string;
}) {
  const total = lines.reduce((sum, line) => {
    if (line.product.unitPrice == null) return sum;
    return sum + line.product.unitPrice * line.qty;
  }, 0);
  const units = lines.reduce((sum, line) => sum + line.qty, 0);

  return (
    <aside
      className={cn(
        "flex h-full max-h-full min-h-0 w-full shrink-0 flex-col self-stretch overflow-hidden",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-full min-h-0 flex-1 flex-col overflow-hidden",
          "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
          "bg-[color-mix(in_srgb,var(--card)_92%,#faf7f1)]",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b-2 border-[var(--pos-ink,#1c1915)] px-2.5 py-2">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Order list
            </p>
            <h2 className="mt-0.5 truncate text-base font-semibold leading-none text-[var(--pos-ink,#1c1915)]">
              {supplierName}
            </h2>
          </div>
          {onClose ? (
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] text-muted-foreground hover:text-foreground"
              onClick={onClose}
              aria-label="Close order list"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 space-y-0 overflow-y-auto">
          {lines.length === 0 ? (
            <p className="mx-2.5 my-3 border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] px-3 py-10 text-center text-[11px] leading-relaxed text-muted-foreground">
              Tap shelf products to build this order.
            </p>
          ) : (
            lines.map((line, index) => (
              <div
                key={line.product.id}
                className="space-y-1.5 border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2.5 py-2 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-start gap-1.5 text-[12px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)]">
                      <span className="mt-0.5 shrink-0 font-mono text-[9px] font-normal tabular-nums text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{line.product.name}</span>
                    </p>
                    {line.product.sku ? (
                      <p className="mt-0.5 pl-5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                        {line.product.sku}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="shrink-0 p-0.5 text-destructive/70 hover:text-destructive"
                    onClick={() => onRemove(line.product.id)}
                    aria-label={`Remove ${line.product.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 pl-5">
                  <div className="inline-flex items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]">
                    <button
                      type="button"
                      className="flex size-7 items-center justify-center hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]"
                      onClick={() => onSetQty(line.product.id, line.qty - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="min-w-7 text-center font-mono text-[12px] font-semibold tabular-nums">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      className="flex size-7 items-center justify-center hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]"
                      onClick={() => onSetQty(line.product.id, line.qty + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                  <p className="font-mono text-[12px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
                    {line.product.unitPrice != null
                      ? formatMoney(
                          line.product.unitPrice * line.qty,
                          line.product.currency ?? currency,
                        )
                      : "Ask"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="shrink-0 space-y-2 border-t-2 border-[var(--pos-ink,#1c1915)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)] px-2.5 py-2.5">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="text-muted-foreground">
              {units === 0
                ? "No lines yet"
                : `${units} unit${units === 1 ? "" : "s"} · ${lines.length} line${lines.length === 1 ? "" : "s"}`}
            </span>
            <span className="font-mono text-[14px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
              {formatMoney(total, currency)}
            </span>
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[var(--pos-primary,#0f766e)] px-4 text-sm font-semibold text-[var(--pos-primary-ink,#fff)] transition hover:opacity-95 disabled:pointer-events-none disabled:opacity-50"
            disabled={sending || lines.length === 0}
            onClick={onSend}
          >
            {sending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Preparing…
              </>
            ) : (
              <>
                <FileDown className="size-4" />
                PDF & WhatsApp
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

function CatalogueOrderRow({
  product,
  supplierSlug,
  qty,
  onSetQty,
}: {
  product: MarketplaceCatalogProductPreview;
  supplierSlug: string | null;
  qty: number;
  onSetQty: (qty: number) => void;
}) {
  const hue = hueFromId(product.id);
  const href =
    supplierSlug && product.slug
      ? APP_ROUTES.marketplaceProduct(supplierSlug, product.slug)
      : null;

  return (
    <div className="flex items-center gap-2.5 border border-border/50 bg-muted/10 p-2">
      {href ? (
        <Link href={href} className="shrink-0">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            hue={hue}
            className="size-12 border border-border/40"
            iconClassName="size-4 opacity-50"
          />
        </Link>
      ) : (
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          hue={hue}
          className="size-12 border border-border/40"
          iconClassName="size-4 opacity-50"
        />
      )}
      <div className="min-w-0 flex-1">
        {href ? (
          <Link
            href={href}
            className="block text-sm font-medium leading-snug hover:underline"
          >
            {product.name}
          </Link>
        ) : (
          <p className="text-sm font-medium leading-snug">{product.name}</p>
        )}
        <p className="mt-0.5 text-sm font-semibold tabular-nums">
          {product.unitPrice != null
            ? formatMoney(product.unitPrice, product.currency ?? "KES")
            : "Ask"}
        </p>
      </div>
      <QtyControl qty={qty} onChange={onSetQty} compact />
    </div>
  );
}

function ShelfProductTile({
  product,
  supplierSlug,
  qty,
  onAdd,
  onSetQty,
}: {
  product: MarketplaceCatalogProductPreview;
  supplierSlug: string | null;
  qty: number;
  onAdd: () => void;
  onSetQty: (qty: number) => void;
}) {
  const thumb = posTileThumbUrl(product.name, product.imageUrl);
  const href =
    supplierSlug && product.slug
      ? APP_ROUTES.marketplaceProduct(supplierSlug, product.slug)
      : null;

  return (
    <div
      className={cn(
        SHELF_TILE,
        qty > 0 &&
          "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_45%,var(--card))]",
      )}
    >
      <div className="relative aspect-square w-full shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)]">
        <button
          type="button"
          onClick={onAdd}
          className="absolute inset-0 z-0 text-left"
          aria-label={
            qty > 0
              ? `${product.name}, ${qty} in order. Tap to add another.`
              : `Add ${product.name} to order`
          }
        >
          {thumb ? (
            <Image
              src={thumb}
              alt=""
              fill
              sizes="(max-width: 640px) 30vw, (max-width: 1024px) 16vw, 120px"
              className="object-contain p-0.5 transition-transform duration-300 group-hover:scale-[1.04]"
              unoptimized
            />
          ) : (
            <span
              className={cn(
                "flex h-full w-full items-center justify-center bg-gradient-to-br",
                kioskPlaceholderWashClass(product.name),
              )}
              aria-hidden
            >
              <Package className="size-5 opacity-55" strokeWidth={1.5} />
            </span>
          )}
        </button>
        {qty > 0 ? (
          <span className="pointer-events-none absolute left-0 top-0 z-[1] inline-flex h-5 min-w-5 items-center justify-center bg-[var(--pos-primary,#0f766e)] px-1 font-mono text-[10px] font-bold tabular-nums text-[var(--pos-primary-ink,#fff)]">
            {qty}
          </span>
        ) : null}
      </div>
      <div className="flex min-h-[3.25rem] w-full flex-1 flex-col justify-between gap-1 px-1 pb-1 pt-1">
        {href ? (
          <Link
            href={href}
            className="text-[11px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {product.name}
          </Link>
        ) : (
          <p className="text-[11px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)]">
            {product.name}
          </p>
        )}
        <div className="flex items-center justify-between gap-1">
          <p className="font-mono text-[10px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
            {product.unitPrice != null
              ? formatMoney(product.unitPrice, product.currency ?? "KES")
              : "Ask"}
          </p>
          {qty > 0 ? (
            <div
              className="inline-flex items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="flex size-6 items-center justify-center hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]"
                onClick={() => onSetQty(qty - 1)}
                aria-label="Decrease quantity"
              >
                <Minus className="size-3" />
              </button>
              <span className="min-w-5 text-center font-mono text-[10px] font-semibold tabular-nums">
                {qty}
              </span>
              <button
                type="button"
                className="flex size-6 items-center justify-center hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]"
                onClick={() => onSetQty(qty + 1)}
                aria-label="Increase quantity"
              >
                <Plus className="size-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex h-6 items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]"
            >
              <Plus className="mr-0.5 size-3" />
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
