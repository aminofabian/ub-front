import { joinProductNameParts } from "@/lib/catalog-display";
import { formatDisplayPrice } from "@/lib/public-storefront";
import type { PublicWebCart } from "@/lib/web-cart";
import { APP_ROUTES } from "@/lib/config";

/**
 * Theme-agnostic WhatsApp order builder (scope D1/D9/D11).
 * Absorbs the old `milk-run-whatsapp-order.ts` and adds the order code,
 * tracking link, greeting, and hard URL-length capping (§9).
 */

const MAX_LINE_ITEMS = 15;
const TRUNCATED_LINE_ITEMS = 8;
const MAX_URL_CHARS = 1_800;

function lineQty(qty: number): number {
  const n = Number(qty);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 1000) / 1000);
}

/** Normalize a Kenya-friendly WhatsApp number to digits for wa.me. */
export function normalizeWhatsApp(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0") && digits.length >= 9) {
    digits = `254${digits.slice(1)}`;
  }
  if (digits.length < 9) return null;
  return digits;
}

/**
 * Clean local Kenya phone for storage/display: strips a stray country-code +
 * leading-zero combo (e.g. "+254 0714 282 874" → "0714 282 874").
 */
export function normalizeLocalPhone(
  phone: string | null | undefined,
): string {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("254") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(3); // +254 7XX... → 7XX... (with or without stray leading 0)
  }
  if (digits.length >= 9) {
    if (digits.startsWith("0")) {
      // already local
    } else if (digits.startsWith("7") || digits.startsWith("1")) {
      digits = `0${digits}`;
    }
    const local = digits.slice(0, 10);
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`.trim();
  }
  return phone?.trim() ?? "";
}

/**
 * Canonical short order code (mirrors the backend `WebOrderCodes`): last 8
 * hex chars of the compact order UUID, uppercased. Used when the checkout
 * response does not carry `orderCode`.
 */
export function cartOrderCode(orderId: string): string {
  const compact = (orderId ?? "").replace(/-/g, "");
  return compact.slice(-8).toUpperCase();
}

/**
 * Phase 5: tracking URL for the WhatsApp/SMS message. Carries the single-use
 * receipt token when present (`?t=`) so tapping the link verifies the order
 * without the phone-last-4 prompt and can prefill the sign-in sheet.
 */
export function buildOrderTrackingUrl(
  origin: string,
  orderCode: string,
  receiptToken?: string | null,
): string {
  const base = `${origin}${APP_ROUTES.shopOrderTrack(orderCode)}`;
  if (!receiptToken) {
    return base;
  }
  return `${base}?t=${encodeURIComponent(receiptToken)}`;
}

export type WhatsAppMessageOptions = {
  /** Merchant WhatsApp digits (already normalized or raw). */
  phone: string | null | undefined;
  storeName: string;
  cart: PublicWebCart;
  orderCode: string;
  /** Absolute tracking URL (uses the host the shopper is currently on). */
  trackingUrl: string;
  /** Merchant greeting, prepended on line 2 when set. */
  greeting?: string | null;
  customerName?: string;
  customerPhone?: string;
};

function lineRows(
  cart: PublicWebCart,
  includePrices: boolean,
  maxLines: number,
  trackingUrl: string,
): string[] {
  const visible = cart.lines.slice(0, maxLines);
  const rows = visible.map((line, index) => {
    const n = index + 1;
    const qty = lineQty(line.quantity);
    const name = joinProductNameParts(line.name, line.variantName);
    const unit =
      includePrices && line.unitPrice != null
        ? formatDisplayPrice(cart.currency, line.unitPrice)
        : null;
    return unit
      ? `${n}. ${qty} × ${name} — ${unit}`
      : `${n}. ${qty} × ${name}`;
  });
  const hidden = cart.lines.length - visible.length;
  if (hidden > 0) {
    rows.push(`…and ${hidden} more item${hidden === 1 ? "" : "s"} — full list: ${trackingUrl}`);
  }
  return rows;
}

export function buildCartWhatsAppText(opts: {
  storeName: string;
  cart: PublicWebCart;
  orderCode: string;
  trackingUrl: string;
  greeting?: string | null;
  customerName?: string;
  customerPhone?: string;
  includePrices?: boolean;
  maxLines?: number;
  includeGreeting?: boolean;
}): string {
  const currency = opts.cart.currency;
  const subtotal =
    opts.cart.subtotal != null
      ? formatDisplayPrice(currency, opts.cart.subtotal)
      : null;
  const maxLines = opts.maxLines ?? MAX_LINE_ITEMS;
  const rows = lineRows(opts.cart, opts.includePrices ?? true, maxLines, opts.trackingUrl);

  const greeting =
    (opts.includeGreeting ?? true) ? (opts.greeting ?? "").trim() : "";

  return [
    `Hi ${opts.storeName.trim() || "the shop"}, I'd like to place this order:`,
    greeting ? greeting : "",
    "",
    ...rows,
    "",
    subtotal ? `Subtotal: ${subtotal}` : null,
    opts.cart.catalogBranchName
      ? `Branch: ${opts.cart.catalogBranchName}`
      : null,
    `Order no: ${opts.orderCode}`,
    opts.customerName?.trim() ? `Name: ${opts.customerName.trim()}` : null,
    opts.customerPhone?.trim() ? `Phone: ${opts.customerPhone.trim()}` : null,
    "",
    `Track it: ${opts.trackingUrl}`,
    "Please confirm availability and how to pay. Thanks!",
  ]
    .filter((row): row is string => row != null)
    .join("\n");
}

