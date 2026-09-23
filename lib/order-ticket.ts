import { APP_ROUTES } from "@/lib/config";
import type { SupplierItemLinkRecord } from "@/lib/api";
import type { OrderCartPackMeta } from "@/lib/order-cart-storage";
import {
  encodeMarketplaceOrderQuery,
  parseMarketplaceOrderQuery,
  type MarketplaceOrderQueryLine,
} from "@/lib/marketplace-url";

export type OrderTicketLine = MarketplaceOrderQueryLine;

export type OrderTicketMatch = {
  cart: Record<string, number>;
  packs: OrderCartPackMeta;
  /** Unit estimates derived from ticket `lineTotal` / qty when present. */
  prices: Record<string, number>;
  matched: number;
  missed: string[];
};

export function encodeOrderTicket(lines: OrderTicketLine[]): string {
  return encodeMarketplaceOrderQuery(lines);
}

export function parseOrderTicket(
  raw: string | null | undefined,
): OrderTicketLine[] {
  return parseMarketplaceOrderQuery(raw);
}

/** Pull a ticket from `ticket=`, `o=`, or a full pasted marketplace/order URL. */
export function parseOrderTicketFromInput(
  raw: string | null | undefined,
): OrderTicketLine[] {
  const text = raw?.trim();
  if (!text) return [];

  try {
    if (text.includes("://") || text.startsWith("/")) {
      const url = text.startsWith("/")
        ? new URL(text, "https://kiosk.local")
        : new URL(text);
      const ticket =
        url.searchParams.get("ticket") ?? url.searchParams.get("o");
      return parseOrderTicket(ticket);
    }
  } catch {
    // Fall through and treat the whole string as an encoded ticket.
  }

  return parseOrderTicket(text);
}

/** Order-total snap encoded in share URLs (`r=`). */
export type OrderTicketRoundParam = "2" | "1" | "0" | "10";

