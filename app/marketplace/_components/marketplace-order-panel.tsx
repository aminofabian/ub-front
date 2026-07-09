"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
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
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

import { APP_ROUTES } from "@/lib/config";
import type {
  MarketplaceCatalogProductPreview,
  MarketplaceSupplierDetail,
} from "@/lib/marketplace-api";
import { cn, formatMoney } from "@/lib/utils";
import { formatPaymentMethodLabel } from "@/lib/sale-payment-filter";

import {
  buildMarketplaceOrderPdf,
  buildWhatsAppOrderUrl,
  normalizeWhatsAppPhone,
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
    .filter((l): l is string => Boolean(l) && !isJunkLocation(l))
    .filter((l, i, arr) => arr.indexOf(l) === i)
    .join(" · ");

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
        <p className="truncate text-xs text-muted-foreground">
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

      <SupplierContactSection detail={detail} areaLabel={areaLabel} />

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

      <div className="sticky bottom-0 space-y-2 border border-border/60 bg-card p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <ShoppingCart className="size-3.5" />
            {cartLines.length} item{cartLines.length === 1 ? "" : "s"}
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
              Download PDF & open WhatsApp
            </>
          )}
        </button>
        <p className="text-center text-[11px] text-muted-foreground">
          Downloads an order sheet, then opens WhatsApp with the supplier.
        </p>
      </div>
    </div>
  );
}

function SupplierContactSection({
  detail,
  areaLabel,
}: {
  detail: MarketplaceSupplierDetail;
  areaLabel: string;
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
    <section className="border border-border/55 bg-muted/5 px-3 py-3 sm:px-4">
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
      <a
        href={`tel:${phone.replace(/\s/g, "")}`}
        className="underline underline-offset-2 hover:text-foreground/80"
      >
        {phone}
      </a>
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
            className="block truncate text-sm font-medium hover:underline"
          >
            {product.name}
          </Link>
        ) : (
          <p className="truncate text-sm font-medium">{product.name}</p>
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
