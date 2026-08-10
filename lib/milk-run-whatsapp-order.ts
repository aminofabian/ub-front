import { joinProductNameParts } from "@/lib/catalog-display";
import { formatDisplayPrice } from "@/lib/public-storefront";
import type { PublicWebCart } from "@/lib/web-cart";

function lineQty(qty: number): number {
  const n = Number(qty);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 1000) / 1000);
}

/** Normalize a Kenya-friendly WhatsApp number to digits for wa.me. */
export function normalizeMilkRunWhatsApp(
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

/** Build a cart-level WhatsApp order URL for Milk Run checkout. */
export function buildMilkRunCartWhatsAppUrl(opts: {
  phone: string | null | undefined;
  storeName: string;
  cart: PublicWebCart;
}): string | null {
  const phone = normalizeMilkRunWhatsApp(opts.phone);
  if (!phone || opts.cart.lines.length === 0) return null;

  const store = opts.storeName.trim() || "the shop";
  const currency = opts.cart.currency;

  const lines = opts.cart.lines.map((line, index) => {
    const n = index + 1;
    const qty = lineQty(line.quantity);
    const name = joinProductNameParts(line.name, line.variantName);
    const unit =
      line.unitPrice != null
        ? formatDisplayPrice(currency, line.unitPrice)
        : null;
    const total =
      line.lineTotal != null
        ? formatDisplayPrice(currency, line.lineTotal)
        : null;
    if (unit && total) {
      return `${n}. ${qty} × ${name} — ${unit} each (${total})`;
    }
    return `${n}. ${qty} × ${name}`;
  });

  const subtotal =
    opts.cart.subtotal != null
      ? formatDisplayPrice(currency, opts.cart.subtotal)
      : null;

  const text = [
    `Hi ${store}, I'd like to place this order:`,
    "",
    ...lines,
    "",
    subtotal ? `Subtotal: ${subtotal}` : null,
    opts.cart.catalogBranchName
      ? `Branch: ${opts.cart.catalogBranchName}`
      : null,
    "",
    "Please confirm availability and how to pay / pick up. Thanks!",
  ]
    .filter((row): row is string => row != null)
    .join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