export function tenantOrderTicketPath(opts: {
  ticket: string;
  supplierId?: string | null;
  marketplaceSupplierId?: string | null;
  /** @deprecated Prefer `round` — kept for older callers. */
  roundTo10?: boolean;
  /** Snap precision: 2dp / 1dp / whole / nearest 10. */
  round?: OrderTicketRoundParam | null;
}): string {
  const params = new URLSearchParams();
  if (opts.ticket.trim()) params.set("ticket", opts.ticket.trim());
  if (opts.supplierId?.trim()) params.set("sid", opts.supplierId.trim());
  if (opts.marketplaceSupplierId?.trim()) {
    params.set("msid", opts.marketplaceSupplierId.trim());
  }
  const round = opts.round ?? (opts.roundTo10 ? "10" : null);
  if (round) params.set("r", round);
  const qs = params.toString();
  return qs ? `${APP_ROUTES.order}?${qs}` : APP_ROUTES.order;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Match ticket keys (sku / barcode / marketplace slug / name fragment)
 * onto tenant supplier item links.
 */
export function matchOrderTicketToLinks(
  lines: OrderTicketLine[],
  links: SupplierItemLinkRecord[],
): OrderTicketMatch {
  const cart: Record<string, number> = {};
  const packs: OrderCartPackMeta = {};
  const prices: Record<string, number> = {};
  const missed: string[] = [];
  let matched = 0;

  for (const line of lines) {
    const key = line.slug.trim();
    if (!key || line.qty <= 0) continue;
    const needle = normalizeKey(key);
    const hit =
      links.find((l) => normalizeKey(l.sku || "") === needle) ??
      links.find((l) => normalizeKey(l.supplierSku || "") === needle) ??
      links.find((l) => normalizeKey(l.barcode || "") === needle) ??
      links.find((l) => normalizeKey(l.itemId) === needle) ??
      links.find((l) => {
        const slugish = normalizeKey(l.itemName || "").replace(/[^a-z0-9]+/g, "-");
        return slugish === needle || slugish.startsWith(`${needle}-`);
      }) ??
      links.find((l) => normalizeKey(l.itemName || "").includes(needle));

    if (!hit) {
      missed.push(key);
      continue;
    }
    cart[hit.itemId] = (cart[hit.itemId] ?? 0) + line.qty;
    matched += 1;

    if (
      line.lineTotal != null &&
      Number.isFinite(line.lineTotal) &&
      line.lineTotal > 0 &&
      line.qty > 0
    ) {
      const unit = line.lineTotal / line.qty;
      if (Number.isFinite(unit) && unit > 0) {
        prices[hit.itemId] = Math.round(unit * 100) / 100;
      }
    }

    const packOptionId = line.packOptionId?.trim();
    if (packOptionId) {
      const option = hit.packs?.find((p) => p.id === packOptionId);
      if (option && option.unitsPerPack > 1) {
        packs[hit.itemId] = {
          packOptionId: option.id,
          size: option.unitsPerPack,
          unit: option.packUnit || "pack",
          price: option.unitPrice,
        };
      }
    }
  }

  return { cart, packs, prices, matched, missed };
}

/** Build a shareable order ticket from a posted supply / GRN invoice. */
export function buildSupplyInvoiceReorderTicket(
  detail: {
    lines: Array<{
      itemId: string | null;
      description?: string | null;
      qty: number | string;
      usableQty: number | string;
      unitCost?: number | string;
      lineTotal?: number | string;
    }>;
  },
  opts?: { includeCosts?: boolean },
): {
  ticket: string;
  lines: OrderTicketLine[];
  reusable: number;
  skipped: number;
  estimatedTotal: number;
  preview: Array<{ name: string; qty: number; lineTotal: number | null }>;
} {
  const includeCosts = opts?.includeCosts !== false;
  const ticketLines: OrderTicketLine[] = [];
  const preview: Array<{
    name: string;
    qty: number;
    lineTotal: number | null;
  }> = [];
  let reusable = 0;
  let skipped = 0;
  let estimatedTotal = 0;

  for (const line of detail.lines) {
    const itemId = line.itemId?.trim() ?? "";
    const usable = Number(line.usableQty);
    const qtyRaw = Number(line.qty);
    const qty =
      Number.isFinite(usable) && usable > 0
        ? usable
        : Number.isFinite(qtyRaw) && qtyRaw > 0
          ? qtyRaw
          : 0;
    if (!itemId || qty <= 0) {
      skipped += 1;
      continue;
    }

    const roundedQty = Math.max(1, Math.round(qty));
    const unitCost = Number(line.unitCost);
    const lineTotalRaw = Number(line.lineTotal);
    let lineTotal: number | undefined;
    if (includeCosts) {
      if (Number.isFinite(lineTotalRaw) && lineTotalRaw > 0) {
        lineTotal = lineTotalRaw;
      } else if (Number.isFinite(unitCost) && unitCost > 0) {
        lineTotal = unitCost * roundedQty;
      }
    }
    if (lineTotal != null) estimatedTotal += lineTotal;

    ticketLines.push({
      slug: itemId,
      qty: roundedQty,
      lineTotal,
    });
    reusable += 1;
    if (preview.length < 8) {
      preview.push({
        name: line.description?.trim() || "Item",
        qty: roundedQty,
        lineTotal: lineTotal ?? null,
      });
    }
  }

  return {
    ticket: encodeOrderTicket(ticketLines),
    lines: ticketLines,
    reusable,
    skipped,
    estimatedTotal,
    preview,
  };
}

/** Encode a tenant cart for sharing — prefer SKU, then barcode, then item id. */
export function encodeTenantCartTicket(
  lines: {
    link: SupplierItemLinkRecord;
    qty: number;
    packOptionId?: string | null;
  }[],
): string {
  return encodeOrderTicket(
    lines.flatMap(({ link, qty, packOptionId }) => {
      const key =
        link.sku?.trim() ||
        link.barcode?.trim() ||
        link.supplierSku?.trim() ||
        link.itemId;
      if (!key || qty <= 0) return [];
      return [
        {
          slug: key,
          qty,
          packOptionId: packOptionId?.trim() || undefined,
        },
      ];
    }),
  );
}
