import { cartOrderCode, normalizeWhatsApp } from "@/lib/whatsapp-order";

export const WEB_ORDER_PAID = "paid";
export const WEB_ORDER_CANCELLED = "cancelled";
export const WEB_ORDER_PAYMENT_FAILED = "payment_failed";

export const FULFILLMENT_AWAITING = "awaiting_confirmation";
export const FULFILLMENT_CONFIRMED = "confirmed";
export const FULFILLMENT_DISPATCHED = "dispatched";
export const FULFILLMENT_COMPLETED = "completed";

export const SHIPMENT_DOORSTEP = "doorstep";
export const WHATSAPP_CHANNEL = "WHATSAPP";
const WHATSAPP_NOTE_MARKER = "channel: whatsapp";

export type OrderTone = "amber" | "emerald" | "muted" | "blue" | "rose";

export type OrderStatusLine = {
  label: string;
  tone: OrderTone;
};

export type FulfillmentStep = {
  status: "confirmed" | "dispatched" | "completed";
  label: string;
  command: string;
};

type CodedOrder = {
  id: string;
  orderCode?: string | null;
};

function compactCode(value: string | null | undefined): string {
  return (value ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function shortId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length <= 8) return trimmed.toUpperCase();
  return trimmed.slice(-8).toUpperCase();
}

export function orderCodeOf(order: CodedOrder): string {
  const code = order.orderCode?.trim();
  return code ? code.toUpperCase() : shortId(order.id);
}

export function orderMatchesCode(order: CodedOrder, code: string): boolean {
  const needle = compactCode(code);
  if (!needle) return false;
  return [order.orderCode, cartOrderCode(order.id), shortId(order.id)].some(
    (candidate) => compactCode(candidate) === needle,
  );
}

export function isWhatsAppWebOrder(order: {
  channel?: string | null;
  notes?: string | null;
}): boolean {
  if ((order.channel ?? "").toUpperCase() === WHATSAPP_CHANNEL) return true;
  return (order.notes ?? "").toLowerCase().includes(WHATSAPP_NOTE_MARKER);
}

export function isDoorstepOrder(order: {
  shipment?: { mode?: string | null } | null;
}): boolean {
  return (order.shipment?.mode ?? "").toLowerCase() === SHIPMENT_DOORSTEP;
}

export function orderStatusLine(order: {
  status?: string | null;
  fulfillmentStatus?: string | null;
}): OrderStatusLine {
  const status = (order.status ?? "").toLowerCase();
  if (status === WEB_ORDER_CANCELLED) {
    return { label: "Cancelled", tone: "muted" };
  }
  if (status === WEB_ORDER_PAYMENT_FAILED) {
    return { label: "Payment failed", tone: "rose" };
  }
  if (status !== WEB_ORDER_PAID) {
    return { label: "Unpaid", tone: "amber" };
  }
  const fulfillment = (order.fulfillmentStatus ?? "").trim().toLowerCase();
  if (fulfillment === FULFILLMENT_CONFIRMED) {
    return { label: "Packing", tone: "blue" };
  }
  if (fulfillment === FULFILLMENT_DISPATCHED) {
    return { label: "Handed off", tone: "blue" };
  }
  if (fulfillment === FULFILLMENT_COMPLETED) {
    return { label: "Done", tone: "emerald" };
  }
  return { label: "To confirm", tone: "amber" };
}

export function nextFulfillmentStep(input: {
  status: string;
  fulfillmentStatus?: string | null;
  code: string;
  doorstep: boolean;
}): FulfillmentStep | null {
  if (input.status !== WEB_ORDER_PAID) return null;
  const fulfillment =
    (input.fulfillmentStatus ?? "").trim().toLowerCase() || FULFILLMENT_AWAITING;
  const code = input.code;
  if (fulfillment === FULFILLMENT_AWAITING) {
    return { status: "confirmed", label: "Confirm order", command: `CONFIRM ${code}` };
  }
  if (fulfillment === FULFILLMENT_CONFIRMED) {
    return input.doorstep
      ? { status: "dispatched", label: "Out for delivery", command: `DISPATCH ${code}` }
      : { status: "dispatched", label: "Ready for pickup", command: `READY ${code}` };
  }
  if (fulfillment === FULFILLMENT_DISPATCHED) {
    return input.doorstep
      ? { status: "completed", label: "Confirm delivery", command: `COMPLETE ${code}` }
      : { status: "completed", label: "Complete pickup", command: `COMPLETE ${code}` };
  }
  return null;
}

export function whatsAppChatHref(
  phone: string | null | undefined,
  name: string | null | undefined,
  code: string,
): string {
  const digits = normalizeWhatsApp(phone);
  if (!digits) return "";
  const who = (name ?? "").trim().split(/\s+/)[0] || "there";
  const text = `Hi ${who}, this is about order #${code}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
