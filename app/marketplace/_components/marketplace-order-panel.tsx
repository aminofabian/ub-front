"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  FileDown,
  Loader2,
  MapPin,
  Minus,
  Package,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

import { APP_ROUTES } from "@/lib/config";
import type {
  MarketplaceCatalogProductPreview,
  MarketplaceSupplierDetail,
} from "@/lib/marketplace-api";
import { cn, formatMoney } from "@/lib/utils";

import {
  buildMarketplaceOrderPdf,
  buildWhatsAppOrderUrl,
  shareOrDownloadOrderPdf,
} from "../_lib/marketplace-order-pdf";
import { mktBtn, mktBtnGhost } from "./marketplace-ui";

type CartQty = Record<string, number>;

function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
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
}: {
  qty: number;
  onChange: (qty: number) => void;
}) {
  if (qty <= 0) {
    return (
      <button
        type="button"
        className={cn(mktBtnGhost, "h-9 px-3 text-xs")}
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
        className="flex size-9 items-center justify-center hover:bg-muted"
        onClick={() => onChange(qty - 1)}
        aria-label="Decrease quantity"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
        {qty}
      </span>
      <button
        type="button"
        className="flex size-9 items-center justify-center hover:bg-muted"
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
}: {
  detail: MarketplaceSupplierDetail;
  selectedProductSlug?: string | null;
}) {
  const selected =
    detail.products.find(
      (p) =>
        selectedProductSlug &&
        p.slug?.toLowerCase() === selectedProductSlug.toLowerCase(),
    ) ??
    detail.products[0] ??
    null;

  const [cart, setCart] = useState<CartQty>(() =>
    selected ? { [selected.id]: 1 } : {},
  );
  const [sendingOrder, setSendingOrder] = useState(false);

  const setQty = (productId: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
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
        location: detail.location,
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
            ? "PDF downloaded and WhatsApp opened with your order text."
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

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <Link
          href={APP_ROUTES.marketplace}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Marketplace
        </Link>
        <div className="min-w-0 text-right">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {detail.name}
            {detail.products.length
              ? ` · ${detail.products.length} products`
              : ""}
          </p>
          {detail.slug ? (
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              /marketplace/s/{detail.slug}
              {selected?.slug ? `/p/${selected.slug}` : ""}
            </p>
          ) : null}
        </div>
      </div>

      {selected ? (
        <section className="space-y-3 border border-border/55 bg-muted/10 p-4">
          <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
            <ProductImage
              src={selected.imageUrl}
              alt={selected.name}
              hue={hueFromId(selected.id)}
              className="aspect-square border border-border/50"
              iconClassName="size-7 opacity-50"
            />
            <div className="min-w-0">
              {selected.categoryName ? (
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {selected.categoryName}
                </p>
              ) : null}
              <h1 className="font-heading text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                {selected.name}
              </h1>
              {selected.slug ? (
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {selected.slug}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {[selected.barcode, selected.sku].filter(Boolean).join(" · ") ||
                  "—"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                From{" "}
                <Link href={supplierHref} className="underline underline-offset-2">
                  {detail.name}
                </Link>
                {detail.location ? ` · ${detail.location}` : ""}
              </p>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  {selected.unitPrice != null ? (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Buying price
                      </p>
                      <p className="font-heading text-2xl font-semibold tabular-nums">
                        {formatMoney(
                          selected.unitPrice,
                          selected.currency ?? "KES",
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Ask price</p>
                  )}
                </div>
                <QtyControl
                  qty={cart[selected.id] ?? 0}
                  onChange={(qty) => setQty(selected.id, qty)}
                />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="border border-border/55 bg-muted/10 p-5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {detail.name}
          </h1>
          {detail.slug ? (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              /marketplace/s/{detail.slug}
            </p>
          ) : null}
          {detail.location ? (
            <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {detail.location}
            </p>
          ) : null}
          {detail.description ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {detail.description}
            </p>
          ) : null}
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            {selected
              ? `More from ${detail.name}`
              : `Products from ${detail.name}`}
          </h2>
          <span className="text-xs text-muted-foreground">
            {detail.products.length} linked
          </span>
        </div>
        {(selected ? otherProducts : detail.products).length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {selected
              ? "This is the only linked product for this supplier."
              : "No linked products yet."}
          </p>
        ) : (
          <ul className="space-y-2">
            {(selected ? otherProducts : detail.products).map((product) => (
              <CatalogueOrderRow
                key={product.id}
                product={product}
                supplierSlug={detail.slug}
                qty={cart[product.id] ?? 0}
                onSetQty={(qty) => setQty(product.id, qty)}
              />
            ))}
          </ul>
        )}
      </section>

      <div className="sticky bottom-0 space-y-3 border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <ShoppingCart className="size-3.5" />
            {cartLines.length} line{cartLines.length === 1 ? "" : "s"}
          </span>
          <span className="font-heading text-lg font-semibold tabular-nums">
            {formatMoney(cartTotal, cartCurrency)}
          </span>
        </div>
        <button
          type="button"
          className={cn(mktBtn, "w-full")}
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
              PDF + WhatsApp order
            </>
          )}
        </button>
      </div>
    </div>
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
    <div className="flex items-start gap-2.5 border border-border/50 bg-muted/10 p-2">
      {href ? (
        <Link href={href} className="shrink-0">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            hue={hue}
            className="size-14 border border-border/40"
            iconClassName="size-4 opacity-50"
          />
        </Link>
      ) : (
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          hue={hue}
          className="size-14 border border-border/40"
          iconClassName="size-4 opacity-50"
        />
      )}
      <div className="min-w-0 flex-1">
        {href ? (
          <Link href={href} className="block truncate text-sm font-medium hover:underline">
            {product.name}
          </Link>
        ) : (
          <p className="truncate text-sm font-medium">{product.name}</p>
        )}
        {product.slug ? (
          <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            {product.slug}
          </p>
        ) : null}
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {[product.barcode, product.sku].filter(Boolean).join(" · ") || "—"}
        </p>
        {product.unitPrice != null ? (
          <p className="mt-1 text-sm font-semibold tabular-nums">
            {formatMoney(product.unitPrice, product.currency ?? "KES")}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Ask</p>
        )}
      </div>
      <QtyControl qty={qty} onChange={onSetQty} />
    </div>
  );
}
