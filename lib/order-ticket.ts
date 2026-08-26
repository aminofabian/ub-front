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

export function tenantOrderTicketPath(opts: {
  ticket: string;
  supplierId?: string | null;
  marketplaceSupplierId?: string | null;
  roundTo10?: boolean;
}): string {
  const params = new URLSearchParams();
  if (opts.ticket.trim()) params.set("ticket", opts.ticket.trim());
  if (opts.supplierId?.trim()) params.set("sid", opts.supplierId.trim());
  if (opts.marketplaceSupplierId?.trim()) {
    params.set("msid", opts.marketplaceSupplierId.trim());
  }
  if (opts.roundTo10) params.set("r", "10");
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

  return { cart, packs, matched, missed };
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