/**
 * Build a `wa.me` URL for the order. Caps the encoded URL at 1,800 characters
 * (Android WebView ceiling, §14), degrading in order: drop per-unit prices →
 * truncate item list → drop the greeting.
 */
export function buildCartWhatsAppUrl(opts: WhatsAppMessageOptions): string | null {
  const digits = normalizeWhatsApp(opts.phone);
  if (!digits || opts.cart.lines.length === 0) return null;

  const encode = (text: string) => `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;

  let text = buildCartWhatsAppText({
    storeName: opts.storeName,
    cart: opts.cart,
    orderCode: opts.orderCode,
    trackingUrl: opts.trackingUrl,
    greeting: opts.greeting,
    customerName: opts.customerName,
    customerPhone: opts.customerPhone,
  });
  let url = encode(text);
  if (url.length <= MAX_URL_CHARS) return url;

  text = buildCartWhatsAppText({
    storeName: opts.storeName,
    cart: opts.cart,
    orderCode: opts.orderCode,
    trackingUrl: opts.trackingUrl,
    greeting: opts.greeting,
    customerName: opts.customerName,
    customerPhone: opts.customerPhone,
    includePrices: false,
  });
  url = encode(text);
  if (url.length <= MAX_URL_CHARS) return url;

  text = buildCartWhatsAppText({
    storeName: opts.storeName,
    cart: opts.cart,
    orderCode: opts.orderCode,
    trackingUrl: opts.trackingUrl,
    greeting: opts.greeting,
    customerName: opts.customerName,
    customerPhone: opts.customerPhone,
    includePrices: false,
    maxLines: TRUNCATED_LINE_ITEMS,
  });
  url = encode(text);
  if (url.length <= MAX_URL_CHARS) return url;

  text = buildCartWhatsAppText({
    storeName: opts.storeName,
    cart: opts.cart,
    orderCode: opts.orderCode,
    trackingUrl: opts.trackingUrl,
    greeting: opts.greeting,
    customerName: opts.customerName,
    customerPhone: opts.customerPhone,
    includePrices: false,
    maxLines: TRUNCATED_LINE_ITEMS,
    includeGreeting: false,
  });
  return encode(text);
}

/** Pipe-delimited checkout notes for a WhatsApp order (scope D5, §10). */
export function buildWhatsAppCheckoutNotes(opts: {
  street?: string;
  ward?: string;
  whatsAppNumber?: string;
  deliveryNotes?: string;
}): string {
  const segments = [
    "Channel: WhatsApp",
    "Payment: Arrange on WhatsApp",
    opts.street?.trim() ? `Street: ${opts.street.trim()}` : "",
    opts.ward?.trim() ? `Ward: ${opts.ward.trim()}` : "",
    opts.whatsAppNumber?.trim()
      ? `WhatsApp: ${opts.whatsAppNumber.trim()}`
      : "",
    opts.deliveryNotes?.trim() ? `Notes: ${opts.deliveryNotes.trim()}` : "",
  ];
  return segments.filter(Boolean).join(" | ");
}

/** Lightweight analytics events (scope §21) — mirrors the beacon's CustomEvent pattern. */
export function trackWhatsAppCheckoutEvent(
  name: string,
  data?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  const detail: Record<string, unknown> = {
    event: name,
    path: window.location.pathname,
    ...data,
  };
  window.dispatchEvent(new CustomEvent("kiosk:storefront-event", { detail }));
  const w = window as Window & { dataLayer?: Record<string, unknown>[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(detail);
}
