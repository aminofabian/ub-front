import { APP_ROUTES } from "@/lib/config";

export type ShopListQuery = {
  q?: string;
  categoryId?: string;
  cursor?: string;
};

export function shopListPath(query: ShopListQuery): string {
  const p = new URLSearchParams();
  const q = query.q?.trim();
  const categoryId = query.categoryId?.trim();
  const cursor = query.cursor?.trim();
  if (q) {
    p.set("q", q);
  }
  if (categoryId) {
    p.set("categoryId", categoryId);
  }
  if (cursor) {
    p.set("cursor", cursor);
  }
  const qs = p.toString();
  return qs ? `${APP_ROUTES.shop}?${qs}` : APP_ROUTES.shop;
}

/** E.164 without + preferred (e.g. 2547…). When unset, PDP hides the WhatsApp CTA. */
export function whatsAppProductLink(productTitle: string): string | null {
  const raw = process.env.NEXT_PUBLIC_STOREFRONT_WHATSAPP?.replace(/\D/g, "") ?? "";
  if (!raw) {
    return null;
  }
  const text = encodeURIComponent(`Hi! I'm interested in: ${productTitle}`);
  return `https://wa.me/${raw}?text=${text}`;
}
