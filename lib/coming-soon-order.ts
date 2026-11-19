import { formatMoney } from "@/lib/money";
import { normalizeWhatsApp } from "@/lib/whatsapp-order";

const MAX_QTY = 99;
const MAX_LINES = 24;
const MAX_NAME = 120;
const MAX_ID = 80;
const URL_LIMIT = 1800;
const FULL_LIST = 15;
const SHORT_LIST = 8;

export type ComingSoonOrderLine = {
  id: string;
  name: string;
  priceLabel: string;
  unitAmount: number | null;
  quantity: number;
};

export type ComingSoonOrderDraft = {
  id: string;
  name: string;
  price: string;
};

type OrderTextOptions = {
  shopName: string;
  lines: readonly ComingSoonOrderLine[];
  currency?: string | null;
  paysWithMpesa: boolean;
  includePrices?: boolean;
  maxLines?: number;
};

export function parseShelfAmount(price: string): number | null {
  const match = price.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

export function addOrderLine(
  lines: ComingSoonOrderLine[],
  draft: ComingSoonOrderDraft,
): ComingSoonOrderLine[] {
  const id = draft.id.trim();
  const name = draft.name.trim();
  if (!id || !name) return lines;
  const existing = lines.find((line) => line.id === id);
  if (existing) return setOrderQuantity(lines, id, existing.quantity + 1);
  if (lines.length >= MAX_LINES) return lines;
  return [
    ...lines,
    {
      id: id.slice(0, MAX_ID),
      name: name.slice(0, MAX_NAME),
      priceLabel: draft.price.trim(),
      unitAmount: parseShelfAmount(draft.price),
      quantity: 1,
    },
  ];
}

export function setOrderQuantity(
  lines: ComingSoonOrderLine[],
  id: string,
  quantity: number,
): ComingSoonOrderLine[] {
  const qty = Math.round(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return lines.filter((line) => line.id !== id);
  }
  const next = Math.min(qty, MAX_QTY);
  const current = lines.find((line) => line.id === id);
  if (!current || current.quantity === next) return lines;
  return lines.map((line) => (line.id === id ? { ...line, quantity: next } : line));
}

export function orderItemCount(lines: readonly ComingSoonOrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function orderSummary(lines: readonly ComingSoonOrderLine[]): string {
  const last = lines[lines.length - 1];
  if (!last) return "";
  if (lines.length === 1) return `${last.quantity} × ${last.name}`;
  const rest = lines.length - 1;
  return `${last.name} and ${rest} more`;
}

export function lineAmount(line: ComingSoonOrderLine): number | null {
  if (line.unitAmount == null) return null;
  return Math.round(line.unitAmount * line.quantity * 100) / 100;
}

export function orderTotalAmount(lines: readonly ComingSoonOrderLine[]): number | null {
  let total = 0;
  for (const line of lines) {
    const amount = lineAmount(line);
    if (amount == null) return null;
    total += amount;
  }
  return lines.length > 0 ? total : null;
}

export function orderTotalLabel(
  lines: readonly ComingSoonOrderLine[],
  currency?: string | null,
): string | null {
  const total = orderTotalAmount(lines);
  return total == null ? null : formatMoney(total, currency);
}

export function buildComingSoonOrderText(opts: OrderTextOptions): string {
  const max = opts.maxLines ?? FULL_LIST;
  const visible = opts.lines.slice(0, max);
  const hidden = opts.lines.length - visible.length;
  const rows = visible.map((line, index) => formatOrderRow(line, index, opts));
  if (hidden > 0) rows.push(`…and ${hidden} more`);
  const total =
    opts.includePrices === false ? null : orderTotalLabel(opts.lines, opts.currency);
  const pay = opts.paysWithMpesa
    ? "I'll pay by M-Pesa. Please confirm stock."
    : "Please confirm stock and how to pay.";
  return [
    `Hi ${opts.shopName.trim() || "the shop"}, I'd like to order:`,
    "",
    ...rows,
    "",
    total ? `Total: ${total}` : null,
    pay,
  ]
    .filter((row): row is string => row != null)
    .join("\n");
}

export function buildComingSoonOrderUrl(
  opts: Omit<OrderTextOptions, "includePrices" | "maxLines"> & { contactHref: string | null },
): string | null {
  const digits = digitsFromHref(opts.contactHref);
  if (!digits || opts.lines.length === 0) return null;
  const attempts = [
    { includePrices: true, maxLines: FULL_LIST },
    { includePrices: false, maxLines: FULL_LIST },
    { includePrices: false, maxLines: SHORT_LIST },
  ];
  let url = "";
  for (const attempt of attempts) {
    const text = buildComingSoonOrderText({ ...opts, ...attempt });
    url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
    if (url.length <= URL_LIMIT) return url;
  }
  return url;
}

export function readStoredOrder(raw: string | null): ComingSoonOrderLine[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredLine).slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

function formatOrderRow(
  line: ComingSoonOrderLine,
  index: number,
  opts: OrderTextOptions,
): string {
  const base = `${index + 1}. ${line.quantity} × ${line.name}`;
  if (opts.includePrices === false) return base;
  const amount = lineAmount(line);
  const price = amount == null ? line.priceLabel : formatMoney(amount, opts.currency);
  return price ? `${base} — ${price}` : base;
}

function digitsFromHref(href: string | null): string | null {
  if (!href?.startsWith("http")) return null;
  try {
    const url = new URL(href);
    const host = url.hostname;
    if (host !== "wa.me" && !host.endsWith(".whatsapp.com")) return null;
    return normalizeWhatsApp(url.pathname);
  } catch {
    return null;
  }
}

function isStoredLine(value: unknown): value is ComingSoonOrderLine {
  if (!value || typeof value !== "object") return false;
  const line = value as ComingSoonOrderLine;
  const amountOk =
    line.unitAmount === null ||
    (typeof line.unitAmount === "number" && Number.isFinite(line.unitAmount) && line.unitAmount >= 0);
  return (
    typeof line.id === "string" &&
    line.id.length > 0 &&
    line.id.length <= MAX_ID &&
    typeof line.name === "string" &&
    line.name.trim().length > 0 &&
    typeof line.priceLabel === "string" &&
    amountOk &&
    Number.isInteger(line.quantity) &&
    line.quantity >= 1 &&
    line.quantity <= MAX_QTY
  );
}
